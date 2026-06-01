import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';
import { addStreamToMediaMTX, getMediaMTXHLSUrl } from '@/app/lib/services/mediamtxClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: cameraId } = await params;

    if (!cameraId) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: { id: true, name: true, status: true, worksiteId: true, streamUrl: true, metadata: true },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin =
      userRole === 'SUPER_ADMIN' || userRole === 'COMPANY_ADMIN' || userRole === 'ADMIN';

    if (!isGlobalAdmin) {
      const userCompany = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true },
      });

      if (userCompany?.companyId) {
        const worksite = await prisma.worksite.findFirst({
          where: { id: camera.worksiteId, companyId: userCompany.companyId },
          select: { id: true },
        });
        if (!worksite) {
          return NextResponse.json({ error: 'Access denied to camera' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'Access denied to camera' }, { status: 403 });
      }
    }

    // Pi push cameras have no RTSP source URL — they push to MediaMTX themselves.
    // The publisher path is registered at camera creation; just return the HLS URL.
    const meta = camera.metadata as Record<string, unknown> | null;
    const isPushCamera = meta?.ingestMode === 'push';

    if (isPushCamera) {
      return NextResponse.json({
        cameraId: camera.id,
        streamType: 'hls',
        hlsUrl: getMediaMTXHLSUrl(camera.id),
        pushMode: true,
        status: camera.status,
      });
    }

    const rtspUrl = camera.streamUrl?.trim();
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        { error: 'No RTSP stream configured', cameraId: camera.id, hint: 'Add an RTSP URL for this camera.' },
        { status: 503 }
      );
    }

    // MediaMTX internal URL (server-side, for registering the stream)
    const mediamtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://localhost:9000';
    const added = await addStreamToMediaMTX(mediamtxApiUrl, camera.id, rtspUrl);
    if (!added) {
      return NextResponse.json(
        { error: 'Stream gateway unavailable', hint: 'Is MediaMTX running?' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      cameraId: camera.id,
      streamType: 'hls',
      hlsUrl: getMediaMTXHLSUrl(camera.id),
    });

  } catch (error: any) {
    console.error('[API /cameras/[id]/stream] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to resolve camera stream' }, { status: 500 });
  }
}

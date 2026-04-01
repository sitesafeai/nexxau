/**
 * GET /api/cameras/:id/stream
 *
 * Returns stream URLs for camera playback via go2rtc.
 * Replaces Janus-based streaming with go2rtc WebRTC/HLS.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeRole } from '@/lib/roles';
import { addStreamToGo2RTC } from '@/lib/services/go2rtcClient';

/**
 * GET /api/cameras/:id/stream
 * 
 * Returns stream metadata for a camera via go2rtc.
 * 
 * Response format:
 * {
 *   "cameraId": "...",
 *   "streamType": "go2rtc_webrtc" | "go2rtc_hls",
 *   "webrtcUrl": "http://go2rtc:1984/api/webrtc?src=cameraId",
 *   "hlsUrl": "http://go2rtc:1984/api/stream.m3u8?src=cameraId"
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: cameraId } = await params;
    
    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch camera from database
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: {
        id: true,
        name: true,
        status: true,
        worksiteId: true,
        streamUrl: true,
      },
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Authorization: Check if user has access to camera's worksite
    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin = 
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'ADMIN';

    if (!isGlobalAdmin) {
      // For non-admins, verify worksite access via company
      const userCompany = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true },
      });

      if (userCompany?.companyId) {
        const worksite = await prisma.worksite.findFirst({
          where: {
            id: camera.worksiteId,
            companyId: userCompany.companyId,
          },
          select: { id: true },
        });

        if (!worksite) {
          return NextResponse.json(
            { error: 'Access denied to camera' },
            { status: 403 }
          );
        }
      } else {
        // User has no company - deny access
        return NextResponse.json(
          { error: 'Access denied to camera' },
          { status: 403 }
        );
      }
    }

    const go2rtcServerUrl = process.env.GO2RTC_URL || 'http://localhost:1984';
    const go2rtcBrowserUrl = process.env.NEXT_PUBLIC_GO2RTC_URL || 'http://localhost:1984';

    const rtspUrl = camera.streamUrl?.trim();
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        { error: 'No RTSP stream configured', cameraId: camera.id, hint: 'Add an RTSP URL for this camera.' },
        { status: 503 }
      );
    }

    const added = await addStreamToGo2RTC(go2rtcServerUrl, camera.id, rtspUrl);
    if (!added) {
      return NextResponse.json(
        { error: 'Stream gateway unavailable', cameraId: camera.id, hint: 'Is go2rtc running? ./start-nexxau.sh' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      cameraId: camera.id,
      streamType: 'go2rtc_webrtc',
      webrtcUrl: `${go2rtcBrowserUrl}/api/webrtc?src=${camera.id}`,
      hlsUrl: `${go2rtcBrowserUrl}/api/stream.m3u8?src=${camera.id}`,
    });
    
  } catch (error: any) {
    console.error('[API /cameras/[id]/stream] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve camera stream' },
      { status: 500 }
    );
  }
}

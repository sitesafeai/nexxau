import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

const SAFE_HLS_PATH_PART = /^[A-Za-z0-9._-]+$/;

async function getAuthorizedCameraForStream(streamKey: string, session: any) {
  const camera = await prisma.camera.findFirst({
    where: {
      OR: [{ id: streamKey }, { mediamtxPath: streamKey }],
    },
    select: {
      id: true,
      worksiteId: true,
      worksite: {
        select: {
          companyId: true,
          worksiteUsers: {
            where: { userId: session.user.id },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!camera) return null;

  const role = normalizeRole(session.user.role);
  if (role === 'SUPER_ADMIN') return camera;
  if (session.user.companyId && camera.worksite?.companyId === session.user.companyId) return camera;
  if (camera.worksite?.worksiteUsers?.length) return camera;

  return false;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: 'Missing HLS path' }, { status: 400 });
    }
    if (path.some(part => !SAFE_HLS_PATH_PART.test(part))) {
      return NextResponse.json({ error: 'Invalid HLS path' }, { status: 400 });
    }

    const streamKey = path[0];
    const authorizedCamera = await getAuthorizedCameraForStream(streamKey, session);
    if (authorizedCamera === null) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }
    if (authorizedCamera === false) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const upstreamOrigin = (process.env.MEDIAMTX_HLS_ORIGIN || 'http://localhost:8888').replace(/\/$/, '');
    const user = process.env.MEDIAMTX_API_USERNAME || 'admin';
    const pass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
    const encoded = Buffer.from(`${user}:${pass}`).toString('base64');

    const upstreamPath = path.join('/');
    const upstreamUrl = `${upstreamOrigin}/${upstreamPath}${request.nextUrl.search}`;

    const upstream = await fetch(upstreamUrl, {
      headers: {
        Authorization: `Basic ${encoded}`,
      },
      cache: 'no-store',
    });

    const passthroughHeaders = new Headers();
    const contentType = upstream.headers.get('content-type');
    if (contentType) passthroughHeaders.set('Content-Type', contentType);
    passthroughHeaders.set('Cache-Control', 'no-store, must-revalidate');

    if (!upstream.ok) {
      return new NextResponse(null, {
        status: upstream.status,
        headers: passthroughHeaders,
      });
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: passthroughHeaders,
    });
  } catch (error) {
    console.error('[api/hls proxy] upstream request failed:', error);
    return NextResponse.json({ error: 'Failed to proxy HLS request' }, { status: 502 });
  }
}

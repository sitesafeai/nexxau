import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { authorizeWorksiteAccess } from '@/app/lib/access-control';
import { getCachedSession } from '@/app/lib/session-cache';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const session = await getCachedSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: 'Missing HLS path' }, { status: 400 });
    }

    const streamName = path[0]?.trim();
    if (!streamName) {
      return NextResponse.json({ error: 'Missing HLS stream' }, { status: 400 });
    }

    const camera = await prisma.camera.findFirst({
      where: {
        OR: [
          { id: streamName },
          { mediamtxPath: streamName },
        ],
      },
      select: { id: true, worksiteId: true },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const access = await authorizeWorksiteAccess(session, camera.worksiteId);
    if (!access.allowed) {
      return NextResponse.json({ error: access.error }, { status: access.status });
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

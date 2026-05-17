import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { enforceWorksiteAccess } from '@/app/lib/worksite-access';

function getCandidateStreamNames(pathSegments: string[]): string[] {
  const candidates = new Set<string>();
  const firstSegment = pathSegments[0];
  if (firstSegment) {
    candidates.add(firstSegment);
  }

  const lastSegment = pathSegments[pathSegments.length - 1] || '';
  const lastSegmentLooksLikeHlsAsset = /\.(m3u8|m4s|mp4|ts|aac|vtt|jpg|jpeg|png)$/i.test(lastSegment);
  if (lastSegmentLooksLikeHlsAsset && pathSegments.length > 1) {
    candidates.add(pathSegments.slice(0, -1).join('/'));
  }

  return [...candidates].filter(Boolean);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: 'Missing HLS path' }, { status: 400 });
    }

    const streamNames = getCandidateStreamNames(path);
    const camera = await prisma.camera.findFirst({
      where: {
        OR: streamNames.flatMap((streamName) => [
          { id: streamName },
          { mediamtxPath: streamName },
        ]),
      },
      select: {
        id: true,
        worksiteId: true,
      },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const accessDenied = await enforceWorksiteAccess(request, camera.worksiteId);
    if (accessDenied) {
      return accessDenied;
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

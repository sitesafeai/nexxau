import { NextRequest, NextResponse } from 'next/server';
import { getCachedSession } from '@/app/lib/session-cache';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

const HLS_FILE_PATTERN = /^(index\.m3u8|[A-Za-z0-9_-]+\.(?:m3u8|ts|m4s|mp4|aac))$/;

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path } = await params;
    if (!path?.length) {
      return NextResponse.json({ error: 'Missing HLS path' }, { status: 400 });
    }

    const [streamId, ...fileParts] = path;
    if (
      !streamId ||
      fileParts.length === 0 ||
      path.some(segment => segment === '..' || segment.includes('/') || segment.includes('\\')) ||
      !fileParts.every(segment => HLS_FILE_PATTERN.test(segment))
    ) {
      return NextResponse.json({ error: 'Invalid HLS path' }, { status: 400 });
    }

    const session = await getCachedSession(request);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const camera = await prisma.camera.findUnique({
      where: { id: streamId },
      select: {
        id: true,
        worksite: {
          select: {
            companyId: true,
            worksiteUsers: {
              where: { userId: session.user.id },
              select: { userId: true },
            },
          },
        },
      },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Stream not found' }, { status: 404 });
    }

    const userRole = normalizeRole(session.user.role);
    const hasStreamAccess =
      userRole === 'SUPER_ADMIN' ||
      (Boolean(session.user.companyId) && session.user.companyId === camera.worksite.companyId) ||
      camera.worksite.worksiteUsers.length > 0;

    if (!hasStreamAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const upstreamOrigin = (process.env.MEDIAMTX_HLS_ORIGIN || 'http://localhost:8888').replace(/\/$/, '');
    const user = process.env.MEDIAMTX_API_USERNAME || 'admin';
    const pass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
    const encoded = Buffer.from(`${user}:${pass}`).toString('base64');

    const upstreamPath = path.map(segment => encodeURIComponent(segment)).join('/');
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

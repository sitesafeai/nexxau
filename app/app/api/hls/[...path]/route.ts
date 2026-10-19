import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

async function canAccessHlsPath(streamId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { allowed: false, status: 401, error: 'Unauthorized' };
  }

  const camera = await prisma.camera.findFirst({
    where: {
      OR: [
        { id: streamId },
        { mediamtxPath: streamId },
      ],
    },
    select: {
      worksiteId: true,
      worksite: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!camera) {
    return { allowed: false, status: 404, error: 'Camera not found' };
  }

  const role = normalizeRole(session.user.role);
  if (role === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  const companyId = session.user.companyId;
  if ((role === 'COMPANY_ADMIN' || role === 'ADMIN') && companyId === camera.worksite.companyId) {
    return { allowed: true };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      companyId: true,
      worksiteAccess: {
        where: { worksiteId: camera.worksiteId },
        select: { id: true },
      },
    },
  });

  if (user?.worksiteAccess?.length) {
    return { allowed: true };
  }

  if (user?.companyId && user.companyId === camera.worksite.companyId) {
    return { allowed: true };
  }

  return { allowed: false, status: 403, error: 'Forbidden' };
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

    const streamId = path[0];
    const access = await canAccessHlsPath(streamId);
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

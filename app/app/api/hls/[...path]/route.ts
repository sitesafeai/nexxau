import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

async function canAccessCameraStream(
  sessionUser: {
    id?: string;
    role?: string | null;
    companyId?: string;
  },
  camera: {
    worksiteId: string | null;
    worksite: { companyId: string | null } | null;
  }
): Promise<boolean> {
  const role = normalizeRole(sessionUser.role);
  if (role === 'SUPER_ADMIN') {
    return true;
  }

  if (!sessionUser.id || !camera.worksiteId) {
    return false;
  }

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      companyId: true,
      worksiteAccess: {
        where: { worksiteId: camera.worksiteId },
        select: { worksiteId: true },
      },
    },
  });

  const companyId = sessionUser.companyId || user?.companyId;
  if (companyId && camera.worksite?.companyId === companyId) {
    return true;
  }

  return Boolean(user?.worksiteAccess.length);
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

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const streamPath = path[0];
    const camera = await prisma.camera.findFirst({
      where: {
        OR: [
          { id: streamPath },
          { mediamtxPath: streamPath },
        ],
      },
      select: {
        id: true,
        worksiteId: true,
        worksite: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera stream not found' }, { status: 404 });
    }

    const hasAccess = await canAccessCameraStream(session.user, camera);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied to camera stream' }, { status: 403 });
    }

    const upstreamOrigin = (process.env.MEDIAMTX_HLS_ORIGIN || 'http://localhost:8888').replace(/\/$/, '');
    const user = process.env.MEDIAMTX_API_USERNAME || 'admin';
    const pass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
    const encoded = Buffer.from(`${user}:${pass}`).toString('base64');

    const upstreamPath = path.map((segment) => encodeURIComponent(segment)).join('/');
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

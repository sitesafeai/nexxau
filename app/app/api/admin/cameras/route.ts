import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export const runtime = 'nodejs';

function isSuperAdminRole(role: string | null | undefined) {
  const r = (role || '').toUpperCase();
  return r === 'SUPER_ADMIN' || r === 'SUPERADMIN';
}

/**
 * GET /api/admin/cameras
 * Super-admin list of all cameras with optional filters.
 *
 * Query:
 *  - companyId: limit to cameras whose worksite belongs to this company
 *  - worksiteId: limit to this worksite (takes precedence over companyId when both sent)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { role: true, email: true },
    });

    if (!user || !isSuperAdminRole(user.role)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden - Super Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const worksiteId = searchParams.get('worksiteId') || undefined;

    const where: Record<string, unknown> = {};
    if (worksiteId) {
      where.worksiteId = worksiteId;
    } else if (companyId) {
      where.worksite = { companyId };
    }

    const rows = await prisma.camera.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        type: true,
        streamUrl: true,
        hlsUrl: true,
        mediamtxPath: true,
        metadata: true,
        ipAddress: true,
        port: true,
        username: true,
        worksiteId: true,
        createdAt: true,
        updatedAt: true,
        worksite: {
          select: {
            id: true,
            name: true,
            location: true,
            status: true,
            company: {
              select: {
                id: true,
                name: true,
                companyUsername: true,
              },
            },
          },
        },
        _count: {
          select: { trainingImages: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const data = rows.map((c) => {
      const meta = (c.metadata || {}) as Record<string, unknown>;
      const lastHeartbeat =
        typeof meta.lastHeartbeat === 'string' ? meta.lastHeartbeat : null;
      const statusLower = (c.status || '').toLowerCase();
      const online =
        statusLower === 'online' ||
        statusLower === 'active' ||
        (lastHeartbeat
          ? new Date(lastHeartbeat).getTime() > Date.now() - 5 * 60 * 1000
          : false);

      return {
        id: c.id,
        name: c.name,
        status: c.status,
        type: c.type,
        streamUrl: c.streamUrl,
        hlsUrl: c.hlsUrl,
        mediamtxPath: c.mediamtxPath,
        metadata: c.metadata as Record<string, unknown> | null,
        ipAddress: c.ipAddress,
        port: c.port,
        username: c.username,
        worksiteId: c.worksiteId,
        worksite: c.worksite
          ? {
              id: c.worksite.id,
              name: c.worksite.name,
              location: c.worksite.location,
              status: c.worksite.status,
              company: c.worksite.company
                ? {
                    id: c.worksite.company.id,
                    name: c.worksite.company.name,
                    slug: c.worksite.company.companyUsername,
                  }
                : null,
            }
          : null,
        lastHeartbeat,
        online,
        trainingImageCount: c._count.trainingImages,
        lastUpdated: c.updatedAt.toISOString(),
        createdAt: c.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][cameras] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load cameras', details: message },
      { status: 500 }
    );
  }
}

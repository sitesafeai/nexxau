import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

type DiagnosticsEntry = {
  scope: string;
  message: string;
};

async function safeQuery<T>(
  scope: string,
  fn: () => Promise<T>,
  fallback: T,
  diagnostics: DiagnosticsEntry[]
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const message =
      error?.message ||
      error?.meta?.cause ||
      error?.code ||
      'Unknown query error';
    console.warn(`[admin][cameras][${scope}]`, message);
    diagnostics.push({
      scope,
      message,
    });
    return fallback;
  }
}

/**
 * GET /api/admin/cameras
 * Query params:
 *  - companyId (optional)
 *  - worksiteId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const worksiteId = searchParams.get('worksiteId') || undefined;

    const where: any = {};

    if (worksiteId) {
      where.worksiteId = worksiteId;
    } else if (companyId) {
      where.worksite = {
        companyId,
      };
    }

    const diagnostics: DiagnosticsEntry[] = [];

    const cameras = await safeQuery(
      'camera.findMany',
      () =>
        prisma.camera.findMany({
          where,
          include: {
            worksite: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    companyUsername: true,
                  },
                },
              },
            },
            trainingImages: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        }),
      [],
      diagnostics
    );

    const enriched = cameras.map((camera) => {
      const status = (camera.status || 'active').toLowerCase();
      const isOnline = status === 'online' || status === 'active';
      const lastUpdated = camera.updatedAt || camera.createdAt;

      return {
        id: camera.id,
        name: camera.name,
        status: camera.status,
        type: camera.type,
        streamUrl: camera.streamUrl,
        hlsUrl: camera.hlsUrl,
        mediamtxPath: camera.mediamtxPath,
        metadata: camera.metadata,
        ipAddress: camera.ipAddress,
        port: camera.port,
        username: camera.username,
        worksiteId: camera.worksiteId,
        worksite: camera.worksite
          ? {
              id: camera.worksite.id,
              name: camera.worksite.name,
              location: camera.worksite.location,
              status: camera.worksite.status,
              company: camera.worksite.company
                ? {
                    id: camera.worksite.company.id,
                    name: camera.worksite.company.name,
                    slug: camera.worksite.company.companyUsername,
                  }
                : null,
            }
          : null,
        lastHeartbeat: (camera.metadata && typeof camera.metadata === 'object' && 'lastHeartbeat' in camera.metadata)
          ? (camera.metadata as any).lastHeartbeat ?? null
          : null,
        online: isOnline,
        trainingImageCount: camera.trainingImages.length,
        lastUpdated: lastUpdated.toISOString(),
        createdAt: camera.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length,
      diagnostics,
    });
  } catch (error: any) {
    console.error('[admin][cameras] Failed to list cameras', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cameras',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}



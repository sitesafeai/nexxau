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
    console.warn(`[admin][worksites][${scope}]`, message);
    diagnostics.push({
      scope,
      message,
    });
    return fallback;
  }
}

/**
 * GET /api/admin/worksites
 * Optional query params:
 *  - companyId: filter worksites by company
 *  - status: filter by worksite status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const status = searchParams.get('status') || undefined;

    const diagnostics: DiagnosticsEntry[] = [];

    const worksites = await safeQuery(
      'worksite.findMany',
      () =>
        prisma.worksite.findMany({
          where: {
            ...(companyId ? { companyId } : {}),
            ...(status ? { status } : {}),
          },
          include: {
            company: {
              select: {
                id: true,
                name: true,
                companyUsername: true,
              },
            },
            cameras: {
              select: {
                id: true,
                status: true,
                mediamtxPath: true,
                metadata: true,
              },
            },
            safetyScores: {
              orderBy: {
                date: 'desc',
              },
              take: 1,
              select: {
                safetyScore: true,
                date: true,
              },
            },
            alerts: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 3,
              select: {
                id: true,
                severity: true,
                status: true,
                createdAt: true,
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

    const enriched = worksites.map((worksite) => {
      const cameraCount = worksite.cameras.length;
      const onlineCameras = worksite.cameras.filter((camera) => {
        const statusValue = (camera.status || 'active').toLowerCase();
        return statusValue === 'online' || statusValue === 'active';
      }).length;
      const latestScore = worksite.safetyScores[0]?.safetyScore ?? null;
      const latestScoreDate = worksite.safetyScores[0]?.date ?? null;
      const latestAlert = worksite.alerts[0]?.createdAt ?? null;

      const activityCandidates = [
        worksite.updatedAt,
        latestAlert,
        latestScoreDate,
      ].filter((value): value is Date => Boolean(value));

      const lastActivity =
        activityCandidates.length > 0
          ? new Date(
              Math.max(
                ...activityCandidates.map((candidate) => candidate.getTime())
              )
            )
          : null;

      return {
        id: worksite.id,
        name: worksite.name,
        status: worksite.status,
        location: worksite.location,
        address: worksite.address,
        companyId: worksite.companyId,
        company: worksite.company
          ? {
              id: worksite.company.id,
              name: worksite.company.name,
              slug: worksite.company.companyUsername,
            }
          : null,
        cameraCount,
        onlineCameraCount: onlineCameras,
        latestScore,
        complianceRate: latestScore !== null ? latestScore / 100 : null,
        lastActivity: lastActivity ? lastActivity.toISOString() : null,
        alerts: worksite.alerts.map((alert) => ({
          id: alert.id,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.createdAt,
        })),
        metadata: {
          mediamtxPaths: worksite.cameras
            .map((camera) => camera.mediamtxPath)
            .filter(Boolean),
        },
        createdAt: worksite.createdAt,
        updatedAt: worksite.updatedAt,
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length,
      diagnostics,
    });
  } catch (error: any) {
    console.error('[admin][worksites] Failed to list worksites', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch worksites',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// POST handler intentionally omitted in super-admin API; worksite creation
// remains available in existing admin endpoints.
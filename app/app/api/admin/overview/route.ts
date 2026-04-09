import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';
import { checkRole } from '@/app/lib/api-helpers';

type AlertStatusCount = {
  status: string;
  _count: {
    _all: number;
  };
};

type AlertSeverityCount = {
  severity: string;
  _count: {
    _all: number;
  };
};

type DetectionTrendRow = {
  date: Date;
  count: bigint;
};

type ComplianceTrendRow = {
  date: Date;
  average: number | null;
};

function toNumber(value: bigint | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'bigint') return Number(value);
  return value;
}

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
    console.warn(`[super-admin][overview][${scope}]`, message);
    diagnostics.push({
      scope,
      message,
    });
    return fallback;
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource.',
      },
      { status: 401 }
    );
  }

  // Check if user has required role
  const roleCheck = checkRole(session.user.role, 'SUPER_ADMIN', 'access this page');
  if (roleCheck) {
    return roleCheck;
  }

  try {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(last30Days.getDate() - 29);
    const last12Weeks = new Date(now);
    last12Weeks.setDate(last12Weeks.getDate() - 83);
    const last24Hours = new Date(now);
    last24Hours.setDate(last24Hours.getDate() - 1);

    const diagnostics: DiagnosticsEntry[] = [];

    const [
      companyCount,
      worksiteCount,
      cameraCount,
      userCount,
      detectionCountLast24h,
      severityCounts,
      statusCounts,
      complianceTrendRaw,
      detectionTrendRaw,
      worksiteSnapshots,
    ] = await Promise.all([
      safeQuery('company.count', () => prisma.company.count(), 0, diagnostics),
      safeQuery('worksite.count', () => prisma.worksite.count(), 0, diagnostics),
      safeQuery('camera.count', () => prisma.camera.count(), 0, diagnostics),
      safeQuery('user.count', () => prisma.user.count(), 0, diagnostics),
      safeQuery(
        'detection.count',
        () =>
          prisma.detection.count({
            where: {
              timestamp: {
                gte: last24Hours,
              },
            },
          }),
        0,
        diagnostics
      ),
      safeQuery(
        'alert.groupBy.severity',
        () =>
          prisma.alert.groupBy({
            by: ['severity'],
            _count: {
              _all: true,
            },
          }),
        [],
        diagnostics
      ),
      safeQuery(
        'alert.groupBy.status',
        () =>
          prisma.alert.groupBy({
            by: ['status'],
            _count: {
              _all: true,
            },
          }),
        [],
        diagnostics
      ),
      safeQuery(
        'safetyScore.trend',
        () =>
          prisma.$queryRaw<ComplianceTrendRow[]>`
        SELECT "date"::date AS date, AVG("safetyScore") AS average
        FROM "SafetyScore"
        WHERE "date" >= ${last30Days}
        GROUP BY date
        ORDER BY date ASC
      `,
        [],
        diagnostics
      ),
      safeQuery(
        'detection.trend',
        () =>
          prisma.$queryRaw<DetectionTrendRow[]>`
        SELECT DATE("timestamp") AS date, COUNT(*)::bigint AS count
        FROM "Detection"
        WHERE "timestamp" >= ${last30Days}
        GROUP BY DATE("timestamp")
        ORDER BY DATE("timestamp") ASC
      `,
        [],
        diagnostics
      ),
      safeQuery(
        'worksite.snapshots',
        () =>
          prisma.worksite.findMany({
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
                take: 5,
                select: {
                  id: true,
                  createdAt: true,
                  severity: true,
                  status: true,
                },
              },
            },
          }),
        [],
        diagnostics
      ),
    ]);

    const cameraStatusTotals = worksiteSnapshots.reduce(
      (acc, worksite) => {
        worksite.cameras.forEach((camera) => {
          const status = (camera.status || 'active').toLowerCase();
          acc.total += 1;

          if (status === 'online' || status === 'active') {
            acc.online += 1;
          } else if (status === 'offline') {
            acc.offline += 1;
          } else if (status === 'error') {
            acc.error += 1;
          } else {
            acc.other += 1;
          }
        });
        return acc;
      },
      {
        total: 0,
        online: 0,
        offline: 0,
        error: 0,
        other: 0,
      }
    );

    type CompanyAggregate = {
      id: string;
      name: string;
      slug?: string | null;
      siteCount: number;
      cameraCount: number;
      scores: number[];
      lastActivity?: Date;
    };

    const companyMap = new Map<string, CompanyAggregate>();

    const worksiteActivity = worksiteSnapshots
      .map((worksite) => {
        const latestScore = worksite.safetyScores[0]?.safetyScore ?? null;
        const latestScoreDate = worksite.safetyScores[0]?.date ?? null;
        const latestAlert = worksite.alerts[0]?.createdAt ?? null;

        const lastActivityCandidates = [
          worksite.updatedAt,
          latestAlert,
          latestScoreDate,
        ].filter((value): value is Date => Boolean(value));

        const lastActivity =
          lastActivityCandidates.length > 0
            ? new Date(
                Math.max(
                  ...lastActivityCandidates.map((date) => date.getTime())
                )
              )
            : null;

        const companyId = worksite.company?.id;
        if (companyId) {
          const aggregate =
            companyMap.get(companyId) ||
            {
              id: companyId,
              name: worksite.company?.name ?? 'Unknown Company',
              slug: worksite.company?.companyUsername,
              siteCount: 0,
              cameraCount: 0,
              scores: [],
              lastActivity: undefined,
            };

          aggregate.siteCount += 1;
          aggregate.cameraCount += worksite.cameras.length;
          if (latestScore !== null && !Number.isNaN(latestScore)) {
            aggregate.scores.push(latestScore);
          }
          if (
            lastActivity &&
            (!aggregate.lastActivity ||
              lastActivity > aggregate.lastActivity)
          ) {
            aggregate.lastActivity = lastActivity;
          }

          companyMap.set(companyId, aggregate);
        }

        return {
          id: worksite.id,
          name: worksite.name,
          status: worksite.status,
          location: worksite.location,
          companyId: worksite.company?.id ?? null,
          companyName: worksite.company?.name ?? 'Unassigned',
          cameraCount: worksite.cameras.length,
          onlineCameras: worksite.cameras.filter(
            (camera) =>
              (camera.status || 'active').toLowerCase() === 'online' ||
              (camera.status || 'active').toLowerCase() === 'active'
          ).length,
          latestScore,
          latestScoreDate,
          lastActivity,
        };
      })
      .sort((a, b) => {
        const aTime = a.lastActivity ? a.lastActivity.getTime() : 0;
        const bTime = b.lastActivity ? b.lastActivity.getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 6)
      .map((item) => ({
        ...item,
        lastActivity: item.lastActivity?.toISOString() ?? null,
        latestScoreDate: item.latestScoreDate?.toISOString() ?? null,
      }));

    const companyMetrics = Array.from(companyMap.values()).map((company) => {
      const avgScore =
        company.scores.length > 0
          ? company.scores.reduce((sum, score) => sum + score, 0) /
            company.scores.length
          : null;
      const complianceRate = avgScore !== null ? avgScore / 100 : null;
      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        siteCount: company.siteCount,
        cameraCount: company.cameraCount,
        avgSafetyScore: avgScore,
        complianceRate,
        latestActivity: company.lastActivity?.toISOString() ?? null,
      };
    });

    const sortedByScoreDesc = [...companyMetrics].sort((a, b) => {
      const scoreA = a.avgSafetyScore ?? -Infinity;
      const scoreB = b.avgSafetyScore ?? -Infinity;
      return scoreB - scoreA;
    });

    const sortedByScoreAsc = [...companyMetrics].sort((a, b) => {
      const scoreA = a.avgSafetyScore ?? Infinity;
      const scoreB = b.avgSafetyScore ?? Infinity;
      return scoreA - scoreB;
    });

    const topCompanies = sortedByScoreDesc.slice(0, 5);
    const bottomCompanies = sortedByScoreAsc.slice(0, 5);

    const allScores = companyMetrics
      .map((company) => company.avgSafetyScore)
      .filter((score): score is number => typeof score === 'number');

    const globalComplianceRate =
      allScores.length > 0
        ? allScores.reduce((sum, score) => sum + score, 0) / allScores.length
        : null;

    const complianceTrend = complianceTrendRaw.map((row) => {
      const dateValue =
        row.date instanceof Date ? row.date : new Date(row.date as any);
      return {
        date: dateValue.toISOString().split('T')[0],
        value: row.average ?? 0,
      };
    });

    const detectionTrend = detectionTrendRaw.map((row) => {
      const dateValue =
        row.date instanceof Date ? row.date : new Date(row.date as any);
      return {
        date: dateValue.toISOString().split('T')[0],
        detections: toNumber(row.count),
      };
    });

    const uptimePercentage =
      cameraStatusTotals.total > 0
        ? Number(
            (
              (cameraStatusTotals.online / cameraStatusTotals.total) *
              100
            ).toFixed(2)
          )
        : null;

    const alertSeveritySummary = severityCounts.reduce(
      (acc, item) => {
        acc[item.severity] = item._count._all;
        acc.total += item._count._all;
        return acc;
      },
      {
        total: 0,
        CRITICAL: 0,
        EMERGENCY: 0,
        WARNING: 0,
        INFO: 0,
      } as Record<string, number>
    );

    const alertStatusSummary = statusCounts.reduce(
      (acc, item) => {
        acc[item.status] = item._count._all;
        acc.total += item._count._all;
        return acc;
      },
      {
        total: 0,
        ACTIVE: 0,
        ACKNOWLEDGED: 0,
        RESOLVED: 0,
        ESCALATED: 0,
      } as Record<string, number>
    );

    const responsePayload = {
      success: true,
      generatedAt: now.toISOString(),
      data: {
        summary: {
          totals: {
            companies: companyCount,
            worksites: worksiteCount,
            cameras: cameraCount,
            users: userCount,
          },
          detectionVolumeLast24h: detectionCountLast24h,
          complianceRate: globalComplianceRate,
          cameraUptime: uptimePercentage,
        },
        alerts: {
          severity: {
            critical: alertSeveritySummary.CRITICAL + alertSeveritySummary.EMERGENCY,
            warning: alertSeveritySummary.WARNING,
            info: alertSeveritySummary.INFO,
            total: alertSeveritySummary.total,
          },
          status: {
            active: alertStatusSummary.ACTIVE,
            acknowledged: alertStatusSummary.ACKNOWLEDGED,
            resolved: alertStatusSummary.RESOLVED,
            escalated: alertStatusSummary.ESCALATED,
            total: alertStatusSummary.total,
          },
        },
        companies: {
          topPerformers: topCompanies,
          atRisk: bottomCompanies,
          totalTracked: companyMetrics.length,
        },
        worksiteActivity,
        charts: {
          complianceTrend,
          detectionTrend,
        },
        cameraStatus: {
          total: cameraStatusTotals.total,
          online: cameraStatusTotals.online,
          offline: cameraStatusTotals.offline,
          error: cameraStatusTotals.error,
          other: cameraStatusTotals.other,
        },
        diagnostics,
      },
    };

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    console.error('[super-admin][overview] Failed to build metrics', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load super admin overview',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}



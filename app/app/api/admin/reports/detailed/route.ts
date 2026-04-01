import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { normalizeRole } from '@/lib/roles';

/**
 * GET /api/admin/reports/detailed
 * Get detailed report data for super-admin reports page
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const worksiteId = searchParams.get('worksiteId');
    const timeRange = searchParams.get('timeRange') || '30d';

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    
    switch (timeRange) {
      case '24h':
        startDate.setHours(startDate.getHours() - 24);
        break;
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
      default:
        startDate.setDate(startDate.getDate() - 30);
    }

    // Build where clause
    const whereClause: any = {
      timestamp: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (worksiteId && worksiteId !== 'ALL') {
      whereClause.camera = {
        worksiteId,
      };
    } else if (companyId && companyId !== 'ALL' && companyId !== '') {
      whereClause.camera = {
        worksite: {
          companyId,
        },
      };
    }

    // 1. Detection Statistics
    const totalDetections = await prisma.detection.count({
      where: whereClause,
    });

    const detectionsByType = await prisma.detection.findMany({
      where: whereClause,
      select: {
        detections: true,
      },
    });

    const typeCounts: Record<string, number> = {};
    detectionsByType.forEach((detection) => {
      const detections = Array.isArray(detection.detections) ? detection.detections : [];
      detections.forEach((d: any) => {
        const type = d.class || d.type || 'unknown';
        typeCounts[type] = (typeCounts[type] || 0) + 1;
      });
    });

    // 2. Alert Statistics
    const alertWhere: any = {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    };

    if (worksiteId && worksiteId !== 'ALL') {
      alertWhere.worksiteId = worksiteId;
    } else if (companyId && companyId !== 'ALL' && companyId !== '') {
      alertWhere.worksite = {
        companyId,
      };
    }

    const alerts = await prisma.alert.findMany({
      where: alertWhere,
      select: {
        id: true,
        severity: true,
        status: true,
        createdAt: true,
        // acknowledgedAt: true, // Field doesn't exist in schema
        // resolvedAt: true, // Field doesn't exist in schema
        worksiteId: true,
        worksite: {
          select: {
            name: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const alertStats = {
      total: alerts.length,
      bySeverity: {
        CRITICAL: alerts.filter((a) => a.severity === 'CRITICAL').length,
        EMERGENCY: alerts.filter((a) => a.severity === 'EMERGENCY').length,
        WARNING: alerts.filter((a) => a.severity === 'WARNING').length,
        INFO: alerts.filter((a) => a.severity === 'INFO').length,
      },
      byStatus: {
        ACTIVE: alerts.filter((a) => a.status === 'ACTIVE').length,
        ACKNOWLEDGED: alerts.filter((a) => a.status === 'ACKNOWLEDGED').length,
        RESOLVED: alerts.filter((a) => a.status === 'RESOLVED').length,
        ESCALATED: alerts.filter((a) => a.status === 'ESCALATED').length,
      },
      avgResponseTime: (() => {
        // Note: acknowledgedAt doesn't exist, using status instead
        const resolved = alerts.filter((a) => a.status === 'RESOLVED' && a.createdAt);
        if (resolved.length === 0) return null;
        const times = resolved.map((a) => {
          const created = new Date(a.createdAt).getTime();
          // Note: acknowledgedAt doesn't exist, using createdAt as fallback
          // Note: acknowledgedAt doesn't exist, cannot calculate response time accurately
          // Using createdAt as placeholder (will always be 0, so return null)
          return 0;
        });
        // Cannot calculate response time without acknowledgedAt field
        return null; // Placeholder - would need acknowledgedAt field to calculate properly
      })(),
    };

    // 3. Camera Health
    const cameraWhere: any = {};
    if (worksiteId && worksiteId !== 'ALL') {
      cameraWhere.worksiteId = worksiteId;
    } else if (companyId && companyId !== 'ALL') {
      cameraWhere.worksite = {
        companyId,
      };
    }

    const cameras = await prisma.camera.findMany({
      where: cameraWhere,
      select: {
        id: true,
        name: true,
        status: true,
        metadata: true,
        worksite: {
          select: {
            id: true,
            name: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    const cameraHealth = {
      total: cameras.length,
      online: cameras.filter((c) => (c.status || '').toLowerCase() === 'online').length,
      offline: cameras.filter((c) => (c.status || '').toLowerCase() === 'offline').length,
      error: cameras.filter((c) => (c.status || '').toLowerCase() === 'error').length,
      withRecentHeartbeat: cameras.filter((c) => {
        const metadata = c.metadata as any;
        const lastHeartbeat = metadata?.lastHeartbeat;
        if (!lastHeartbeat) return false;
        const heartbeatDate = new Date(lastHeartbeat);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return heartbeatDate > fiveMinutesAgo;
      }).length,
    };

    // 4. Compliance Trends
    const safetyScores = await prisma.safetyScore.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(worksiteId && worksiteId !== 'ALL'
          ? { worksiteId }
          : companyId && companyId !== 'ALL'
          ? {
              worksite: {
                companyId,
              },
            }
          : {}),
      },
      orderBy: {
        date: 'asc',
      },
      select: {
        date: true,
        safetyScore: true,
        worksite: {
          select: {
            name: true,
            company: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    // Group by date
    const complianceByDate: Record<string, { total: number; sum: number }> = {};
    safetyScores.forEach((score) => {
      const dateKey = score.date.toISOString().split('T')[0];
      if (!complianceByDate[dateKey]) {
        complianceByDate[dateKey] = { total: 0, sum: 0 };
      }
      complianceByDate[dateKey].total += 1;
      complianceByDate[dateKey].sum += score.safetyScore;
    });

    const complianceTrend = Object.entries(complianceByDate)
      .map(([date, data]) => ({
        date,
        average: data.sum / data.total,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // 5. Top Violations
    const topViolations = Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // 6. Worksite Performance
    const worksitePerformance = await prisma.worksite.findMany({
      where: {
        ...(worksiteId && worksiteId !== 'ALL'
          ? { id: worksiteId }
          : companyId && companyId !== 'ALL'
          ? { companyId }
          : {}),
      },
      select: {
        id: true,
        name: true,
        status: true,
        company: {
          select: {
            name: true,
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
          where: {
            createdAt: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: {
            id: true,
            severity: true,
            status: true,
          },
        },
      },
    });

    const worksiteStats = worksitePerformance.map((worksite) => ({
      id: worksite.id,
      name: worksite.name,
      companyName: worksite.company?.name || 'Unknown',
      status: worksite.status,
      cameraCount: worksite.cameras.length,
      onlineCameras: worksite.cameras.filter(
        (c) => (c.status || '').toLowerCase() === 'online'
      ).length,
      latestScore: worksite.safetyScores[0]?.safetyScore || null,
      alertCount: worksite.alerts.length,
      criticalAlerts: worksite.alerts.filter((a) => a.severity === 'CRITICAL').length,
    }));

    return NextResponse.json({
      success: true,
      data: {
        timeRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: timeRange,
        },
        detections: {
          total: totalDetections,
          byType: topViolations,
        },
        alerts: alertStats,
        cameras: cameraHealth,
        compliance: {
          trend: complianceTrend,
          currentAverage:
            complianceTrend.length > 0
              ? complianceTrend[complianceTrend.length - 1].average
              : null,
        },
        worksites: worksiteStats,
      },
    });
  } catch (error: any) {
    console.error('[admin][reports][detailed] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate detailed report',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


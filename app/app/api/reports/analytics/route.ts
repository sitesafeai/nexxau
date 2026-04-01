import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');

    // Build where clause based on user role
    const userRole = user.role?.toUpperCase() || '';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
    const isCompanyAdmin = userRole === 'COMPANY_ADMIN' || userRole === 'COMPANYADMIN';

    let worksiteWhere: any = {};
    if (!isSuperAdmin) {
      if (isCompanyAdmin && user.companyId) {
        worksiteWhere.companyId = user.companyId;
      } else {
        worksiteWhere.worksiteUsers = {
          some: {
            userId: user.id
          }
        };
      }
    }

    if (worksiteId) {
      worksiteWhere.id = worksiteId;
    }

    // ============================================
    // 1. VIOLATIONS BY TYPE
    // ============================================
    const violations = await prisma.safetyViolation.findMany({
      where: {
        worksite: worksiteWhere
      },
      select: {
        violationType: true
      }
    });

    // Group violations by type and count
    const violationsByType = violations.reduce((acc, violation) => {
      const type = violation.violationType || 'Unknown';
      // Map violation types to display names
      const displayName = mapViolationTypeToDisplayName(type);
      acc[displayName] = (acc[displayName] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to array and sort by count
    const violationsArray = Object.entries(violationsByType)
      .map(([type, count]) => ({
        type,
        count,
        color: getViolationColor(type)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10

    // ============================================
    // 2. VIOLATION HOTSPOTS (by camera within site)
    // ============================================
    // Group safety violations by camera to find hotspots.
    // This is inherently site-specific because:
    // - When a worksiteId filter is provided, we scope to that site
    // - Otherwise, worksiteWhere applies role-based scoping
    const hotspotGroups = await prisma.safetyViolation.groupBy({
      by: ['cameraId'],
      where: {
        worksite: worksiteWhere,
        cameraId: {
          not: null
        }
      },
      _count: {
        _all: true
      },
      orderBy: {
        _count: {
          cameraId: 'desc'
        }
      },
      take: 10
    });

    // Fetch camera details for the hotspot cameras
    const hotspotCameraIds = hotspotGroups
      .map(group => group.cameraId)
      .filter((id): id is string => !!id);

    let violationHotspots: Array<{
      cameraId: string;
      name: string;
      site: string;
      violations: number;
      percentage: number;
    }> = [];

    if (hotspotCameraIds.length > 0) {
      const cameras = await prisma.camera.findMany({
        where: {
          id: { in: hotspotCameraIds }
        },
        select: {
          id: true,
          name: true,
          location: true,
          worksite: {
            select: {
              name: true,
              worksiteName: true
            }
          }
        }
      });

      const cameraMap = new Map<string, typeof cameras[number]>();
      cameras.forEach(cam => {
        cameraMap.set(cam.id, cam);
      });

      const totalViolations = hotspotGroups.reduce((sum, group) => sum + group._count._all, 0) || 1;

      violationHotspots = hotspotGroups.map(group => {
        const cameraId = group.cameraId as string;
        const camera = cameraMap.get(cameraId);
        const siteName =
          camera?.worksite?.name ||
          camera?.worksite?.worksiteName ||
          'Unknown Site';

        return {
          cameraId,
          name: camera?.name || camera?.location || 'Unknown Camera',
          site: siteName,
          violations: group._count._all,
          percentage: Math.round((group._count._all / totalViolations) * 100)
        };
      });
    }

    // ============================================
    // 3. TOP PERFORMING SITES (by safety score)
    // ============================================
    const worksites = await prisma.worksite.findMany({
      where: worksiteWhere,
      select: {
        id: true,
        name: true,
        worksiteName: true
      }
    });

    // Get latest safety scores for each worksite
    const worksiteScores = await Promise.all(
      worksites.map(async (worksite) => {
        const latestScore = await prisma.safetyScore.findFirst({
          where: { worksiteId: worksite.id },
          orderBy: { date: 'desc' },
          select: { safetyScore: true }
        });

        return {
          id: worksite.id,
          name: worksite.name || worksite.worksiteName,
          score: latestScore?.safetyScore || 0
        };
      })
    );

    // Sort by score descending and take top 10
    const topSites = worksiteScores
      .filter(site => site.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // ============================================
    // 4. AVERAGE RESPONSE TIME
    // ============================================
    // Get all alerts with their first response
    const alerts = await prisma.alert.findMany({
      where: {
        worksite: worksiteWhere,
        responses: {
          some: {}
        }
      },
      select: {
        id: true,
        severity: true,
        createdAt: true,
        responses: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: {
            createdAt: true
          }
        }
      }
    });

    // Calculate response times
    const responseTimes: Array<{ severity: string; timeMs: number }> = [];
    
    alerts.forEach(alert => {
      if (alert.responses.length > 0) {
        const firstResponse = alert.responses[0];
        const responseTimeMs = new Date(firstResponse.createdAt).getTime() - new Date(alert.createdAt).getTime();
        responseTimes.push({
          severity: alert.severity,
          timeMs: responseTimeMs
        });
      }
    });

    // Calculate averages by severity
    const severityGroups = responseTimes.reduce((acc, item) => {
      if (!acc[item.severity]) {
        acc[item.severity] = [];
      }
      acc[item.severity].push(item.timeMs);
      return acc;
    }, {} as Record<string, number[]>);

    const avgResponseTimes: Record<string, number> = {};
    Object.entries(severityGroups).forEach(([severity, times]) => {
      const avgMs = times.reduce((sum, t) => sum + t, 0) / times.length;
      avgResponseTimes[severity] = Math.round((avgMs / (1000 * 60)) * 10) / 10; // Convert to minutes, round to 1 decimal
    });

    // Overall average
    const overallAvg = responseTimes.length > 0
      ? Math.round((responseTimes.reduce((sum, item) => sum + item.timeMs, 0) / responseTimes.length / (1000 * 60)) * 10) / 10
      : 0;

    // Format response times
    const responseTimeData = {
      overall: overallAvg,
      bySeverity: {
        HIGH: avgResponseTimes['HIGH'] || 0,
        CRITICAL: avgResponseTimes['CRITICAL'] || avgResponseTimes['HIGH'] || 0,
        MEDIUM: avgResponseTimes['MEDIUM'] || 0,
        LOW: avgResponseTimes['LOW'] || 0
      }
    };

    return NextResponse.json({
      success: true,
      data: {
        violationsByType: violationsArray,
        topPerformingSites: topSites,
        responseTime: responseTimeData,
        violationHotspots
      }
    });
  } catch (error: any) {
    console.error('[Reports Analytics API] Error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch analytics data' },
      { status: 500 }
    );
  }
}

// Helper function to map violation types to display names
function mapViolationTypeToDisplayName(type: string): string {
  const mapping: Record<string, string> = {
    'hard_hat_violation': 'No Hard Hat',
    'hardhat_violation': 'No Hard Hat',
    'no_hardhat': 'No Hard Hat',
    'safety_vest_violation': 'No Safety Vest',
    'no_safety_vest': 'No Safety Vest',
    'safety_equipment_missing': 'No Safety Vest',
    'safety_glasses_violation': 'No Safety Glasses',
    'no_safety_glasses': 'No Safety Glasses',
    'restricted_zone': 'Restricted Zone',
    'restricted_zone_violation': 'Restricted Zone',
    'zone_breach': 'Restricted Zone',
    'unsafe_behavior': 'Unsafe Behavior',
    'ppe_violation': 'PPE Violation',
    'fall_protection': 'Fall Protection',
    'equipment_safety': 'Equipment Safety'
  };

  return mapping[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper function to get color for violation type
function getViolationColor(type: string): string {
  const colorMap: Record<string, string> = {
    'No Hard Hat': 'bg-red-500',
    'No Safety Vest': 'bg-orange-500',
    'Restricted Zone': 'bg-amber-500',
    'No Safety Glasses': 'bg-yellow-500',
    'Unsafe Behavior': 'bg-red-600',
    'PPE Violation': 'bg-orange-600',
    'Fall Protection': 'bg-red-700',
    'Equipment Safety': 'bg-amber-600'
  };

  return colorMap[type] || 'bg-slate-500';
}

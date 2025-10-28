import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/analytics?worksiteId=xxx&timeRange=7d
 * Get real analytics data from the database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const timeRange = searchParams.get('timeRange') || '7d';
    
    if (!worksiteId) {
      return NextResponse.json(
        { success: false, error: 'worksiteId is required' },
        { status: 400 }
      );
    }

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
        startDate.setDate(startDate.getDate() - 7);
    }

    // ============================================
    // 1. SAFETY SCORE
    // ============================================
    const latestScore = await prisma.safetyScore.findFirst({
      where: { worksiteId },
      orderBy: { date: 'desc' },
      select: {
        safetyScore: true,
        date: true
      }
    });

    const previousScore = await prisma.safetyScore.findFirst({
      where: {
        worksiteId,
        date: {
          lt: latestScore?.date || new Date()
        }
      },
      orderBy: { date: 'desc' },
      select: {
        safetyScore: true
      }
    });

    const safetyScore = {
      current: latestScore?.safetyScore || 0,
      previous: previousScore?.safetyScore || 0,
      trend: (latestScore?.safetyScore || 0) >= (previousScore?.safetyScore || 0) ? 'up' : 'down'
    };

    // ============================================
    // 2. VIOLATIONS
    // ============================================
    const violations = await prisma.safetyViolation.findMany({
      where: {
        worksiteId,
        detectedAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        severity: true,
        violationType: true,
        detectedAt: true
      }
    });

    const majorViolations = violations.filter(v => 
      v.severity === 'critical' || v.severity === 'high' || v.severity === 'major'
    );
    const minorViolations = violations.filter(v => 
      v.severity === 'medium' || v.severity === 'low' || v.severity === 'minor'
    );

    // Get previous period for comparison
    const previousPeriodStart = new Date(startDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);

    const previousViolations = await prisma.safetyViolation.count({
      where: {
        worksiteId,
        detectedAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });

    const violationChange = previousViolations > 0
      ? Math.round(((violations.length - previousViolations) / previousViolations) * 100)
      : 0;

    // ============================================
    // 3. VIOLATIONS BY TYPE
    // ============================================
    const violationsByType = violations.reduce((acc: any[], v) => {
      const existing = acc.find(item => item.type === v.violationType);
      const severity = v.severity === 'critical' || v.severity === 'high' || v.severity === 'major' 
        ? 'major' 
        : 'minor';
      
      if (existing) {
        existing.count++;
      } else {
        acc.push({
          type: v.violationType,
          count: 1,
          severity
        });
      }
      return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 10);

    // ============================================
    // 4. VIOLATIONS BY HOUR
    // ============================================
    const hourlyViolations = violations.reduce((acc: any, v) => {
      const hour = new Date(v.detectedAt).getHours();
      const hourLabel = hour === 0 ? '12AM' 
        : hour < 12 ? `${hour}AM` 
        : hour === 12 ? '12PM' 
        : `${hour - 12}PM`;
      
      const existing = acc.find((item: any) => item.hour === hourLabel);
      if (existing) {
        existing.violations++;
      } else {
        acc.push({ hour: hourLabel, hourNum: hour, violations: 1 });
      }
      return acc;
    }, []);

    // Fill in missing hours with 0
    const allHours = [];
    for (let i = 0; i < 24; i++) {
      const hourLabel = i === 0 ? '12AM' 
        : i < 12 ? `${i}AM` 
        : i === 12 ? '12PM' 
        : `${i - 12}PM`;
      
      const existing = hourlyViolations.find((item: any) => item.hour === hourLabel);
      allHours.push({
        hour: hourLabel,
        violations: existing?.violations || 0
      });
    }

    // For display, only show work hours (6AM - 6PM)
    const workHours = allHours.filter((_, idx) => idx >= 6 && idx <= 18);

    // ============================================
    // 5. COMPLIANCE RATE
    // ============================================
    const totalDetections = await prisma.$queryRaw<any[]>`
      SELECT COUNT(*) as count FROM "Camera" 
      WHERE "worksiteId" = ${worksiteId}
    `.then((result: any[]) => {
      // Estimate: assume 1 detection per camera per minute over the time period
      const cameras = result[0]?.count || 0;
      const hours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
      return Math.max(100, Math.floor(cameras * 60 * hours));
    });

    const complianceRate = totalDetections > 0
      ? Math.round(((totalDetections - violations.length) / totalDetections) * 100)
      : 100;

    // Previous compliance for comparison
    const previousTotalDetections = totalDetections; // Simplified
    const previousComplianceRate = previousTotalDetections > 0
      ? Math.round(((previousTotalDetections - previousViolations) / previousTotalDetections) * 100)
      : 100;
    
    const complianceChange = complianceRate - previousComplianceRate;

    // ============================================
    // 6. CAMERA STATUS
    // ============================================
    const cameras = await prisma.camera.findMany({
      where: { worksiteId },
      select: {
        id: true,
        status: true,
        lastHealthCheck: true
      }
    });

    const onlineCameras = cameras.filter(c => c.status === 'online').length;
    const offlineCameras = cameras.filter(c => 
      c.status === 'offline' || c.status === 'error'
    ).length;

    // Calculate uptime percentage
    const uptimePercentage = cameras.length > 0
      ? Math.round((onlineCameras / cameras.length) * 100)
      : 0;

    // ============================================
    // 7. ALERT STATISTICS
    // ============================================
    const alerts = await prisma.alert.findMany({
      where: {
        worksiteId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        status: true,
        createdAt: true,
        acknowledgedAt: true,
        resolvedAt: true
      }
    });

    const resolvedAlerts = alerts.filter(a => a.status === 'resolved');
    const pendingAlerts = alerts.filter(a => 
      a.status === 'active' || a.status === 'acknowledged'
    );

    // Calculate average response time for resolved alerts
    const responseTimes = resolvedAlerts
      .filter(a => a.acknowledgedAt && a.createdAt)
      .map(a => {
        const created = new Date(a.createdAt).getTime();
        const acknowledged = new Date(a.acknowledgedAt!).getTime();
        return acknowledged - created;
      });

    const avgResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const avgResponseMinutes = Math.round(avgResponseTime / (1000 * 60));
    const avgResponseDisplay = avgResponseMinutes < 60
      ? `${avgResponseMinutes} min`
      : `${Math.round(avgResponseMinutes / 60)} hr`;

    // ============================================
    // 8. CUSTOM RULE VIOLATIONS
    // ============================================
    const customRuleViolations = await prisma.customRuleViolation.findMany({
      where: {
        worksiteId,
        triggeredAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        rule: {
          select: {
            name: true
          }
        }
      }
    });

    // Add custom rule violations to violations by type
    customRuleViolations.forEach(v => {
      const type = v.rule?.name || 'Custom Rule';
      const existing = violationsByType.find(item => item.type === type);
      
      if (existing) {
        existing.count++;
      } else {
        violationsByType.push({
          type,
          count: 1,
          severity: v.severity === 'critical' || v.severity === 'high' ? 'major' : 'minor'
        });
      }
    });

    // Re-sort and limit
    violationsByType.sort((a, b) => b.count - a.count);
    const topViolations = violationsByType.slice(0, 10);

    // ============================================
    // RETURN RESPONSE
    // ============================================
    return NextResponse.json({
      success: true,
      data: {
        timeRange: {
          start: startDate,
          end: endDate,
          label: timeRange
        },
        safetyScore,
        violations: {
          total: violations.length,
          major: majorViolations.length,
          minor: minorViolations.length,
          trend: violationChange < 0 ? 'down' : 'up',
          change: violationChange
        },
        compliance: {
          rate: complianceRate,
          trend: complianceChange >= 0 ? 'up' : 'down',
          change: Math.abs(complianceChange)
        },
        cameras: {
          total: cameras.length,
          online: onlineCameras,
          offline: offlineCameras,
          uptime: uptimePercentage
        },
        alerts: {
          total: alerts.length,
          resolved: resolvedAlerts.length,
          pending: pendingAlerts.length,
          avgResponseTime: avgResponseDisplay
        },
        violationsByType: topViolations,
        hourlyViolations: workHours
      }
    });

  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch analytics', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}


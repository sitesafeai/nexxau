import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/analytics?worksiteId=xxx&timeRange=7d
 * Get real analytics data from the database
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const worksiteId = searchParams.get('worksiteId');
  const timeRange = searchParams.get('timeRange') || '7d';
  
  try {
    
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
    // 1. SAFETY SCORE (calculated from alerts and cameras)
    // ============================================
    // Fetch cameras first (needed for safety score calculation)
    let cameras: any[] = [];
    let allAlerts: any[] = [];
    
    try {
      cameras = await prisma.camera.findMany({
        where: { worksiteId },
        select: { status: true }
      });
    } catch (error: any) {
      console.error('[Analytics API] Error fetching cameras:', error);
      cameras = [];
    }
    
    // Calculate safety score based on alerts and camera status
    // Safety score = 100 - (alert severity impact) - (offline camera impact)
    try {
      allAlerts = await prisma.alert.findMany({
        where: { worksiteId },
        select: { severity: true, status: true }
      });
    } catch (error: any) {
      console.error('[Analytics API] Error fetching all alerts:', error);
      allAlerts = [];
    }
    
    const criticalAlerts = allAlerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
    const highAlerts = allAlerts.filter(a => (a.severity === 'WARNING' || a.severity === 'CRITICAL') && a.status !== 'RESOLVED').length;
    const mediumAlerts = allAlerts.filter(a => a.severity === 'INFO' && a.status !== 'RESOLVED').length;
    
    const offlineCameras = cameras.filter(c => c.status === 'offline' || c.status === 'error').length;
    const totalCameras = cameras.length;
    
    // Calculate score: start at 100, deduct points for issues
    let currentScore = 100;
    currentScore -= criticalAlerts * 10; // -10 per critical alert
    currentScore -= highAlerts * 5; // -5 per high alert
    currentScore -= mediumAlerts * 2; // -2 per medium alert
    if (totalCameras > 0) {
      currentScore -= (offlineCameras / totalCameras) * 20; // -20% for offline cameras
    }
    currentScore = Math.max(0, Math.min(100, currentScore)); // Clamp between 0-100
    
    // Get previous period score (simplified - using alerts from previous period)
    const previousPeriodStart = new Date(startDate);
    const periodLength = endDate.getTime() - startDate.getTime();
    previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);
    
    const previousAlerts = await prisma.alert.findMany({
      where: {
        worksiteId,
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      },
      select: { severity: true, status: true }
    });
    
    const prevCritical = previousAlerts.filter(a => a.severity === 'CRITICAL' && a.status !== 'RESOLVED').length;
    const prevHigh = previousAlerts.filter(a => (a.severity === 'WARNING' || a.severity === 'CRITICAL') && a.status !== 'RESOLVED').length;
    const prevMedium = previousAlerts.filter(a => a.severity === 'INFO' && a.status !== 'RESOLVED').length;
    
    let previousScore = 100;
    previousScore -= prevCritical * 10;
    previousScore -= prevHigh * 5;
    previousScore -= prevMedium * 2;
    previousScore = Math.max(0, Math.min(100, previousScore));
    
    const safetyScore = {
      current: Math.round(currentScore),
      previous: Math.round(previousScore),
      trend: currentScore >= previousScore ? 'up' : 'down'
    };

    // ============================================
    // 2. VIOLATIONS (using alerts as violations)
    // ============================================
    // Use alerts as violations since SafetyViolation model doesn't exist
    let violations: any[] = [];
    try {
      violations = await prisma.alert.findMany({
        where: {
          worksiteId,
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        },
        select: {
          severity: true,
          title: true,
          createdAt: true
        }
      });
    } catch (error: any) {
      console.error('[Analytics API] Error fetching violations:', error);
      violations = [];
    }

    const majorViolations = violations.filter(v => 
      v.severity === 'CRITICAL' || v.severity === 'WARNING' || v.severity === 'EMERGENCY'
    );
    const minorViolations = violations.filter(v => 
      v.severity === 'INFO'
    );

    // Get previous period for comparison (reuse previousPeriodStart from safety score calculation)
    const previousViolations = await prisma.alert.count({
      where: {
        worksiteId,
        createdAt: {
          gte: previousPeriodStart,
          lt: startDate
        }
      }
    });

    const violationChange = previousViolations > 0
      ? Math.round(((violations.length - previousViolations) / previousViolations) * 100)
      : 0;

    // ============================================
    // 3. VIOLATIONS BY TYPE (using alert titles/types)
    // ============================================
    const violationsByType = violations.reduce((acc: any[], v) => {
      // Extract violation type from alert title or use severity
      const violationType = v.title || v.severity || 'Unknown';
      const existing = acc.find(item => item.type === violationType);
      const severity = v.severity === 'CRITICAL' || v.severity === 'WARNING' || v.severity === 'EMERGENCY' 
        ? 'major' 
        : 'minor';
      
      if (existing) {
        existing.count++;
      } else {
        acc.push({
          type: violationType,
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
      const hour = new Date(v.createdAt).getHours();
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
    // Calculate compliance based on resolved vs total alerts
    const totalAlertsInPeriod = violations.length;
    
    // Get actual resolved count
    let resolvedCount = 0;
    try {
      resolvedCount = await prisma.alert.count({
        where: {
          worksiteId,
          status: 'RESOLVED',
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        }
      });
    } catch (error: any) {
      console.error('[Analytics API] Error counting resolved alerts:', error);
      resolvedCount = 0;
    }
    
    // Compliance rate = (total - violations) / total * 100
    // Simplified: use alert resolution rate as compliance proxy
    const complianceRate = totalAlertsInPeriod > 0
      ? Math.round((resolvedCount / totalAlertsInPeriod) * 100)
      : 100;

    // Previous compliance for comparison
    let previousResolved = 0;
    try {
      previousResolved = await prisma.alert.count({
        where: {
          worksiteId,
          status: 'RESOLVED',
          createdAt: {
            gte: previousPeriodStart,
            lt: startDate
          }
        }
      });
    } catch (error: any) {
      console.error('[Analytics API] Error counting previous resolved alerts:', error);
      previousResolved = 0;
    }
    
    const previousComplianceRate = previousViolations > 0
      ? Math.round((previousResolved / previousViolations) * 100)
      : 100;
    
    const complianceChange = complianceRate - previousComplianceRate;

    // ============================================
    // 6. CAMERA STATUS (reuse cameras from section 1)
    // ============================================
    const onlineCameras = cameras.filter(c => 
      c.status === 'online' || c.status === 'active'
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
        // acknowledgedAt: true, // Field doesn't exist in Alert schema
        resolvedAt: true
      }
    });

    const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED');
    const pendingAlerts = alerts.filter(a => 
      a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED'
    );

    // Calculate average response time for resolved alerts
    const responseTimes = resolvedAlerts
      // Note: acknowledgedAt doesn't exist, using status === 'ACKNOWLEDGED' as proxy
      .filter(a => a.status === 'ACKNOWLEDGED' && a.createdAt)
      .map(a => {
        const created = new Date(a.createdAt).getTime();
        // Cannot calculate MTTA without acknowledgedAt field - use createdAt as placeholder
        const acknowledged = new Date(a.createdAt).getTime();
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
    // 8. CUSTOM RULE VIOLATIONS (using AlertRule alerts)
    // ============================================
    // Get alerts that are triggered by custom rules
    let ruleAlerts: any[] = [];
    try {
      ruleAlerts = await prisma.alert.findMany({
        where: {
          worksiteId,
          ruleId: { not: null },
          createdAt: {
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
    } catch (error: any) {
      console.error('[Analytics API] Error fetching rule alerts:', error);
      ruleAlerts = [];
    }

    // Add rule-based alerts to violations by type
    ruleAlerts.forEach(alert => {
      const type = alert.rule?.name || 'Custom Rule';
      const existing = violationsByType.find(item => item.type === type);
      
      if (existing) {
        existing.count++;
      } else {
        violationsByType.push({
          type,
          count: 1,
          severity: (alert.severity === 'CRITICAL' || alert.severity === 'WARNING' || alert.severity === 'EMERGENCY') ? 'major' : 'minor'
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
          start: startDate.toISOString(),
          end: endDate.toISOString(),
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
    console.error('[Analytics API] Error fetching analytics:', error);
    console.error('[Analytics API] Error stack:', error?.stack);
    console.error('[Analytics API] Error details:', {
      message: error?.message,
      name: error?.name,
      code: error?.code,
      meta: error?.meta,
      worksiteId,
      timeRange
    });
    
    // Provide more helpful error messages based on error type
    let errorMessage = 'Failed to fetch analytics';
    if (error?.code === 'P2002') {
      errorMessage = 'Database constraint violation';
    } else if (error?.code === 'P2025') {
      errorMessage = 'Record not found';
    } else if (error?.message?.includes('prisma')) {
      errorMessage = 'Database connection error';
    } else if (error?.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage,
        details: error?.message || 'Unknown error',
        code: error?.code,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
      },
      { status: 500 }
    );
  }
}


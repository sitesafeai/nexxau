import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/metrics
 * Get comprehensive platform metrics including MTTA/MTTR, AI performance, camera health
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const now = new Date();
    const last24Hours = new Date(now);
    last24Hours.setHours(last24Hours.getHours() - 24);
    const last7Days = new Date(now);
    last7Days.setDate(last7Days.getDate() - 7);

    // 1. MTTA (Mean Time To Acknowledge) and MTTR (Mean Time To Resolve)
    let mtta: number | null = null;
    let mttr: number | null = null;
    try {
      // Note: acknowledgedAt field doesn't exist in schema, using status instead
      const acknowledgedAlerts = await prisma.alert.findMany({
        where: {
          status: { in: ['ACKNOWLEDGED', 'RESOLVED'] },
          createdAt: {
            gte: last7Days,
          },
        },
        select: {
          createdAt: true,
          status: true,
          // acknowledgedAt: true, // Field doesn't exist
          // resolvedAt: true, // Field doesn't exist
        },
      });

      // Mock MTTA/MTTR since we don't have acknowledgedAt/resolvedAt fields
      const mttaTimes: number[] = [];
      const mttrTimes: number[] = [];
      
      // If we had these fields, we would calculate:
      // const mttaTimes = acknowledgedAlerts
      //   .filter((a) => a.acknowledgedAt)
      //   .map((a) => {
      //     const created = new Date(a.createdAt).getTime();
      //     const acknowledged = new Date(a.acknowledgedAt!).getTime();
      //     return acknowledged - created; // milliseconds
      //   });
      //
      // const mttrTimes = acknowledgedAlerts
      //   .filter((a) => a.resolvedAt && a.acknowledgedAt)
      //   .map((a) => {
      //     const acknowledged = new Date(a.acknowledgedAt!).getTime();
      //     const resolved = new Date(a.resolvedAt!).getTime();
      //     return resolved - acknowledged; // milliseconds
      //   });

      mtta = mttaTimes.length > 0 ? mttaTimes.reduce((sum, time) => sum + time, 0) / mttaTimes.length / 1000 / 60 : null; // minutes
      mttr = mttrTimes.length > 0 ? mttrTimes.reduce((sum, time) => sum + time, 0) / mttrTimes.length / 1000 / 60 : null; // minutes
    } catch (e) {
      console.warn('[metrics] Failed to get alert metrics:', e);
    }

    // 2. AI Performance Metrics (False Positives/Negatives from user feedback)
    let totalFeedback = 0;
    let truePositives = 0;
    let falsePositives = 0;
    let needsReview = 0;
    let precision: number | null = null;
    let recall: number | null = null;
    
    try {
      const detectionsWithFeedback = await prisma.detection.findMany({
        where: {
          userFeedback: {
            not: null,
          },
          timestamp: {
            gte: last7Days,
          },
        },
        select: {
          userFeedback: true,
        },
      });

      totalFeedback = detectionsWithFeedback.length;
      truePositives = detectionsWithFeedback.filter((d) => d.userFeedback === 'true_positive').length;
      falsePositives = detectionsWithFeedback.filter((d) => d.userFeedback === 'false_positive').length;
      needsReview = detectionsWithFeedback.filter((d) => d.userFeedback === 'needs_review').length;

      precision = truePositives + falsePositives > 0 ? (truePositives / (truePositives + falsePositives)) * 100 : null;
      recall = totalFeedback > 0 ? (truePositives / totalFeedback) * 100 : null;
    } catch (e) {
      console.warn('[metrics] Failed to get detection feedback metrics:', e);
    }

    // 3. Camera Health Diagnostics
    let totalCameras = 0;
    let camerasWithHealth = 0;
    let camerasOnline = 0;
    let camerasWithErrors = 0;
    let avgFrameRate: number | null = null;
    let avgStreamQuality: number | null = null;
    let streamFailures = 0;
    let inferenceErrors = 0;
    
    try {
      const cameraHealthData = await prisma.cameraHealth.findMany({
        where: {
          lastCheck: {
            gte: last24Hours,
          },
        },
        select: {
          cameraId: true,
          status: true,
          frameRate: true,
          streamQuality: true,
          errors: true,
          lastCheck: true,
        },
      });

      totalCameras = await prisma.camera.count();
      camerasWithHealth = cameraHealthData.length;
      camerasOnline = cameraHealthData.filter((h) => h.status === 'ONLINE').length;
      camerasWithErrors = cameraHealthData.filter((h) => h.errors && Array.isArray(h.errors) && h.errors.length > 0).length;

      avgFrameRate =
        cameraHealthData.filter((h) => h.frameRate).length > 0
          ? cameraHealthData
              .filter((h) => h.frameRate)
              .reduce((sum, h) => sum + (h.frameRate || 0), 0) / cameraHealthData.filter((h) => h.frameRate).length
          : null;

      avgStreamQuality =
        cameraHealthData.filter((h) => h.streamQuality).length > 0
          ? cameraHealthData
              .filter((h) => h.streamQuality)
              .reduce((sum, h) => sum + (h.streamQuality || 0), 0) / cameraHealthData.filter((h) => h.streamQuality).length
          : null;

      // 5. Inference Errors (from camera health errors)
      inferenceErrors = cameraHealthData
        .map((h) => {
          if (!h.errors || !Array.isArray(h.errors)) return 0;
          return h.errors.filter((e: any) => e?.type === 'inference' || e?.message?.toLowerCase().includes('inference')).length;
        })
        .reduce((sum, count) => sum + count, 0);
    } catch (e) {
      console.warn('[metrics] Failed to get camera health metrics:', e);
      // Try to at least get the camera count
      try {
        totalCameras = await prisma.camera.count();
      } catch { }
    }

    // 4. Stream Failures (cameras that went offline in last 24h)
    try {
      streamFailures = await prisma.auditLog.count({
        where: {
          entity: 'Camera',
          action: 'UPDATE',
          metadata: {
            path: ['status'],
            equals: 'OFFLINE',
          },
          createdAt: {
            gte: last24Hours,
          },
        },
      });
    } catch (e) {
      console.warn('[metrics] Failed to get stream failures:', e);
    }

    // 6. Platform Operational Health
    let apiRequests = 0;
    try {
      apiRequests = await prisma.auditLog.count({
        where: {
          action: { in: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN'] },
          createdAt: {
            gte: last24Hours,
          },
        },
      });
    } catch (e) {
      console.warn('[metrics] Failed to get API request count:', e);
    }

    // 7. Security Metrics
    let failedLogins = 0;
    let activeSecurityIncidents = 0;
    try {
      failedLogins = await prisma.auditLog.count({
        where: {
          action: 'LOGIN',
          metadata: {
            path: ['success'],
            equals: false,
          },
          createdAt: {
            gte: last24Hours,
          },
        },
      });

      activeSecurityIncidents = await prisma.auditLog.count({
        where: {
          action: { in: ['DELETE', 'UPDATE'] },
          entity: { in: ['User', 'Company', 'Worksite'] },
          createdAt: {
            gte: last24Hours,
          },
        },
      });
    } catch (e) {
      console.warn('[metrics] Failed to get security metrics:', e);
    }

    // 8. Billing At-a-Glance
    let pastDueAccounts = 0;
    let upcomingRenewals = 0;
    try {
      const billingRecords = await prisma.companyBillingRecord.findMany({
        where: {
          createdAt: {
            gte: last7Days,
          },
        },
        select: {
          paidThrough: true,
          createdAt: true,
        },
      });

      pastDueAccounts = billingRecords.filter((b) => {
        if (!b.paidThrough) return false;
        const paidThrough = new Date(b.paidThrough);
        return paidThrough < now;
      }).length;

      upcomingRenewals = billingRecords.filter((b) => {
        if (!b.paidThrough) return false;
        const paidThrough = new Date(b.paidThrough);
        const daysUntilRenewal = (paidThrough.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
        return daysUntilRenewal > 0 && daysUntilRenewal <= 30;
      }).length;
    } catch (e) {
      console.warn('[metrics] Failed to get billing metrics:', e);
    }

    return NextResponse.json({
      success: true,
      data: {
        alerts: {
          mtta: mtta ? Math.round(mtta) : null, // minutes
          mttr: mttr ? Math.round(mttr) : null, // minutes
          mttaFormatted: mtta ? `${Math.round(mtta)} min` : 'N/A',
          mttrFormatted: mttr ? `${Math.round(mttr)} min` : 'N/A',
        },
        aiPerformance: {
          precision: precision ? precision.toFixed(1) : null,
          recall: recall ? recall.toFixed(1) : null,
          truePositives,
          falsePositives,
          needsReview,
          totalFeedback,
        },
        cameraHealth: {
          totalCameras,
          camerasWithHealth,
          camerasOnline,
          camerasWithErrors,
          avgFrameRate: avgFrameRate ? avgFrameRate.toFixed(1) : null,
          avgStreamQuality: avgStreamQuality ? avgStreamQuality.toFixed(1) : null,
          streamFailures,
          inferenceErrors,
        },
        platformHealth: {
          apiRequests,
          uptime: '99.9%', // Placeholder - would calculate from actual uptime
        },
        security: {
          failedLogins,
          activeSecurityIncidents,
        },
        billing: {
          pastDueAccounts,
          upcomingRenewals,
        },
      },
    });
  } catch (error: any) {
    console.error('[admin][metrics] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch metrics',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


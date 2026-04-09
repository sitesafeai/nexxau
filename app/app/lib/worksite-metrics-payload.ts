import { prisma } from '@/app/lib/prisma';
import { Cache, CacheKeys } from '@/app/lib/cache';
import { isCameraOnline } from '@/app/lib/camera-status';

function getAlertMetrics(alerts: any[]): {
  totalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
} {
  const highAlerts = alerts.filter(
    (a: any) =>
      a.severity?.toLowerCase() === 'high' ||
      a.severity?.toLowerCase() === 'critical'
  ).length;

  const mediumAlerts = alerts.filter(
    (a: any) => a.severity?.toLowerCase() === 'medium'
  ).length;

  const lowAlerts = alerts.filter(
    (a: any) => a.severity?.toLowerCase() === 'low'
  ).length;

  return {
    totalAlerts: alerts.length,
    highAlerts,
    mediumAlerts,
    lowAlerts,
  };
}

/** Scores are stored 0–100; tolerate legacy 0–1 fractions. */
export function normalizeSafetyScoreDisplay(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const n = Number(raw);
  if (n > 0 && n <= 1) return Math.round(n * 1000) / 10;
  return Math.round(n * 10) / 10;
}

function getSafetyScoreMetrics(safetyScores: any[]): {
  safetyScore: number | null;
  safetyScoreChange: number;
} {
  if (!safetyScores?.length) {
    return { safetyScore: null, safetyScoreChange: 0 };
  }
  const latest = safetyScores[0];
  const prev = safetyScores[1];
  const score = normalizeSafetyScoreDisplay(latest?.safetyScore ?? null);

  let safetyScoreChange = 0;
  if (score != null) {
    const y = normalizeSafetyScoreDisplay(latest?.yesterdayScore ?? null);
    if (y != null) {
      safetyScoreChange = Math.round((score - y) * 10) / 10;
    } else if (prev?.safetyScore != null) {
      const prevN = normalizeSafetyScoreDisplay(prev.safetyScore);
      if (prevN != null) {
        safetyScoreChange = Math.round((score - prevN) * 10) / 10;
      }
    }
  }

  return { safetyScore: score, safetyScoreChange };
}

async function getLastActivity(
  worksiteId: string,
  worksiteUpdatedAt: Date
): Promise<number | null> {
  try {
    const timestamps: number[] = [];

    const latestAlert = await prisma.alert.findFirst({
      where: { worksiteId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    if (latestAlert?.createdAt) {
      timestamps.push(new Date(latestAlert.createdAt).getTime());
    }

    const latestDetection = await prisma.detection.findFirst({
      where: {
        camera: { worksiteId },
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true },
    });
    if (latestDetection?.timestamp) {
      timestamps.push(new Date(latestDetection.timestamp).getTime());
    }

    if (worksiteUpdatedAt) {
      timestamps.push(new Date(worksiteUpdatedAt).getTime());
    }

    if (timestamps.length > 0) {
      return Math.max(...timestamps);
    }

    return null;
  } catch (e) {
    console.error('Error calculating last activity:', e);
    return null;
  }
}

export type WorksiteMetricsPayload = {
  activeCameras: number;
  offlineCameras: number;
  totalCameras: number;
  aiEnabledCameras: number;
  totalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  safetyScore: number | null;
  /** vs prior day when available (from SafetyScore.yesterdayScore or previous row) */
  safetyScoreChange: number;
  /** Detections in the last 24h for this worksite */
  violations24h: number;
  lastActivity: string | null;
};

/**
 * Aggregated metrics for a worksite (same shape as GET /api/worksites/:id/metrics).
 * Returns null if the worksite does not exist.
 */
export async function getWorksiteMetricsPayload(
  worksiteId: string
): Promise<WorksiteMetricsPayload | null> {
  let worksite;
  try {
    worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      include: {
        cameras: {
          select: {
            id: true,
            status: true,
          },
        },
        alerts: {
          where: {
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] },
          },
          select: {
            id: true,
            severity: true,
            createdAt: true,
          },
        },
      },
    });
  } catch (dbError: any) {
    console.error('Database query error:', dbError.message);
    worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
    });
    if (worksite) {
      (worksite as any).cameras = [];
      (worksite as any).alerts = [];
    }
  }

  if (!worksite) {
    return null;
  }

  const cameraMetricsData = await Cache.wrap(
    CacheKeys.cameraMetrics(worksiteId),
    async () => {
      const camerasWithHealth = await prisma.camera.findMany({
        where: { worksiteId },
        select: {
          id: true,
          status: true,
          metadata: true,
          health: {
            orderBy: { lastCheck: 'desc' },
            take: 1,
            select: {
              status: true,
              lastCheck: true,
            },
          },
        },
      });

      let activeCameras = 0;
      let offlineCameras = 0;
      let aiEnabledCameras = 0;

      for (const camera of camerasWithHealth) {
        if (isCameraOnline(camera)) {
          activeCameras++;
        } else {
          offlineCameras++;
        }

        if (camera.metadata && typeof camera.metadata === 'object') {
          const metadata = camera.metadata as any;
          if (metadata.aiEnabled === true) {
            aiEnabledCameras++;
          }
        }
      }

      return {
        activeCameras,
        offlineCameras,
        totalCameras: camerasWithHealth.length,
        aiEnabledCameras,
      };
    },
    { ttl: 60 }
  );

  const [alertMetrics, safetyScoreMetrics, lastActivityTimestamp, violations24h] =
    await Promise.all([
      Cache.wrap(
        CacheKeys.alertMetrics(worksiteId),
        () =>
          Promise.resolve(
            getAlertMetrics((worksite as any).alerts || [])
          ),
        { ttl: 10 }
      ),

      // Always read latest scores from DB — avoids stale 5m cache showing N/A while reports still chart history
      (async () => {
        const latestScores = await prisma.safetyScore.findMany({
          where: { worksiteId },
          orderBy: { date: 'desc' },
          take: 2,
          select: {
            safetyScore: true,
            yesterdayScore: true,
            date: true,
          },
        });
        return getSafetyScoreMetrics(latestScores);
      })(),

      Cache.wrap(
        CacheKeys.lastActivity(worksiteId),
        () => getLastActivity(worksiteId, worksite.updatedAt),
        { ttl: 30 }
      ),

      prisma.detection
        .count({
          where: {
            camera: { worksiteId },
            timestamp: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        })
        .catch(() => 0),
    ]);

  return {
    ...cameraMetricsData,
    ...alertMetrics,
    ...safetyScoreMetrics,
    violations24h,
    lastActivity: lastActivityTimestamp
      ? new Date(lastActivityTimestamp).toISOString()
      : null,
  };
}

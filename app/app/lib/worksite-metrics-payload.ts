import { prisma } from '@/lib/prisma';
import { Cache, CacheKeys } from '@/lib/cache';
import { isCameraOnline } from '@/lib/camera-status';

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

function getSafetyScoreMetrics(safetyScores: any[]): {
  safetyScore: number | null;
} {
  const latestScore = safetyScores?.[0]?.safetyScore ?? null;
  return {
    safetyScore: latestScore,
  };
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
      (worksite as any).safetyScores = [];
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

  const [alertMetrics, safetyScoreMetrics, lastActivityTimestamp] =
    await Promise.all([
      Cache.wrap(
        CacheKeys.alertMetrics(worksiteId),
        () =>
          Promise.resolve(
            getAlertMetrics((worksite as any).alerts || [])
          ),
        { ttl: 10 }
      ),

      Cache.wrap(
        CacheKeys.safetyScoreMetrics(worksiteId),
        () =>
          Promise.resolve(
            getSafetyScoreMetrics((worksite as any).safetyScores || [])
          ),
        { ttl: 60 * 5 }
      ),

      Cache.wrap(
        CacheKeys.lastActivity(worksiteId),
        () => getLastActivity(worksiteId, worksite.updatedAt),
        { ttl: 30 }
      ),
    ]);

  return {
    ...cameraMetricsData,
    ...alertMetrics,
    ...safetyScoreMetrics,
    lastActivity: lastActivityTimestamp
      ? new Date(lastActivityTimestamp).toISOString()
      : null,
  };
}

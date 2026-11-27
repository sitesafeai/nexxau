import { prisma } from '@/app/lib/prisma';
import { Cache, CacheKeys } from '@/app/lib/cache';
import { getOneSiteKpis } from '@/app/lib/site-kpis';

/** Scores are stored 0–100; tolerate legacy 0–1 fractions. */
export function normalizeSafetyScoreDisplay(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const n = Number(raw);
  if (n > 0 && n <= 1) return Math.round(n * 1000) / 10;
  return Math.round(n * 10) / 10;
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
  /** Open alerts (ACTIVE/ACKNOWLEDGED/ESCALATED) — see lib/site-kpis.ts */
  totalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  resolved30d: number;
  safetyScore: number | null;
  safetyScoreChange: number;
  safetyScoreSource: 'calculated' | 'live';
  /** Real alerts (not false positives) created in the last 24h */
  violations24h: number;
  /** Mean minutes from alert to resolution, last 30 days; null = nothing resolved yet */
  avgResponseTime: number | null;
  /** null = no heartbeat data, NOT 100% */
  cameraUptime7d: number | null;
  lastActivity: string | null;
};

/**
 * Aggregated metrics for a worksite (same shape as GET /api/worksites/:id/metrics).
 * All numbers come from getSiteKpis() so every page agrees.
 * Returns null if the worksite does not exist.
 */
export async function getWorksiteMetricsPayload(
  worksiteId: string
): Promise<WorksiteMetricsPayload | null> {
  const worksite = await prisma.worksite.findUnique({
    where: { id: worksiteId },
    select: { id: true, updatedAt: true },
  });
  if (!worksite) return null;

  const [k, lastActivityTimestamp] = await Promise.all([
    getOneSiteKpis(worksiteId),
    Cache.wrap(
      CacheKeys.lastActivity(worksiteId),
      () => getLastActivity(worksiteId, worksite.updatedAt),
      { ttl: 30 }
    ),
  ]);
  if (!k) return null;

  return {
    activeCameras: k.camerasOnline,
    offlineCameras: k.camerasOffline,
    totalCameras: k.camerasTotal,
    aiEnabledCameras: k.aiEnabledCameras,
    totalAlerts: k.openAlerts,
    highAlerts: k.highAlerts,
    mediumAlerts: k.mediumAlerts,
    lowAlerts: k.lowAlerts,
    resolved30d: k.resolved30d,
    safetyScore: k.safetyScore,
    safetyScoreChange: k.safetyScoreChange,
    safetyScoreSource: k.safetyScoreSource,
    violations24h: k.violations24h,
    avgResponseTime: k.avgResolveMin,
    cameraUptime7d: k.cameraUptime7d,
    lastActivity: lastActivityTimestamp
      ? new Date(lastActivityTimestamp).toISOString()
      : null,
  };
}

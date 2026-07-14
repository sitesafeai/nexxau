import type { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { normalizeSafetyScoreDisplay } from '@/app/lib/worksite-metrics-payload';

export type ViolationsByTypeRow = { type: string; count: number; color: string };
export type AlertVolumePoint   = { date: string; label: string; count: number };
export type AlertHourPoint     = { hour: number; label: string; count: number };
export type AlertSeverityRow   = { severity: 'HIGH' | 'MEDIUM' | 'LOW'; count: number; percentage: number };
export type ResolutionStats    = {
  total: number;
  resolved: number;
  falsePositive: number;
  active: number;
  resolvedPct: number;
  avgResolutionMinutes: number;
};
export type PeriodComparison   = {
  currentAlerts: number;
  previousAlerts: number;
  alertChangePct: number;
  currentViolations: number;
  previousViolations: number;
  violationChangePct: number;
};
/** Cameras with the most detection violations, with breakdown by violation type */
export type CameraViolationHotspotRow = {
  cameraId: string;
  name: string;
  site: string;
  total: number;
  byType: { type: string; count: number }[];
  /** Share of all violations at this worksite in the period (0–100) */
  percentageOfSite: number;
};

/** Alerts with a linked camera, grouped by camera (from `Alert.cameraId`) */
export type AlertCameraSummaryRow = {
  cameraId: string;
  name: string;
  count: number;
  /** Share of alerts that have a camera in this period (0–100) */
  percentageOfAlertsWithCamera: number;
};

export type RecentAlertCameraRow = {
  id: string;
  title: string;
  createdAt: string;
  cameraName: string | null;
};
export type AlertsByTypeRow = { type: string; count: number };
export type SafetyTrendPoint = { date: string; label: string; safetyScore: number };

export type WorksiteReportAnalytics = {
  violationsByType: ViolationsByTypeRow[];
  cameraViolationHotspots: CameraViolationHotspotRow[];
  alertsByCamera: AlertCameraSummaryRow[];
  recentAlertsWithCamera: RecentAlertCameraRow[];
  /** Total safety violations + alerts in the selected date window */
  periodTotals: { safetyViolations: number; alerts: number };
  alertsByType: AlertsByTypeRow[];
  safetyScoreTrend: SafetyTrendPoint[];
  responseTime: {
    overall: number;
    bySeverity: { HIGH: number; MEDIUM: number; LOW: number };
    sampleCount: number;
  };
  // ── NEW trend fields ──────────────────────────────────────────────────────
  /** Alert count for each day in the selected period */
  alertVolumeByDay: AlertVolumePoint[];
  /** Alert distribution across each hour of the day (0–23) */
  alertsByHour: AlertHourPoint[];
  /** HIGH / MEDIUM / LOW breakdown with percentages */
  alertsBySeverity: AlertSeverityRow[];
  /** Resolution funnel for the period */
  resolutionStats: ResolutionStats;
  /** Current vs previous equal-length period */
  periodComparison: PeriodComparison;
  /** Hour with the highest alert count (null if no alerts) */
  peakHour: number | null;
  worksiteName: string | null;
  dateRange: { from: string; to: string };
};

export function mapViolationTypeToDisplayName(type: string): string {
  const mapping: Record<string, string> = {
    hard_hat_violation: 'No Hard Hat',
    hardhat_violation: 'No Hard Hat',
    no_hardhat: 'No Hard Hat',
    safety_vest_violation: 'No Safety Vest',
    no_safety_vest: 'No Safety Vest',
    safety_equipment_missing: 'No Safety Vest',
    safety_glasses_violation: 'No Safety Glasses',
    no_safety_glasses: 'No Safety Glasses',
    restricted_zone: 'Restricted Zone',
    restricted_zone_violation: 'Restricted Zone',
    zone_breach: 'Restricted Zone',
    unsafe_behavior: 'Unsafe Behavior',
    ppe_violation: 'PPE Violation',
    fall_protection: 'Fall Protection',
    equipment_safety: 'Equipment Safety',
  };
  return mapping[type.toLowerCase()] || type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

function getViolationColor(type: string): string {
  const colorMap: Record<string, string> = {
    'No Hard Hat': 'bg-red-500',
    'No Safety Vest': 'bg-orange-500',
    'Restricted Zone': 'bg-amber-500',
    'No Safety Glasses': 'bg-yellow-500',
    'Unsafe Behavior': 'bg-red-600',
    'PPE Violation': 'bg-orange-600',
    'Fall Protection': 'bg-red-700',
    'Equipment Safety': 'bg-amber-600',
  };
  return colorMap[type] || 'bg-slate-500';
}

/**
 * Average response time: mean minutes from alert `createdAt` to first `AlertResponse.createdAt`
 * in the selected period. Only alerts with at least one response are included.
 */
export async function getWorksiteReportAnalyticsData(
  prisma: PrismaClient,
  opts: {
    worksiteWhere: Prisma.WorksiteWhereInput;
    singleWorksiteId: string | null;
    dateFrom: Date;
    dateTo: Date;
  }
): Promise<WorksiteReportAnalytics> {
  const { worksiteWhere, singleWorksiteId, dateFrom, dateTo } = opts;

  let worksiteName: string | null = null;
  if (singleWorksiteId) {
    const ws = await prisma.worksite.findFirst({
      where: { id: singleWorksiteId },
      select: { name: true, worksiteName: true },
    });
    worksiteName = ws?.name || ws?.worksiteName || null;
  }

  const violationRows = await prisma.safetyViolation.findMany({
    where: {
      worksite: worksiteWhere,
      detectedAt: { gte: dateFrom, lte: dateTo },
    },
    select: { violationType: true, cameraId: true },
  });

  const violationsByTypeMap = violationRows.reduce((acc, v) => {
    const display = mapViolationTypeToDisplayName(v.violationType || 'Unknown');
    acc[display] = (acc[display] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const violationsByType: ViolationsByTypeRow[] = Object.entries(violationsByTypeMap)
    .map(([type, count]) => ({ type, count, color: getViolationColor(type) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  const totalViolationsInPeriod = violationRows.length;

  const violWithCam = violationRows.filter((v) => v.cameraId);
  const byCamera = new Map<string, Record<string, number>>();
  for (const v of violWithCam) {
    const cid = v.cameraId as string;
    const display = mapViolationTypeToDisplayName(v.violationType || 'Unknown');
    if (!byCamera.has(cid)) byCamera.set(cid, {});
    const m = byCamera.get(cid)!;
    m[display] = (m[display] || 0) + 1;
  }

  const cameraTotals = [...byCamera.entries()]
    .map(([cameraId, typeMap]) => ({
      cameraId,
      total: Object.values(typeMap).reduce((s, n) => s + n, 0),
      typeMap,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  let cameraViolationHotspots: CameraViolationHotspotRow[] = [];
  if (cameraTotals.length > 0) {
    const camIds = cameraTotals.map((c) => c.cameraId);
    const cameras = await prisma.camera.findMany({
      where: { id: { in: camIds } },
      select: {
        id: true,
        name: true,
        location: true,
        worksite: { select: { name: true, worksiteName: true } },
      },
    });
    const camMap = new Map(cameras.map((c) => [c.id, c]));
    const denom = totalViolationsInPeriod > 0 ? totalViolationsInPeriod : 1;
    cameraViolationHotspots = cameraTotals.map((row) => {
      const cam = camMap.get(row.cameraId);
      const siteName = cam?.worksite?.name || cam?.worksite?.worksiteName || '—';
      const byType = Object.entries(row.typeMap)
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count);
      return {
        cameraId: row.cameraId,
        name: cam?.name || cam?.location || 'Unknown camera',
        site: siteName,
        total: row.total,
        byType,
        percentageOfSite: Math.round((row.total / denom) * 100),
      };
    });
  }

  const alertWhereBase = {
    worksite: worksiteWhere,
    createdAt: { gte: dateFrom, lte: dateTo },
  };

  const alertCountInPeriod = await prisma.alert.count({ where: alertWhereBase });

  // ── Fetch alert details for trend calculations (one query, many uses) ──────
  const allAlertDetails = await prisma.alert.findMany({
    where: alertWhereBase,
    select: { createdAt: true, severity: true, status: true, resolvedAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // Build lookup maps from the single fetch
  const alertsByDateMap: Record<string, number> = {};
  const alertHourMap:    Record<number, number>  = {};
  const severityCountMap: Record<string, number>  = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  const RESOLVED_STATUSES = new Set(['RESOLVED', 'ARCHIVED', 'CONFIRMED']);
  let resolvedCount   = 0;
  let fpCount         = 0;
  let activeCount     = 0;
  let totalResolutionMs = 0;
  let resolutionSamples = 0;

  for (const a of allAlertDetails) {
    const d = new Date(a.createdAt);
    const key = d.toISOString().slice(0, 10);
    alertsByDateMap[key] = (alertsByDateMap[key] ?? 0) + 1;
    const h = d.getHours();
    alertHourMap[h] = (alertHourMap[h] ?? 0) + 1;
    if (a.severity in severityCountMap) severityCountMap[a.severity]++;
    if (RESOLVED_STATUSES.has(a.status)) {
      resolvedCount++;
      if (a.resolvedAt) {
        const ms = new Date(a.resolvedAt).getTime() - d.getTime();
        if (ms >= 0) { totalResolutionMs += ms; resolutionSamples++; }
      }
    } else if (a.status === 'FALSE_POSITIVE') {
      fpCount++;
    } else {
      activeCount++;
    }
  }

  // Alert volume by day (one entry per day in range, capped at 90)
  const totalDaysRange = Math.round((dateTo.getTime() - dateFrom.getTime()) / 86_400_000);
  const alertVolumeByDay: AlertVolumePoint[] = [];
  for (let i = 0; i <= Math.min(totalDaysRange, 90); i++) {
    const d = new Date(dateFrom);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    alertVolumeByDay.push({
      date:  key,
      label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: alertsByDateMap[key] ?? 0,
    });
  }

  // 24-hour distribution
  const fmtHour = (h: number) => {
    if (h === 0)  return '12am';
    if (h === 12) return '12pm';
    return h < 12 ? `${h}am` : `${h - 12}pm`;
  };
  const alertsByHour: AlertHourPoint[] = Array.from({ length: 24 }, (_, h) => ({
    hour:  h,
    label: fmtHour(h),
    count: alertHourMap[h] ?? 0,
  }));

  const peakHourEntry = alertsByHour.reduce<AlertHourPoint | null>((max, h) =>
    !max || h.count > max.count ? h : max, null);
  const peakHour: number | null = peakHourEntry && peakHourEntry.count > 0
    ? peakHourEntry.hour : null;

  // Severity split
  const alertsBySeverity: AlertSeverityRow[] = (['HIGH', 'MEDIUM', 'LOW'] as const).map(sev => ({
    severity:   sev,
    count:      severityCountMap[sev] ?? 0,
    percentage: alertCountInPeriod > 0
      ? Math.round(((severityCountMap[sev] ?? 0) / alertCountInPeriod) * 100)
      : 0,
  }));

  // Resolution funnel
  const resolutionStats: ResolutionStats = {
    total:                 alertCountInPeriod,
    resolved:              resolvedCount,
    falsePositive:         fpCount,
    active:                activeCount,
    resolvedPct:           alertCountInPeriod > 0
      ? Math.round((resolvedCount / alertCountInPeriod) * 100) : 0,
    avgResolutionMinutes:  resolutionSamples > 0
      ? Math.round((totalResolutionMs / resolutionSamples / 60_000) * 10) / 10 : 0,
  };

  // Period-over-period comparison
  const periodMs = dateTo.getTime() - dateFrom.getTime();
  const prevTo   = new Date(dateFrom.getTime());
  const prevFrom = new Date(dateFrom.getTime() - periodMs);
  const [prevAlerts, prevViolations] = await Promise.all([
    prisma.alert.count({
      where: { worksite: worksiteWhere, createdAt: { gte: prevFrom, lte: prevTo } },
    }),
    prisma.safetyViolation.count({
      where: { worksite: worksiteWhere, detectedAt: { gte: prevFrom, lte: prevTo } },
    }),
  ]);
  const changePct = (curr: number, prev: number) =>
    prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100);

  const periodComparison: PeriodComparison = {
    currentAlerts:       alertCountInPeriod,
    previousAlerts:      prevAlerts,
    alertChangePct:      changePct(alertCountInPeriod, prevAlerts),
    currentViolations:   totalViolationsInPeriod,
    previousViolations:  prevViolations,
    violationChangePct:  changePct(totalViolationsInPeriod, prevViolations),
  };

  const titleGroups = await prisma.alert.groupBy({
    by: ['title'],
    where: alertWhereBase,
    _count: { _all: true },
    orderBy: { _count: { title: 'desc' } },
    take: 12,
  });

  const alertsByType: AlertsByTypeRow[] = titleGroups.map((g) => {
    const n = typeof g._count === 'object' && g._count && '_all' in g._count ? g._count._all : 0;
    return {
      type: g.title || 'Untitled',
      count: n,
    };
  });

  const alertCameraGroups = await prisma.alert.groupBy({
    by: ['cameraId'],
    where: {
      ...alertWhereBase,
      cameraId: { not: null },
    },
    _count: { _all: true },
    orderBy: { _count: { _all: 'desc' } },
    take: 12,
  });

  const alertCamIdsForSummary = alertCameraGroups.map((g) => g.cameraId).filter(Boolean) as string[];
  const alertCamerasForSummary =
    alertCamIdsForSummary.length > 0
      ? await prisma.camera.findMany({
          where: { id: { in: alertCamIdsForSummary } },
          select: { id: true, name: true, location: true },
        })
      : [];
  const alertCamSummaryMap = new Map(alertCamerasForSummary.map((c) => [c.id, c]));

  const denomAllAlerts = alertCountInPeriod > 0 ? alertCountInPeriod : 1;
  const alertsByCamera: AlertCameraSummaryRow[] = alertCameraGroups.map((g) => {
    const cid = g.cameraId as string;
    const cam = alertCamSummaryMap.get(cid);
    const count = g._count._all;
    return {
      cameraId: cid,
      name: cam?.name || cam?.location || 'Unknown camera',
      count,
      percentageOfAlertsWithCamera: Math.round((count / denomAllAlerts) * 100),
    };
  });

  const recentAlertRows = await prisma.alert.findMany({
    where: alertWhereBase,
    orderBy: { createdAt: 'desc' },
    take: 25,
    select: {
      id: true,
      title: true,
      createdAt: true,
      camera: { select: { name: true, location: true } },
    },
  });
  const recentAlertsWithCamera: RecentAlertCameraRow[] = recentAlertRows.map((a) => ({
    id: a.id,
    title: a.title,
    createdAt: a.createdAt.toISOString(),
    cameraName: a.camera ? a.camera.name || a.camera.location || null : null,
  }));

  let safetyScoreTrend: SafetyTrendPoint[] = [];
  if (singleWorksiteId) {
    const latestRow = await prisma.safetyScore.findFirst({
      where: { worksiteId: singleWorksiteId },
      orderBy: { date: 'desc' },
      select: { safetyScore: true },
    });
    const latestOk = latestRow ? normalizeSafetyScoreDisplay(latestRow.safetyScore) : null;

    if (latestOk != null) {
      // Use stored SafetyScore rows when available
      const scores = await prisma.safetyScore.findMany({
        where: {
          worksiteId: singleWorksiteId,
          date: { gte: dateFrom, lte: dateTo },
        },
        orderBy: { date: 'asc' },
        select: { date: true, safetyScore: true },
      });
      safetyScoreTrend = scores.map((s) => {
        const d = new Date(s.date);
        const n = normalizeSafetyScoreDisplay(s.safetyScore);
        return {
          date: d.toISOString().slice(0, 10),
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          safetyScore: n ?? 0,
        };
      });
    } else {
      // Fallback: derive daily safety score from Alert volume.
      // Formula: 100 pts baseline — each alert on that day costs 2 pts, floor at 0.
      const alertRows = await prisma.alert.findMany({
        where: { worksiteId: singleWorksiteId, createdAt: { gte: dateFrom, lte: dateTo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      });

      // Group alert counts by ISO date string
      const alertsByDate: Record<string, number> = {};
      for (const a of alertRows) {
        const key = new Date(a.createdAt).toISOString().slice(0, 10);
        alertsByDate[key] = (alertsByDate[key] ?? 0) + 1;
      }

      // Emit one point per day in the requested range (capped at 90 days)
      const totalDays = Math.round((dateTo.getTime() - dateFrom.getTime()) / 86_400_000);
      for (let i = 0; i <= Math.min(totalDays, 90); i++) {
        const d = new Date(dateFrom);
        d.setDate(d.getDate() + i);
        const key = d.toISOString().slice(0, 10);
        const alertsOnDay = alertsByDate[key] ?? 0;
        safetyScoreTrend.push({
          date: key,
          label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          safetyScore: Math.max(0, Math.min(100, 100 - alertsOnDay * 2)),
        });
      }
    }
  }

  const alertsWithResponses = await prisma.alert.findMany({
    where: {
      worksite: worksiteWhere,
      createdAt: { gte: dateFrom, lte: dateTo },
      responses: { some: {} },
    },
    select: {
      severity: true,
      createdAt: true,
      responses: {
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  const responseTimes: { severity: string; timeMs: number }[] = [];
  for (const a of alertsWithResponses) {
    if (a.responses.length === 0) continue;
    const ms = new Date(a.responses[0].createdAt).getTime() - new Date(a.createdAt).getTime();
    if (Number.isFinite(ms) && ms >= 0) {
      responseTimes.push({ severity: a.severity, timeMs: ms });
    }
  }

  const bySev: Record<string, number[]> = { HIGH: [], MEDIUM: [], LOW: [] };
  for (const r of responseTimes) {
    const k = r.severity as keyof typeof bySev;
    if (bySev[k]) bySev[k].push(r.timeMs);
  }

  const avgMin = (arr: number[]) =>
    arr.length === 0 ? 0 : Math.round((arr.reduce((s, t) => s + t, 0) / arr.length / 60000) * 10) / 10;

  const overall =
    responseTimes.length === 0
      ? 0
      : Math.round(
          (responseTimes.reduce((s, x) => s + x.timeMs, 0) / responseTimes.length / 60000) * 10
        ) / 10;

  return {
    violationsByType,
    cameraViolationHotspots,
    alertsByCamera,
    recentAlertsWithCamera,
    periodTotals: {
      safetyViolations: totalViolationsInPeriod,
      alerts: alertCountInPeriod,
    },
    alertsByType,
    safetyScoreTrend,
    responseTime: {
      overall,
      bySeverity: {
        HIGH: avgMin(bySev.HIGH),
        MEDIUM: avgMin(bySev.MEDIUM),
        LOW: avgMin(bySev.LOW),
      },
      sampleCount: responseTimes.length,
    },
    // trend additions
    alertVolumeByDay,
    alertsByHour,
    alertsBySeverity,
    resolutionStats,
    periodComparison,
    peakHour,
    worksiteName,
    dateRange: { from: dateFrom.toISOString(), to: dateTo.toISOString() },
  };
}

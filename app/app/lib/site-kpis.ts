/**
 * ONE source of truth for every per-site KPI shown anywhere in the app
 * (overview cards, sidebar, Site Management list, Reports, exports).
 *
 * Before this existed, each page counted alerts its own way (all-time count,
 * ACTIVE only, ACTIVE+ACKNOWLEDGED, last 50 fetched...), the worksite list
 * hard-coded safetyScore: null, and uptime defaulted to a fake 99.5%.
 * If a number needs to change, change it HERE and every page follows.
 *
 * Definitions (keep these in sync with the tooltips in the UI):
 *  - openAlerts      : status ACTIVE, ACKNOWLEDGED or ESCALATED (needs a human)
 *  - resolved30d     : alerts moved to RESOLVED in the last 30 days
 *  - violations24h   : alerts created in the last 24h, minus false positives
 *  - avgResolveMin   : mean minutes from alert creation to resolution, last 30 days
 *  - safetyScore     : latest SafetyScore row if calculated in the last 2 days,
 *                      otherwise live: 100 − 2 × real alerts in last 7 days (floor 0)
 *  - camerasOnline   : isCameraOnline() — same rule the camera tiles use
 *  - cameraUptime7d  : % of CameraHealth checks ONLINE over 7 days; null if no data
 *
 * Everything is batched (a handful of grouped queries for N sites) so the
 * worksite list doesn't fire per-site query bursts.
 */
import { prisma } from '@/app/lib/prisma';
import { isCameraOnline } from '@/app/lib/camera-status';

export const OPEN_ALERT_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'ESCALATED'] as const;
const NOT_REAL = ['FALSE_POSITIVE', 'ARCHIVED'] as const;

export type SiteKpis = {
  worksiteId: string;
  openAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
  resolved30d: number;
  violations24h: number;
  alerts7d: number;
  avgResolveMin: number | null;
  safetyScore: number | null;
  safetyScoreChange: number;
  safetyScoreSource: 'calculated' | 'live';
  camerasTotal: number;
  camerasOnline: number;
  camerasOffline: number;
  aiEnabledCameras: number;
  cameraUptime7d: number | null;
};

const H = 60 * 60 * 1000;

function normScore(raw: number | null | undefined): number | null {
  if (raw == null || Number.isNaN(Number(raw))) return null;
  const n = Number(raw);
  if (n > 0 && n <= 1) return Math.round(n * 1000) / 10;
  return Math.round(n * 10) / 10;
}

export function liveSafetyScore(realAlerts7d: number): number {
  return Math.max(0, Math.min(100, 100 - realAlerts7d * 2));
}

function countMap(rows: Array<{ worksiteId: string | null; _count: { _all: number } }>) {
  const m = new Map<string, number>();
  for (const r of rows) if (r.worksiteId) m.set(r.worksiteId, r._count._all);
  return m;
}

export async function getSiteKpis(worksiteIds: string[]): Promise<Map<string, SiteKpis>> {
  const out = new Map<string, SiteKpis>();
  const ids = [...new Set(worksiteIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const now = Date.now();
  const d1 = new Date(now - 24 * H);
  const d7 = new Date(now - 7 * 24 * H);
  const d30 = new Date(now - 30 * 24 * H);
  const d2 = new Date(now - 2 * 24 * H);
  const inSites = { worksiteId: { in: ids } };

  const [openBySev, resolved, v24, a7, resolveRows, scores, cameras] = await Promise.all([
    prisma.alert.groupBy({
      by: ['worksiteId', 'severity'],
      where: { ...inSites, status: { in: [...OPEN_ALERT_STATUSES] as any } },
      _count: { _all: true },
    }),
    prisma.alert.groupBy({
      by: ['worksiteId'],
      where: { ...inSites, status: 'RESOLVED' as any, resolvedAt: { gte: d30 } },
      _count: { _all: true },
    }),
    prisma.alert.groupBy({
      by: ['worksiteId'],
      where: { ...inSites, createdAt: { gte: d1 }, status: { notIn: [...NOT_REAL] as any } },
      _count: { _all: true },
    }),
    prisma.alert.groupBy({
      by: ['worksiteId'],
      where: { ...inSites, createdAt: { gte: d7 }, status: { notIn: [...NOT_REAL] as any } },
      _count: { _all: true },
    }),
    prisma.$queryRaw<Array<{ worksiteId: string; avg_min: number | null }>>`
      SELECT "worksiteId",
             AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 60.0)::float AS avg_min
      FROM "Alert"
      WHERE "worksiteId" = ANY(${ids})
        AND "resolvedAt" IS NOT NULL
        AND "resolvedAt" >= ${d30}
        AND "status" = 'RESOLVED'
      GROUP BY "worksiteId"`.catch(() => []),
    prisma.safetyScore
      .findMany({
        where: { ...inSites },
        orderBy: { date: 'desc' },
        take: ids.length * 2 + 10,
        select: { worksiteId: true, safetyScore: true, date: true, calculatedAt: true },
      })
      .catch(() => [] as any[]),
    prisma.camera.findMany({
      where: inSites,
      select: {
        id: true,
        worksiteId: true,
        status: true,
        metadata: true,
        health: { orderBy: { lastCheck: 'desc' }, take: 1, select: { status: true, lastCheck: true } },
      },
    }),
  ]);

  // Uptime: only if a heartbeat writer has actually produced CameraHealth rows.
  const cameraIds = cameras.map((c) => c.id);
  const uptimeRows = cameraIds.length
    ? await prisma.cameraHealth
        .groupBy({
          by: ['cameraId', 'status'],
          where: { cameraId: { in: cameraIds }, lastCheck: { gte: d7 } },
          _count: { _all: true },
        })
        .catch(() => [] as any[])
    : [];

  const resolvedM = countMap(resolved as any);
  const v24M = countMap(v24 as any);
  const a7M = countMap(a7 as any);
  const resolveM = new Map(resolveRows.map((r) => [r.worksiteId, r.avg_min]));

  for (const id of ids) {
    out.set(id, {
      worksiteId: id,
      openAlerts: 0, highAlerts: 0, mediumAlerts: 0, lowAlerts: 0,
      resolved30d: resolvedM.get(id) ?? 0,
      violations24h: v24M.get(id) ?? 0,
      alerts7d: a7M.get(id) ?? 0,
      avgResolveMin: resolveM.get(id) != null ? Math.round(Number(resolveM.get(id))) : null,
      safetyScore: null, safetyScoreChange: 0, safetyScoreSource: 'live',
      camerasTotal: 0, camerasOnline: 0, camerasOffline: 0, aiEnabledCameras: 0,
      cameraUptime7d: null,
    });
  }

  for (const r of openBySev as any[]) {
    const k = out.get(r.worksiteId);
    if (!k) continue;
    const n = r._count._all as number;
    k.openAlerts += n;
    const s = String(r.severity).toLowerCase();
    if (s === 'high' || s === 'critical') k.highAlerts += n;
    else if (s === 'medium') k.mediumAlerts += n;
    else k.lowAlerts += n;
  }

  // Safety score: take the two newest rows per site.
  const perSite = new Map<string, any[]>();
  for (const s of scores as any[]) {
    const arr = perSite.get(s.worksiteId) ?? [];
    if (arr.length < 2) arr.push(s);
    perSite.set(s.worksiteId, arr);
  }
  for (const [id, k] of out) {
    const rows = perSite.get(id) ?? [];
    const latest = rows[0];
    const fresh = latest && new Date(latest.calculatedAt ?? latest.date) >= d2;
    if (fresh) {
      k.safetyScore = normScore(latest.safetyScore);
      k.safetyScoreSource = 'calculated';
      const prev = normScore(rows[1]?.safetyScore);
      if (k.safetyScore != null && prev != null) {
        k.safetyScoreChange = Math.round((k.safetyScore - prev) * 10) / 10;
      }
    } else {
      k.safetyScore = liveSafetyScore(k.alerts7d);
      k.safetyScoreSource = 'live';
    }
  }

  const camSite = new Map<string, string>();
  for (const c of cameras) {
    if (!c.worksiteId) continue;
    camSite.set(c.id, c.worksiteId);
    const k = out.get(c.worksiteId);
    if (!k) continue;
    k.camerasTotal++;
    if (isCameraOnline(c as any)) k.camerasOnline++;
    else k.camerasOffline++;
    const md = c.metadata as any;
    if (md && typeof md === 'object' && md.aiEnabled === true) k.aiEnabledCameras++;
  }

  const up = new Map<string, { on: number; all: number }>();
  for (const r of uptimeRows as any[]) {
    const site = camSite.get(r.cameraId);
    if (!site) continue;
    const u = up.get(site) ?? { on: 0, all: 0 };
    u.all += r._count._all;
    if (r.status === 'ONLINE') u.on += r._count._all;
    up.set(site, u);
  }
  for (const [site, u] of up) {
    const k = out.get(site);
    if (k && u.all > 0) k.cameraUptime7d = Math.round((u.on / u.all) * 1000) / 10;
  }

  return out;
}

export async function getOneSiteKpis(worksiteId: string): Promise<SiteKpis | null> {
  const m = await getSiteKpis([worksiteId]);
  return m.get(worksiteId) ?? null;
}

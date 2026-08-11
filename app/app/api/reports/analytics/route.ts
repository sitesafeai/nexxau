import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';

const COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

function avg(arr: number[]) {
  return arr.length > 0 ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const daysRaw = searchParams.get('days') || '30';
    const days = Math.min(365, Math.max(1, parseInt(daysRaw, 10) || 30));

    if (!worksiteId) {
      return NextResponse.json({ success: false, error: 'worksiteId is required' }, { status: 400 });
    }

    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - days);
    dateFrom.setHours(0, 0, 0, 0);

    // Previous period for comparison
    const prevDateTo = new Date(dateFrom.getTime() - 1);
    const prevDateFrom = new Date(prevDateTo);
    prevDateFrom.setDate(prevDateFrom.getDate() - days);
    prevDateFrom.setHours(0, 0, 0, 0);

    // Fetch everything in parallel — same direct queries as site-summary
    const [worksite, alerts, prevAlertCount] = await Promise.all([
      prisma.worksite.findUnique({
        where: { id: worksiteId },
        select: { name: true, worksiteName: true },
      }),
      prisma.alert.findMany({
        where: { worksiteId, createdAt: { gte: dateFrom, lte: dateTo } },
        select: {
          id: true,
          title: true,
          severity: true,
          status: true,
          violationType: true,
          createdAt: true,
          resolvedAt: true,
          cameraId: true,
          camera: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.alert.count({
        where: { worksiteId, createdAt: { gte: prevDateFrom, lte: prevDateTo } },
      }),
    ]);

    const total = alerts.length;

    // ── Alert volume by day ──────────────────────────────────────────────────
    const dayMap = new Map<string, number>();
    for (const a of alerts) {
      const d = new Date(a.createdAt).toISOString().split('T')[0];
      dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    }
    const alertVolumeByDay = Array.from(dayMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({
        date,
        label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        count,
      }));

    // ── Alerts by hour ───────────────────────────────────────────────────────
    const hourMap = new Map<number, number>();
    for (const a of alerts) {
      const h = new Date(a.createdAt).getHours();
      hourMap.set(h, (hourMap.get(h) ?? 0) + 1);
    }
    const alertsByHour = Array.from({ length: 24 }, (_, h) => ({
      hour: h,
      label: h === 0 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`,
      count: hourMap.get(h) ?? 0,
    }));
    const peakHourEntry = alertsByHour.reduce(
      (max, cur) => (cur.count > max.count ? cur : max),
      { hour: 0, count: -1 }
    );
    const peakHour = peakHourEntry.count > 0 ? peakHourEntry.hour : null;

    // ── Alerts by severity ───────────────────────────────────────────────────
    const sevMap = new Map<string, number>();
    for (const a of alerts) {
      const s = a.severity ?? 'MEDIUM';
      sevMap.set(s, (sevMap.get(s) ?? 0) + 1);
    }
    const alertsBySeverity = (['HIGH', 'MEDIUM', 'LOW'] as const).map(severity => ({
      severity,
      count: sevMap.get(severity) ?? 0,
      percentage: total > 0 ? Math.round(((sevMap.get(severity) ?? 0) / total) * 100) : 0,
    }));

    // ── Resolution stats ─────────────────────────────────────────────────────
    const resolvedAlerts = alerts.filter(a => a.status === 'RESOLVED' && a.resolvedAt);
    const resolutionMinutes = resolvedAlerts
      .map(a => (new Date(a.resolvedAt!).getTime() - new Date(a.createdAt).getTime()) / 60000)
      .filter(m => m > 0);
    const avgResolutionMinutes = avg(resolutionMinutes);

    const resolved     = resolvedAlerts.length;
    const falsePositive = alerts.filter(a => a.status === 'FALSE_POSITIVE').length;
    const active       = alerts.filter(a => a.status === 'ACTIVE').length;

    const resolutionStats = {
      total,
      resolved,
      falsePositive,
      active,
      resolvedPct: total > 0 ? Math.round((resolved / total) * 100) : 0,
      avgResolutionMinutes,
    };

    // ── Period comparison ────────────────────────────────────────────────────
    const alertChangePct =
      prevAlertCount > 0
        ? Math.round(((total - prevAlertCount) / prevAlertCount) * 100)
        : total > 0
        ? 100
        : 0;
    const periodComparison = {
      currentAlerts:      total,
      previousAlerts:     prevAlertCount,
      alertChangePct,
      currentViolations:  total,
      previousViolations: prevAlertCount,
      violationChangePct: alertChangePct,
    };

    // ── Alerts by type ───────────────────────────────────────────────────────
    const typeMap = new Map<string, number>();
    for (const a of alerts) {
      const t = a.violationType ?? 'Unknown';
      typeMap.set(t, (typeMap.get(t) ?? 0) + 1);
    }
    const alertsByType = Array.from(typeMap.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({ type, count }));

    // Violations by type — same as alertsByType, with colors
    const violationsByType = alertsByType.map(({ type, count }, i) => ({
      type,
      count,
      color: COLORS[i % COLORS.length],
    }));

    // ── Alerts by camera ─────────────────────────────────────────────────────
    const camMap = new Map<string, { name: string; count: number }>();
    for (const a of alerts) {
      if (a.cameraId && a.camera) {
        const cur = camMap.get(a.cameraId);
        if (cur) { cur.count++; }
        else { camMap.set(a.cameraId, { name: a.camera.name, count: 1 }); }
      }
    }
    const alertsWithCamera = Array.from(camMap.values()).reduce((s, c) => s + c.count, 0);
    const alertsByCamera = Array.from(camMap.entries())
      .sort(([, a], [, b]) => b.count - a.count)
      .map(([cameraId, { name, count }]) => ({
        cameraId,
        name,
        count,
        percentageOfAlertsWithCamera:
          alertsWithCamera > 0 ? Math.round((count / alertsWithCamera) * 100) : 0,
      }));

    // ── Camera violation hotspots ────────────────────────────────────────────
    const siteName = worksite?.worksiteName ?? worksite?.name ?? '';
    const cameraViolationHotspots = alertsByCamera.map(c => ({
      cameraId:         c.cameraId,
      name:             c.name,
      site:             siteName,
      total:            c.count,
      byType:           alertsByType.slice(0, 3),
      percentageOfSite: total > 0 ? Math.round((c.count / total) * 100) : 0,
    }));

    // ── Recent alerts with camera ────────────────────────────────────────────
    const recentAlertsWithCamera = alerts.slice(0, 10).map(a => ({
      id:         a.id,
      title:      a.title,
      createdAt:  a.createdAt.toISOString(),
      cameraName: a.camera?.name ?? null,
    }));

    // ── Period totals ────────────────────────────────────────────────────────
    const activeAlerts = alerts.filter(a => a.status === 'ACTIVE').length;
    const periodTotals = { safetyViolations: total, alerts: total, activeAlerts };

    // ── Safety score trend ───────────────────────────────────────────────────
    let safetyScoreTrend: { date: string; label: string; safetyScore: number }[] = [];
    try {
      const scores = await prisma.safetyScore.findMany({
        where:   { worksiteId, date: { gte: dateFrom, lte: dateTo } },
        orderBy: { date: 'asc' },
        select:  { date: true, safetyScore: true },
      });
      safetyScoreTrend = scores.map(s => {
        const raw = s.safetyScore as number;
        return {
          date:        s.date.toISOString().split('T')[0],
          label:       new Date(s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          safetyScore: raw > 0 && raw <= 1 ? Math.round(raw * 100) : Math.round(raw),
        };
      });
    } catch (_) {
      // SafetyScore table may not exist in this environment — safe to skip
    }

    // ── Response time by severity ────────────────────────────────────────────
    const rtBySev: Record<'HIGH' | 'MEDIUM' | 'LOW', number[]> = { HIGH: [], MEDIUM: [], LOW: [] };
    for (const a of resolvedAlerts) {
      if (!a.resolvedAt) continue;
      const min = (new Date(a.resolvedAt).getTime() - new Date(a.createdAt).getTime()) / 60000;
      if (min > 0 && (a.severity === 'HIGH' || a.severity === 'MEDIUM' || a.severity === 'LOW')) {
        rtBySev[a.severity].push(min);
      }
    }
    const responseTime = {
      overall:      avgResolutionMinutes,
      bySeverity:   { HIGH: avg(rtBySev.HIGH), MEDIUM: avg(rtBySev.MEDIUM), LOW: avg(rtBySev.LOW) },
      sampleCount:  resolvedAlerts.length,
    };

    return NextResponse.json({
      success: true,
      data: {
        violationsByType,
        cameraViolationHotspots,
        alertsByCamera,
        recentAlertsWithCamera,
        periodTotals,
        alertsByType,
        safetyScoreTrend,
        responseTime,
        alertVolumeByDay,
        alertsByHour,
        alertsBySeverity,
        resolutionStats,
        periodComparison,
        peakHour,
        worksiteName: siteName,
        dateRange:    { from: dateFrom.toISOString(), to: dateTo.toISOString() },
        days,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics data';
    console.error('[Reports Analytics API] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

'use client';

import { useState, useEffect, useCallback } from 'react';

// ── Types (mirroring worksite-report-analytics.ts) ───────────────────────────
type TrendPoint            = { date: string; label: string; safetyScore: number };
type AlertVolumePoint      = { date: string; label: string; count: number };
type AlertHourPoint        = { hour: number; label: string; count: number };
type AlertSeverityRow      = { severity: 'HIGH' | 'MEDIUM' | 'LOW'; count: number; percentage: number };
type ResolutionStats       = { total: number; resolved: number; falsePositive: number; active: number; resolvedPct: number; avgResolutionMinutes: number };
type PeriodComparison      = { currentAlerts: number; previousAlerts: number; alertChangePct: number; currentViolations: number; previousViolations: number; violationChangePct: number };
type CameraViolationHotspot = { cameraId: string; name: string; site: string; total: number; byType: { type: string; count: number }[]; percentageOfSite: number };
type AlertCameraSummary    = { cameraId: string; name: string; count: number; percentageOfAlertsWithCamera: number };
type RecentAlertRow        = { id: string; title: string; createdAt: string; cameraName: string | null };
type AlertTypeRow          = { type: string; count: number };
type ViolationRow          = { type: string; count: number; color: string };

interface WorksiteAnalyticsChartsProps {
  siteFilter?: string | null;
  showPdfDownload?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function fmtHour(h: number) {
  if (h === 0)  return '12am';
  if (h === 12) return '12pm';
  return h < 12 ? `${h}am` : `${h - 12}pm`;
}

function ChangeChip({ pct, invert = false }: { pct: number; invert?: boolean }) {
  // invert=true means "more = worse" (alerts, violations)
  const isNeutral  = pct === 0;
  const isPositive = invert ? pct < 0 : pct > 0;
  const cls = isNeutral
    ? 'text-slate-400 bg-slate-700/50'
    : isPositive
    ? 'text-emerald-400 bg-emerald-500/15'
    : 'text-red-400 bg-red-500/15';
  const arrow = isNeutral ? '—' : pct > 0 ? '↑' : '↓';
  return (
    <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${cls}`}>
      {arrow}{Math.abs(pct)}%
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function WorksiteAnalyticsCharts({
  siteFilter,
  showPdfDownload = true,
}: WorksiteAnalyticsChartsProps) {
  const [loading,                setLoading]                = useState(true);
  const [trendDays,              setTrendDays]              = useState(30);
  const [trendData,              setTrendData]              = useState<TrendPoint[]>([]);
  const [alertVolumeByDay,       setAlertVolumeByDay]       = useState<AlertVolumePoint[]>([]);
  const [alertsByHour,           setAlertsByHour]           = useState<AlertHourPoint[]>([]);
  const [alertsBySeverity,       setAlertsBySeverity]       = useState<AlertSeverityRow[]>([]);
  const [resolutionStats,        setResolutionStats]        = useState<ResolutionStats | null>(null);
  const [periodComparison,       setPeriodComparison]       = useState<PeriodComparison | null>(null);
  const [peakHour,               setPeakHour]               = useState<number | null>(null);
  const [cameraViolationHotspots,setCameraViolationHotspots] = useState<CameraViolationHotspot[]>([]);
  const [alertsByCamera,         setAlertsByCamera]         = useState<AlertCameraSummary[]>([]);
  const [recentAlertsWithCamera, setRecentAlertsWithCamera] = useState<RecentAlertRow[]>([]);
  const [periodTotals,           setPeriodTotals]           = useState<{ safetyViolations: number; alerts: number }>({ safetyViolations: 0, alerts: 0 });
  const [alertsByType,           setAlertsByType]           = useState<AlertTypeRow[]>([]);
  const [violationsByType,       setViolationsByType]       = useState<ViolationRow[]>([]);
  const [responseTime,           setResponseTime]           = useState<{ overall: number; bySeverity: { HIGH: number; MEDIUM: number; LOW: number }; sampleCount: number }>({ overall: 0, bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 }, sampleCount: 0 });
  const [pdfLoading,             setPdfLoading]             = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!siteFilter) { setLoading(false); return; }
    try {
      setLoading(true);
      const res  = await fetch(`/api/reports/analytics?worksiteId=${siteFilter}&days=${trendDays}`);
      const json = await res.json();
      if (!json.success) {
        console.error('[WorksiteAnalyticsCharts] API error:', res.status, json.error);
      }
      if (json.success && json.data) {
        const d = json.data;
        setViolationsByType(d.violationsByType          || []);
        setCameraViolationHotspots(d.cameraViolationHotspots || []);
        setAlertsByCamera(d.alertsByCamera              || []);
        setRecentAlertsWithCamera(d.recentAlertsWithCamera || []);
        setPeriodTotals(d.periodTotals                  || { safetyViolations: 0, alerts: 0 });
        setAlertsByType(d.alertsByType                  || []);
        setTrendData(d.safetyScoreTrend                 || []);
        setResponseTime(d.responseTime                  || { overall: 0, bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 }, sampleCount: 0 });
        // trend additions
        setAlertVolumeByDay(d.alertVolumeByDay          || []);
        setAlertsByHour(d.alertsByHour                  || []);
        setAlertsBySeverity(d.alertsBySeverity          || []);
        setResolutionStats(d.resolutionStats             || null);
        setPeriodComparison(d.periodComparison           || null);
        setPeakHour(d.peakHour ?? null);
      }
    } catch (e) {
      console.error('[WorksiteAnalyticsCharts] fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [siteFilter, trendDays]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const handleDownloadPdf = async () => {
    if (!siteFilter) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/reports/worksite-pdf?worksiteId=${siteFilter}&days=${trendDays}`);
      if (!res.ok) { const e = await res.json().catch(() => ({})); alert(e.error || 'Failed to generate PDF'); return; }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = Object.assign(document.createElement('a'), { href: url, download: 'nexxau-worksite-report.pdf' });
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Failed to download PDF'); }
    finally { setPdfLoading(false); }
  };

  if (!siteFilter) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center text-slate-400">
        Select a worksite to load safety analytics and PDF export.
      </div>
    );
  }

  // Derived chart data
  const safetyPoints  = trendData.length > 0 ? (trendData.length > 24 ? trendData.slice(-24) : trendData) : [];
  const volumePoints  = alertVolumeByDay.length > 0 ? (alertVolumeByDay.length > 45 ? alertVolumeByDay.slice(-45) : alertVolumeByDay) : [];
  const maxVolume     = volumePoints.reduce((m, p) => Math.max(m, p.count), 1);
  const maxHour       = alertsByHour.reduce((m, h) => Math.max(m, h.count), 1);

  const SEV_COLORS: Record<string, string> = {
    HIGH:   'bg-red-500',
    MEDIUM: 'bg-amber-500',
    LOW:    'bg-emerald-500',
  };
  const SEV_TEXT: Record<string, string> = {
    HIGH:   'text-red-400',
    MEDIUM: 'text-amber-400',
    LOW:    'text-emerald-400',
  };

  return (
    <div className="space-y-6">

      {/* ── Header row ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Trend Analysis</h2>
          <p className="text-sm text-slate-500">
            Alerts use creation time · Violations use detection time · Comparing current vs previous equal period.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={trendDays}
            onChange={e => setTrendDays(Number(e.target.value))}
            className="rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1.5 text-sm text-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
          {showPdfDownload && (
            <button
              onClick={handleDownloadPdf}
              disabled={pdfLoading || loading}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-1.5 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:opacity-50"
            >
              {pdfLoading
                ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />Generating…</>
                : <>↓ PDF</>}
            </button>
          )}
        </div>
      </div>

      {/* ── KPI summary cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total alerts */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Alerts</p>
          <p className="text-2xl font-bold text-white">{loading ? '…' : periodTotals.alerts}</p>
          {!loading && periodComparison && (
            <div className="flex items-center gap-1.5 mt-1">
              <ChangeChip pct={periodComparison.alertChangePct} invert />
              <span className="text-[11px] text-slate-500">vs prev period</span>
            </div>
          )}
        </div>
        {/* Violations */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Violations</p>
          <p className="text-2xl font-bold text-white">{loading ? '…' : periodTotals.safetyViolations}</p>
          {!loading && periodComparison && (
            <div className="flex items-center gap-1.5 mt-1">
              <ChangeChip pct={periodComparison.violationChangePct} invert />
              <span className="text-[11px] text-slate-500">vs prev period</span>
            </div>
          )}
        </div>
        {/* Resolution rate */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Resolved</p>
          <p className="text-2xl font-bold text-white">
            {loading ? '…' : resolutionStats ? `${resolutionStats.resolvedPct}%` : '—'}
          </p>
          {!loading && resolutionStats && (
            <p className="text-[11px] text-slate-500 mt-1">{resolutionStats.resolved} of {resolutionStats.total} alerts</p>
          )}
        </div>
        {/* Peak hour */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Peak Hour</p>
          <p className="text-2xl font-bold text-white">
            {loading ? '…' : peakHour !== null ? fmtHour(peakHour) : '—'}
          </p>
          {!loading && peakHour !== null && (
            <p className="text-[11px] text-slate-500 mt-1">{alertsByHour[peakHour]?.count ?? 0} alerts at this hour</p>
          )}
        </div>
      </div>

      {/* ── Row 1: Safety score trend + Alert volume by day ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* Safety score trend */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-4 text-base font-semibold text-white">Safety Score Trend</h3>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : safetyPoints.length === 0 ? (
            <div className="text-sm text-slate-400 space-y-1">
              <p>No safety score data yet.</p>
              <p className="text-xs text-slate-500">Run a safety score calculation from the overview page or wait for the scheduled job.</p>
            </div>
          ) : (
            <div className="relative h-44 pl-9">
              <div className="absolute bottom-0 left-0 top-0 flex w-8 flex-col justify-between text-xs text-slate-500">
                <span>100</span><span>50</span><span>0</span>
              </div>
              <div className="flex h-full items-end justify-between gap-px sm:gap-0.5">
                {safetyPoints.map((p, i) => (
                  <div key={`${p.date}-${i}`} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                    <div
                      title={`${p.date}\nScore: ${p.safetyScore.toFixed(1)}`}
                      className="w-full min-w-[4px] rounded-t bg-gradient-to-t from-blue-500/60 to-blue-400/25 hover:from-blue-400/80 transition"
                      style={{ height: `${Math.max(4, (p.safetyScore / 100) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {safetyPoints.length > 0 && (
            <div className="mt-2 flex justify-between text-[10px] text-slate-500">
              <span>{safetyPoints[0]?.label}</span>
              <span>{safetyPoints[safetyPoints.length - 1]?.label}</span>
            </div>
          )}
        </div>

        {/* Alert volume by day */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-base font-semibold text-white">Alert Volume</h3>
          <p className="mb-4 text-xs text-slate-500">Alerts created per day — bars taller = more alerts that day.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : volumePoints.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts in this period.</p>
          ) : (
            <div className="relative h-44 pl-9">
              <div className="absolute bottom-0 left-0 top-0 flex w-8 flex-col justify-between text-xs text-slate-500">
                <span>{maxVolume}</span>
                <span>{Math.round(maxVolume / 2)}</span>
                <span>0</span>
              </div>
              <div className="flex h-full items-end justify-between gap-px sm:gap-0.5">
                {volumePoints.map((p, i) => {
                  const pct = maxVolume > 0 ? (p.count / maxVolume) * 100 : 0;
                  const color = p.count === 0
                    ? 'bg-slate-700/40'
                    : p.count >= maxVolume * 0.75
                    ? 'bg-gradient-to-t from-red-500/70 to-red-400/30'
                    : p.count >= maxVolume * 0.4
                    ? 'bg-gradient-to-t from-amber-500/70 to-amber-400/30'
                    : 'bg-gradient-to-t from-emerald-500/60 to-emerald-400/25';
                  return (
                    <div key={`${p.date}-${i}`} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                      <div
                        title={`${p.label}\n${p.count} alert${p.count !== 1 ? 's' : ''}`}
                        className={`w-full min-w-[4px] rounded-t transition hover:opacity-80 ${color}`}
                        style={{ height: `${Math.max(p.count > 0 ? 6 : 2, pct)}%` }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {volumePoints.length > 0 && (
            <div className="mt-2 flex justify-between text-[10px] text-slate-500">
              <span>{volumePoints[0]?.label}</span>
              <span>{volumePoints[volumePoints.length - 1]?.label}</span>
            </div>
          )}
          {volumePoints.length > 0 && (
            <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500/70 inline-block" />High day</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500/70 inline-block" />Med day</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-emerald-500/60 inline-block" />Low day</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Row 2: Severity breakdown + Peak hours heatmap ──────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">

        {/* Severity breakdown */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-base font-semibold text-white">Alert Severity Breakdown</h3>
          <p className="mb-4 text-xs text-slate-500">Distribution of alert severity for this period.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : alertsBySeverity.every(s => s.count === 0) ? (
            <p className="text-sm text-slate-500">No alerts in this period.</p>
          ) : (
            <div className="space-y-4">
              {alertsBySeverity.map(s => (
                <div key={s.severity}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-sm font-semibold ${SEV_TEXT[s.severity]}`}>{s.severity}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{s.count}</span>
                      <span className="text-xs text-slate-500">{s.percentage}%</span>
                    </div>
                  </div>
                  <div className="h-3 rounded-full bg-slate-700/50 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${SEV_COLORS[s.severity]}`}
                      style={{ width: `${Math.max(s.percentage, s.count > 0 ? 2 : 0)}%` }}
                    />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-slate-700/40">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Total alerts this period</span>
                  <span className="font-bold text-white">{periodTotals.alerts}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 24-hour heatmap */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-base font-semibold text-white">Peak Activity Hours</h3>
          <p className="mb-4 text-xs text-slate-500">When do most alerts fire? Brighter = more alerts at that hour.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : alertsByHour.every(h => h.count === 0) ? (
            <p className="text-sm text-slate-500">No alerts in this period.</p>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-1">
                {alertsByHour.map(h => {
                  const intensity = maxHour > 0 ? h.count / maxHour : 0;
                  const bg = h.count === 0
                    ? 'bg-slate-700/30'
                    : intensity >= 0.8
                    ? 'bg-red-500'
                    : intensity >= 0.5
                    ? 'bg-amber-500'
                    : intensity >= 0.25
                    ? 'bg-amber-500/60'
                    : 'bg-blue-500/40';
                  return (
                    <div
                      key={h.hour}
                      title={`${h.label}: ${h.count} alert${h.count !== 1 ? 's' : ''}`}
                      className={`h-8 rounded ${bg} transition cursor-default`}
                    />
                  );
                })}
              </div>
              <div className="mt-2 grid grid-cols-4 text-[10px] text-slate-500">
                <span>12am</span><span className="text-center">6am</span>
                <span className="text-center">12pm</span><span className="text-right">11pm</span>
              </div>
              {peakHour !== null && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  <span className="text-slate-300">
                    Busiest hour: <span className="font-semibold text-white">{fmtHour(peakHour)}</span>
                    {' '}({alertsByHour[peakHour]?.count ?? 0} alerts)
                  </span>
                </div>
              )}
              <div className="mt-2 flex items-center gap-3 text-[10px] text-slate-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" />High</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />Med</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500/40 inline-block" />Low</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-slate-700/30 inline-block" />None</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Row 3: Camera analysis ───────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-base font-semibold text-white">Top Cameras — Violations</h3>
          <p className="mb-4 text-xs text-slate-500">Cameras with the most safety detection violations. % = share of all violations at this site.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : cameraViolationHotspots.length === 0 ? (
            <p className="text-sm text-slate-500">No violation records with a camera in this window.</p>
          ) : (
            <div className="max-h-72 space-y-4 overflow-y-auto pr-1">
              {cameraViolationHotspots.map((h, i) => (
                <div key={h.cameraId + i} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white text-sm">{h.name}</span>
                    <span className="text-xs text-amber-200/90">{h.total} · {h.percentageOfSite}% of site</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-amber-600 to-rose-500" style={{ width: `${Math.min(100, h.percentageOfSite)}%` }} />
                  </div>
                  <ul className="mt-2 space-y-0.5 text-xs text-slate-400">
                    {h.byType.map(t => (
                      <li key={t.type} className="flex justify-between gap-2">
                        <span className="truncate">{t.type}</span>
                        <span className="shrink-0 text-slate-300">{t.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-base font-semibold text-white">Top Cameras — Alerts</h3>
          <p className="mb-4 text-xs text-slate-500">Cameras that triggered the most alerts. % = share of all alerts.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : alertsByCamera.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts with a camera assigned in this window.</p>
          ) : (
            <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
              {alertsByCamera.map((h, i) => (
                <div key={h.cameraId + i} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white text-sm">{h.name}</span>
                    <span className="text-xs text-sky-200/90">{h.count} alerts · {h.percentageOfAlertsWithCamera}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div className="h-full rounded-full bg-gradient-to-r from-sky-600 to-indigo-500" style={{ width: `${Math.min(100, h.percentageOfAlertsWithCamera)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Row 4: Alert types + Resolution funnel + Response time ──────────── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">

        {/* Most frequent alert types */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Most Frequent Alerts</h3>
          <p className="mb-4 text-xs text-slate-500">Top alert types by title — highest volume first.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : alertsByType.length === 0 ? (
            <p className="text-sm text-slate-400">No alerts in this period.</p>
          ) : (
            <div className="space-y-2">
              {alertsByType.slice(0, 8).map((a, i) => {
                const maxCount = alertsByType[0]?.count || 1;
                const barPct   = Math.round((a.count / maxCount) * 100);
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5 text-sm">
                      <span className="truncate text-slate-300 text-xs" title={a.type}>{a.type}</span>
                      <span className="shrink-0 font-medium text-white text-xs ml-2">{a.count}</span>
                    </div>
                    <div className="h-1 rounded-full bg-slate-700/50">
                      <div className="h-full rounded-full bg-blue-500/60" style={{ width: `${barPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Resolution funnel */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Resolution Funnel</h3>
          <p className="mb-4 text-xs text-slate-500">What happened to the alerts that were raised?</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : !resolutionStats || resolutionStats.total === 0 ? (
            <p className="text-sm text-slate-400">No alerts in this period.</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'Total raised',   count: resolutionStats.total,        color: 'bg-slate-500' },
                { label: 'Resolved',       count: resolutionStats.resolved,      color: 'bg-emerald-500' },
                { label: 'False positive', count: resolutionStats.falsePositive, color: 'bg-blue-500' },
                { label: 'Still active',   count: resolutionStats.active,        color: 'bg-amber-500' },
              ].map(row => {
                const pct = resolutionStats.total > 0 ? Math.round((row.count / resolutionStats.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="text-slate-400">{row.label}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-white">{row.count}</span>
                        <span className="text-slate-500">{pct}%</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-700/50">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(pct, row.count > 0 ? 3 : 0)}%` }} />
                    </div>
                  </div>
                );
              })}
              {resolutionStats.avgResolutionMinutes > 0 && (
                <div className="pt-2 border-t border-slate-700/40 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Avg resolution time</span>
                    <span className="font-semibold text-white">{resolutionStats.avgResolutionMinutes} min</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Response time */}
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Avg Response Time</h3>
          <p className="mb-3 text-xs text-slate-500">Minutes from alert created → first response. {responseTime.sampleCount} sample{responseTime.sampleCount !== 1 ? 's' : ''}.</p>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-400">
                {loading ? '…' : responseTime.overall > 0 ? responseTime.overall.toFixed(1) : '—'}
              </p>
              <p className="text-xs text-slate-400">minutes overall</p>
            </div>
            <div className="space-y-2">
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map(sev => (
                <div key={sev} className="flex justify-between text-sm">
                  <span className={`text-xs ${SEV_TEXT[sev]}`}>{sev}</span>
                  <span className="text-slate-200 text-xs">
                    {loading ? '…' : responseTime.bySeverity[sev] > 0 ? `${responseTime.bySeverity[sev].toFixed(1)} min` : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Violations by type grid ──────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
        <h3 className="mb-1 text-sm font-semibold text-white">Violations by Type</h3>
        <p className="mb-4 text-xs text-slate-500">Detection-based violations in this period.</p>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : violationsByType.length === 0 ? (
          <p className="text-sm text-slate-400">No violations recorded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {violationsByType.map((item, i) => {
              const maxCount = violationsByType[0]?.count || 1;
              return (
                <div key={i} className="rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                      <span className="truncate text-xs text-slate-300">{item.type}</span>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-white ml-2">{item.count}</span>
                  </div>
                  <div className="h-1 rounded-full bg-slate-700/50">
                    <div className={`h-full rounded-full ${item.color} opacity-60`} style={{ width: `${Math.round((item.count / maxCount) * 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Recent alerts ────────────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
        <h3 className="mb-1 text-sm font-semibold text-white">Recent Alerts</h3>
        <p className="mb-4 text-xs text-slate-500">Newest first — camera that raised the alert when available.</p>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : recentAlertsWithCamera.length === 0 ? (
          <p className="text-sm text-slate-500">No alerts in this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[320px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-700/60 text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-3 font-medium">Time</th>
                  <th className="pb-2 pr-3 font-medium">Alert</th>
                  <th className="pb-2 font-medium">Camera</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {recentAlertsWithCamera.map(r => (
                  <tr key={r.id} className="text-slate-300">
                    <td className="whitespace-nowrap py-2 pr-3 align-top text-xs text-slate-500">
                      {new Date(r.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="max-w-[200px] py-2 pr-3 align-top text-slate-200 text-xs">{r.title}</td>
                    <td className="py-2 align-top text-slate-400 text-xs">{r.cameraName ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

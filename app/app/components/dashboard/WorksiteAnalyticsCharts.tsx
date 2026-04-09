'use client';

import { useState, useEffect, useCallback } from 'react';

type TrendPoint = { date: string; label: string; safetyScore: number };
type CameraViolationHotspot = {
  cameraId: string;
  name: string;
  site: string;
  total: number;
  byType: { type: string; count: number }[];
  percentageOfSite: number;
};
type AlertCameraSummary = {
  cameraId: string;
  name: string;
  count: number;
  percentageOfAlertsWithCamera: number;
};
type RecentAlertRow = { id: string; title: string; createdAt: string; cameraName: string | null };
type AlertTypeRow = { type: string; count: number };
type ViolationRow = { type: string; count: number; color: string };

interface WorksiteAnalyticsChartsProps {
  /** When missing, analytics are hidden (caller may show a prompt). */
  siteFilter?: string | null;
  /** Compact top bar with PDF download */
  showPdfDownload?: boolean;
}

export default function WorksiteAnalyticsCharts({
  siteFilter,
  showPdfDownload = true,
}: WorksiteAnalyticsChartsProps) {
  const [loading, setLoading] = useState(true);
  const [trendDays, setTrendDays] = useState(30);
  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [cameraViolationHotspots, setCameraViolationHotspots] = useState<CameraViolationHotspot[]>([]);
  const [alertsByCamera, setAlertsByCamera] = useState<AlertCameraSummary[]>([]);
  const [recentAlertsWithCamera, setRecentAlertsWithCamera] = useState<RecentAlertRow[]>([]);
  const [periodTotals, setPeriodTotals] = useState<{ safetyViolations: number; alerts: number }>({
    safetyViolations: 0,
    alerts: 0,
  });
  const [alertsByType, setAlertsByType] = useState<AlertTypeRow[]>([]);
  const [violationsByType, setViolationsByType] = useState<ViolationRow[]>([]);
  const [responseTime, setResponseTime] = useState<{
    overall: number;
    bySeverity: { HIGH: number; MEDIUM: number; LOW: number };
    sampleCount: number;
  }>({
    overall: 0,
    bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
    sampleCount: 0,
  });
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    if (!siteFilter) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`/api/reports/analytics?worksiteId=${siteFilter}&days=${trendDays}`);
      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        setViolationsByType(d.violationsByType || []);
        setCameraViolationHotspots(d.cameraViolationHotspots || []);
        setAlertsByCamera(d.alertsByCamera || []);
        setRecentAlertsWithCamera(d.recentAlertsWithCamera || []);
        setPeriodTotals(
          d.periodTotals || {
            safetyViolations: 0,
            alerts: 0,
          }
        );
        setAlertsByType(d.alertsByType || []);
        setTrendData(d.safetyScoreTrend || []);
        setResponseTime(
          d.responseTime || {
            overall: 0,
            bySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
            sampleCount: 0,
          }
        );
      }
    } catch (e) {
      console.error('Worksite analytics fetch failed:', e);
    } finally {
      setLoading(false);
    }
  }, [siteFilter, trendDays]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleDownloadPdf = async () => {
    if (!siteFilter) return;
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/reports/worksite-pdf?worksiteId=${siteFilter}&days=${trendDays}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to generate PDF');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexxau-worksite-report.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  if (!siteFilter) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 text-center text-slate-400">
        Select a worksite to load safety analytics and PDF export.
      </div>
    );
  }

  const chartPoints = trendData.length > 0 ? trendData : [];
  const displayPoints = chartPoints.length > 24 ? chartPoints.slice(-24) : chartPoints;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Site analytics</h2>
          <p className="text-sm text-slate-500">
            Detection rows use detection time; alerts use creation time. Safety score matches the dashboard when
            published scores exist.
          </p>
        </div>
        {showPdfDownload && (
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={pdfLoading || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pdfLoading ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                Generating…
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                Download PDF summary
              </>
            )}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-white">Safety score trend</h3>
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(Number(e.target.value))}
              className="rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-1.5 text-sm text-white"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : displayPoints.length === 0 ? (
            <div className="space-y-2 text-sm text-slate-400">
              <p>No daily safety score data to show.</p>
              <p className="text-xs text-slate-500">
                When the overview shows N/A, run a safety score calculation (or wait for the scheduled job) before a
                trend appears here.
              </p>
            </div>
          ) : (
            <div className="relative h-52 pl-9">
              <div className="absolute bottom-0 left-0 top-0 flex w-8 flex-col justify-between text-xs text-slate-500">
                <span>100</span>
                <span>50</span>
                <span>0</span>
              </div>
              <div className="flex h-full items-end justify-between gap-px sm:gap-0.5">
                {displayPoints.map((data, i) => (
                  <div key={`${data.date}-${i}`} className="flex min-w-0 flex-1 flex-col items-center justify-end">
                    <div
                      role="img"
                      aria-label={`${data.label}: score ${data.safetyScore.toFixed(1)}`}
                      title={`${data.date}\nScore: ${data.safetyScore.toFixed(1)}`}
                      className="w-full min-w-[4px] rounded-t bg-gradient-to-t from-blue-500/60 to-blue-400/25 transition hover:from-blue-400/80 hover:to-blue-300/40"
                      style={{ height: `${Math.max(4, (data.safetyScore / 100) * 100)}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          {displayPoints.length > 0 && (
            <div className="mt-2 flex flex-wrap justify-between gap-1 text-[10px] text-slate-500">
              {displayPoints
                .filter((_, i) => i % Math.ceil(displayPoints.length / 6) === 0)
                .map((d, i) => (
                  <span key={i}>{d.label}</span>
                ))}
            </div>
          )}
          <p className="mt-2 text-xs text-slate-600">Hover a bar for date and score.</p>
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-lg font-semibold text-white">Detection violations by camera</h3>
          <p className="mb-4 text-sm text-slate-500">
            From the safety violation log (model detections). Share is % of all detection violations this period.
          </p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : cameraViolationHotspots.length === 0 ? (
            <p className="text-sm text-slate-500">
              No rows in this period with a camera on the violation record. Alerts below still show which camera raised
              each alert when the alert has a camera.
            </p>
          ) : (
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {cameraViolationHotspots.map((h, i) => (
                <div key={h.cameraId + i} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white" title={h.name}>
                      {h.name}
                    </span>
                    <span className="text-sm text-amber-200/90">
                      {h.total} total · {h.percentageOfSite}% of site
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-600 to-rose-500"
                      style={{ width: `${Math.min(100, h.percentageOfSite)}%` }}
                    />
                  </div>
                  <ul className="mt-2 space-y-1 text-xs text-slate-400">
                    {h.byType.map((t) => (
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
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-lg font-semibold text-white">Alerts by camera</h3>
          <p className="mb-4 text-sm text-slate-500">
            Counts from alert records with a camera. % is share of all alerts this period.
          </p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : alertsByCamera.length === 0 ? (
            <p className="text-sm text-slate-500">
              No alerts have a camera assigned in this window. If you expect data here, confirm alerts are created with{' '}
              <code className="rounded bg-slate-900/80 px-1 text-xs text-slate-300">cameraId</code> set.
            </p>
          ) : (
            <div className="max-h-80 space-y-4 overflow-y-auto pr-1">
              {alertsByCamera.map((h, i) => (
                <div key={h.cameraId + i} className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-white" title={h.name}>
                      {h.name}
                    </span>
                    <span className="text-sm text-sky-200/90">
                      {h.count} alerts · {h.percentageOfAlertsWithCamera}% of all alerts
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-700">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-600 to-indigo-500"
                      style={{ width: `${Math.min(100, h.percentageOfAlertsWithCamera)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-lg font-semibold text-white">Recent alerts</h3>
          <p className="mb-4 text-sm text-slate-500">Newest first — camera that raised the alert when available.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : recentAlertsWithCamera.length === 0 ? (
            <p className="text-sm text-slate-500">No alerts in this period.</p>
          ) : (
            <div className="max-h-80 overflow-x-auto overflow-y-auto pr-1">
              <table className="w-full min-w-[280px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-700/60 text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-2 font-medium">Time</th>
                    <th className="pb-2 pr-2 font-medium">Alert</th>
                    <th className="pb-2 font-medium">Camera</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {recentAlertsWithCamera.map((r) => (
                    <tr key={r.id} className="text-slate-300">
                      <td className="whitespace-nowrap py-2 pr-2 align-top text-xs text-slate-500">
                        {new Date(r.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="max-w-[200px] py-2 pr-2 align-top text-slate-200">{r.title}</td>
                      <td className="py-2 align-top text-slate-400">{r.cameraName ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">This period</h3>
          <p className="mb-4 text-xs text-slate-600">This worksite only, selected range.</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-slate-700/40 pb-2">
                <span className="text-slate-400">Safety violations (detections)</span>
                <span className="font-semibold text-white">{periodTotals.safetyViolations}</span>
              </div>
              <div className="flex justify-between border-b border-slate-700/40 pb-2">
                <span className="text-slate-400">Alerts created</span>
                <span className="font-semibold text-white">{periodTotals.alerts}</span>
              </div>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Alerts by title</h3>
          <p className="mb-4 text-xs text-slate-500">Grouped by alert title (most common types)</p>
          {loading ? (
            <p className="text-sm text-slate-400">Loading…</p>
          ) : alertsByType.length === 0 ? (
            <p className="text-sm text-slate-400">No alerts in this period.</p>
          ) : (
            <div className="space-y-2">
              {alertsByType.map((a, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-slate-300" title={a.type}>
                    {a.type}
                  </span>
                  <span className="shrink-0 font-medium text-white">{a.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
          <h3 className="mb-1 text-sm font-semibold text-white">Avg. response time</h3>
          <p className="mb-3 text-xs text-slate-600">
            Minutes from alert created to first response. Samples: {responseTime.sampleCount}.
          </p>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-400">
                {loading ? '…' : responseTime.overall > 0 ? responseTime.overall.toFixed(1) : '—'}
              </p>
              <p className="text-sm text-slate-400">minutes overall</p>
            </div>
            <div className="space-y-2">
              {(['HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
                <div key={sev} className="flex justify-between text-sm">
                  <span className="text-slate-400">{sev}</span>
                  <span className="text-slate-200">
                    {loading
                      ? '…'
                      : responseTime.bySeverity[sev] > 0
                        ? `${responseTime.bySeverity[sev].toFixed(1)} min`
                        : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-5">
        <h3 className="mb-1 text-sm font-semibold text-white">Violations by type</h3>
        <p className="mb-4 text-xs text-slate-500">Detection-based violations in this period (by detection time)</p>
        {loading ? (
          <p className="text-sm text-slate-400">Loading…</p>
        ) : violationsByType.length === 0 ? (
          <p className="text-sm text-slate-400">No violations recorded.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {violationsByType.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between rounded-lg border border-slate-700/40 bg-slate-900/40 px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <div className={`h-2 w-2 shrink-0 rounded-full ${item.color}`} />
                  <span className="truncate text-sm text-slate-300">{item.type}</span>
                </div>
                <span className="shrink-0 text-sm font-medium text-white">{item.count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

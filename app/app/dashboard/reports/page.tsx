'use client';

import { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, Shield, AlertTriangle, Camera, Activity, Clock, TrendingUp, TrendingDown, Minus } from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
type ViolationRow   = { type: string; count: number; color: string };
type CameraHotspot  = { cameraId: string; name: string; site: string; total: number; byType: { type: string; count: number }[]; percentageOfSite: number };
type AlertByCamera  = { cameraId: string; name: string; count: number; percentageOfAlertsWithCamera: number };
type RecentAlert    = { id: string; title: string; createdAt: string; cameraName: string | null };
type AlertTypeRow   = { type: string; count: number };
type TrendPoint     = { date: string; label: string; safetyScore: number };

interface Analytics {
  violationsByType:        ViolationRow[];
  cameraViolationHotspots: CameraHotspot[];
  alertsByCamera:          AlertByCamera[];
  recentAlertsWithCamera:  RecentAlert[];
  periodTotals:            { safetyViolations: number; alerts: number };
  alertsByType:            AlertTypeRow[];
  safetyScoreTrend:        TrendPoint[];
  responseTime:            { overall: number; bySeverity: { HIGH: number; MEDIUM: number; LOW: number }; sampleCount: number };
  worksiteName:            string | null;
  dateRange:               { from: string; to: string };
}

/* ─── Colour helpers ─────────────────────────────────────────────────────── */
const TYPE_COLOURS: Record<string, { bar: string; badge: string }> = {
  'No Hard Hat':     { bar: 'bg-red-500',    badge: 'bg-red-500/20 text-red-400 border-red-500/40' },
  'No Safety Vest':  { bar: 'bg-orange-500', badge: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  'Restricted Zone': { bar: 'bg-amber-500',  badge: 'bg-amber-500/20 text-amber-400 border-amber-500/40' },
  'No Safety Glasses':{ bar: 'bg-yellow-500',badge: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  'Unsafe Behavior': { bar: 'bg-rose-600',   badge: 'bg-rose-600/20 text-rose-400 border-rose-600/40' },
  'PPE Violation':   { bar: 'bg-pink-500',   badge: 'bg-pink-500/20 text-pink-400 border-pink-500/40' },
  'Fall Protection': { bar: 'bg-purple-500', badge: 'bg-purple-500/20 text-purple-400 border-purple-500/40' },
  'Equipment Safety':{ bar: 'bg-blue-500',   badge: 'bg-blue-500/20 text-blue-400 border-blue-500/40' },
};
const fallbackColour = { bar: 'bg-slate-500', badge: 'bg-slate-500/20 text-slate-400 border-slate-500/40' };
const getColour = (type: string) => TYPE_COLOURS[type] ?? fallbackColour;

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}
function fmtMin(m: number) {
  if (!m) return '—';
  if (m < 60) return `${m.toFixed(0)}m`;
  return `${(m / 60).toFixed(1)}h`;
}

/* ─── Score badge ────────────────────────────────────────────────────────── */
function ScoreBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-slate-500">N/A</span>;
  const colour = score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400';
  return <span className={`font-bold ${colour}`}>{score.toFixed(0)}</span>;
}

/* ─── Trend arrow ────────────────────────────────────────────────────────── */
function TrendArrow({ current, prev }: { current: number | null; prev: number | null }) {
  if (current == null || prev == null) return <Minus className="w-4 h-4 text-slate-500" />;
  if (current > prev) return <TrendingUp className="w-4 h-4 text-emerald-400" />;
  if (current < prev) return <TrendingDown className="w-4 h-4 text-red-400" />;
  return <Minus className="w-4 h-4 text-slate-500" />;
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="min-h-screen bg-slate-950 animate-pulse p-8 space-y-6">
      <div className="h-8 w-64 bg-slate-800 rounded" />
      <div className="grid grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-slate-800 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-slate-800 rounded-xl" />
        <div className="h-64 bg-slate-800 rounded-xl" />
      </div>
      <div className="h-72 bg-slate-800 rounded-xl" />
    </div>
  );
}

/* ─── Main content ───────────────────────────────────────────────────────── */
function ReportsPageContent() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const worksiteId  = searchParams.get('worksite');
  const printRef    = useRef<HTMLDivElement>(null);

  const [days,    setDays]    = useState(30);
  const [data,    setData]    = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!worksiteId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/analytics?worksiteId=${worksiteId}&days=${days}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Unknown error');
      setData(json.data);
    } catch (e: any) {
      setError(e.message ?? 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [worksiteId, days]);

  useEffect(() => { load(); }, [load]);

  const handlePrint = () => window.print();

  /* no worksite */
  if (!worksiteId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-slate-600 mx-auto" />
          <h2 className="text-xl font-semibold text-white">No Worksite Selected</h2>
          <p className="text-slate-400">Open reports from the dashboard with a worksite selected.</p>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) return <Skeleton />;

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto" />
          <p className="text-red-400">{error}</p>
          <button onClick={load} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { violationsByType, cameraViolationHotspots, alertsByCamera, recentAlertsWithCamera,
          periodTotals, alertsByType, safetyScoreTrend, responseTime, worksiteName } = data;

  const maxViolCount  = violationsByType[0]?.count || 1;
  const maxAlertCount = alertsByType[0]?.count || 1;
  const latestScore   = safetyScoreTrend[safetyScoreTrend.length - 1]?.safetyScore ?? null;
  const prevScore     = safetyScoreTrend[safetyScoreTrend.length - 2]?.safetyScore ?? null;
  const displayTrend  = safetyScoreTrend.slice(-24);

  return (
    <>
      {/* ── Print styles ── */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-page { background: white !important; color: black !important; }
          .print-card { background: #f8fafc !important; border: 1px solid #e2e8f0 !important; }
          .print-text-dark { color: #0f172a !important; }
          .print-text-mid  { color: #475569 !important; }
        }
      `}</style>

      <div ref={printRef} className="min-h-screen bg-slate-950 print-page">
        {/* ── Top bar ── */}
        <div className="no-print sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800/60 px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors text-sm"
              >
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </button>
              <span className="text-slate-700">/</span>
              <span className="text-sm text-white font-medium">Violation Detail Report</span>
            </div>

            <div className="flex items-center gap-3">
              {/* Date range */}
              <select
                value={days}
                onChange={e => setDays(Number(e.target.value))}
                className="bg-slate-800 border border-slate-700 text-white text-sm rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value={1}>Last 24 hours</option>
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>

              {/* Export */}
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* ── Report body ── */}
        <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

          {/* ── Report header ── */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="h-9 w-9 rounded-lg bg-blue-600/20 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white print-text-dark">Violation Detail Report</h1>
                  <p className="text-slate-400 text-sm print-text-mid">{worksiteName ?? 'All Worksites'}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 print-text-mid">
                {fmtDate(data.dateRange.from)} — {fmtDate(data.dateRange.to)} &nbsp;·&nbsp; Generated {fmtDate(new Date().toISOString())}
              </p>
            </div>
            {/* NEXXAU wordmark */}
            <div className="text-right no-print">
              <span className="text-lg font-black tracking-widest text-white">NEXXAU</span>
              <p className="text-[10px] text-slate-500 tracking-wide">AI Safety Platform</p>
            </div>
          </div>

          {/* ── KPI strip ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Alerts',
                value: periodTotals.alerts,
                sub: `${days}-day period`,
                icon: <AlertTriangle className="w-5 h-5 text-red-400" />,
                accent: 'border-red-500/30',
              },
              {
                label: 'Safety Violations',
                value: periodTotals.safetyViolations,
                sub: 'from SafetyViolation table',
                icon: <Activity className="w-5 h-5 text-orange-400" />,
                accent: 'border-orange-500/30',
              },
              {
                label: 'Violation Types',
                value: violationsByType.length || alertsByType.length,
                sub: 'distinct categories',
                icon: <Camera className="w-5 h-5 text-blue-400" />,
                accent: 'border-blue-500/30',
              },
              {
                label: 'Safety Score',
                value: null,
                scoreVal: latestScore,
                sub: latestScore != null ? (latestScore >= 80 ? 'Good standing' : latestScore >= 60 ? 'Needs attention' : 'Critical') : 'No score data',
                icon: <Shield className="w-5 h-5 text-emerald-400" />,
                accent: 'border-emerald-500/30',
                trend: <TrendArrow current={latestScore} prev={prevScore} />,
              },
            ].map((card, i) => (
              <div key={i} className={`bg-slate-800/50 border ${card.accent} rounded-xl p-5 print-card`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider print-text-mid">{card.label}</p>
                  <div className="flex items-center gap-1">
                    {card.trend}
                    {card.icon}
                  </div>
                </div>
                <p className="text-3xl font-bold text-white print-text-dark">
                  {card.scoreVal !== undefined ? <ScoreBadge score={card.scoreVal} /> : card.value}
                </p>
                <p className="text-xs text-slate-500 mt-1.5 print-text-mid">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── Two columns: violations by type + safety score trend ── */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

            {/* Violations / Alerts by type */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 print-card">
              <h2 className="text-base font-semibold text-white mb-1 print-text-dark">
                {violationsByType.length > 0 ? 'Violations by Type' : 'Alerts by Type'}
              </h2>
              <p className="text-xs text-slate-500 mb-5 print-text-mid">
                {violationsByType.length > 0
                  ? 'Breakdown of detected safety violations by category'
                  : 'Alert counts grouped by rule type (alert data used as proxy for violations)'}
              </p>

              {(violationsByType.length > 0 ? violationsByType : alertsByType).length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <Shield className="w-10 h-10 mb-3" />
                  <p className="text-sm">No violation data for this period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(violationsByType.length > 0 ? violationsByType : alertsByType.map(a => ({ type: a.type, count: a.count, color: '' }))).map((row, i) => {
                    const col   = getColour(row.type);
                    const pct   = Math.round((row.count / (violationsByType.length > 0 ? maxViolCount : maxAlertCount)) * 100);
                    const share = Math.round((row.count / Math.max(1, periodTotals.alerts || periodTotals.safetyViolations)) * 100);
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded border ${col.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${col.bar}`} />
                            {row.type}
                          </span>
                          <div className="flex items-center gap-3 text-xs">
                            <span className="text-slate-400">{share}% of total</span>
                            <span className="font-semibold text-white print-text-dark">{row.count}</span>
                          </div>
                        </div>
                        <div className="h-2 bg-slate-700/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${col.bar}`}
                            style={{ width: `${Math.max(2, pct)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Safety score trend */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 print-card">
              <h2 className="text-base font-semibold text-white mb-1 print-text-dark">Safety Score Trend</h2>
              <p className="text-xs text-slate-500 mb-5 print-text-mid">Daily safety score over the selected period (100 = no alerts)</p>

              {displayTrend.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-600">
                  <TrendingUp className="w-10 h-10 mb-3" />
                  <p className="text-sm">No trend data for this period.</p>
                </div>
              ) : (
                <>
                  <div className="relative h-44 pl-9">
                    {/* Y-axis labels */}
                    <div className="absolute inset-y-0 left-0 flex flex-col justify-between text-[10px] text-slate-500 py-1">
                      <span>100</span>
                      <span>75</span>
                      <span>50</span>
                      <span>25</span>
                      <span>0</span>
                    </div>
                    {/* Grid lines */}
                    <div className="absolute inset-x-9 inset-y-0 flex flex-col justify-between py-1 pointer-events-none">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="border-t border-slate-700/40 w-full" />
                      ))}
                    </div>
                    {/* Bars */}
                    <div className="flex h-full items-end justify-between gap-px">
                      {displayTrend.map((pt, i) => {
                        const h = Math.max(3, (pt.safetyScore / 100) * 100);
                        const barCol = pt.safetyScore >= 80 ? 'from-emerald-500/70 to-emerald-400/30'
                                      : pt.safetyScore >= 60 ? 'from-amber-500/70 to-amber-400/30'
                                      : 'from-red-500/70 to-red-400/30';
                        return (
                          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full">
                            <div
                              title={`${pt.date}: ${pt.safetyScore.toFixed(1)}`}
                              className={`w-full rounded-t bg-gradient-to-t ${barCol} min-w-[3px] transition-all hover:opacity-90`}
                              style={{ height: `${h}%` }}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* X-axis dates */}
                  <div className="mt-2 flex justify-between text-[10px] text-slate-500 pl-9">
                    <span>{displayTrend[0]?.label}</span>
                    <span>{displayTrend[Math.floor(displayTrend.length / 2)]?.label}</span>
                    <span>{displayTrend[displayTrend.length - 1]?.label}</span>
                  </div>
                  {/* Current score */}
                  {latestScore != null && (
                    <div className="mt-4 flex items-center gap-2 text-sm border-t border-slate-700/40 pt-3">
                      <span className="text-slate-400">Current score:</span>
                      <ScoreBadge score={latestScore} />
                      {prevScore != null && (
                        <span className={`text-xs ${latestScore >= prevScore ? 'text-emerald-400' : 'text-red-400'}`}>
                          ({latestScore >= prevScore ? '+' : ''}{(latestScore - prevScore).toFixed(1)} vs prior day)
                        </span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ── Response time ── */}
          {responseTime.sampleCount > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 print-card">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white print-text-dark">Alert Response Time</h2>
                <span className="ml-auto text-xs text-slate-500">{responseTime.sampleCount} resolved alerts sampled</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'Overall Avg', value: responseTime.overall, accent: 'border-blue-500/30 text-blue-400' },
                  { label: 'HIGH Priority', value: responseTime.bySeverity.HIGH, accent: 'border-red-500/30 text-red-400' },
                  { label: 'MEDIUM Priority', value: responseTime.bySeverity.MEDIUM, accent: 'border-amber-500/30 text-amber-400' },
                  { label: 'LOW Priority', value: responseTime.bySeverity.LOW, accent: 'border-slate-500/30 text-slate-400' },
                ].map((item, i) => (
                  <div key={i} className={`border ${item.accent} rounded-lg p-4 text-center print-card`}>
                    <p className={`text-2xl font-bold ${item.accent.split(' ')[1]}`}>{fmtMin(item.value)}</p>
                    <p className="text-xs text-slate-400 mt-1 print-text-mid">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Camera hotspots ── */}
          {cameraViolationHotspots.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden print-card">
              <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white print-text-dark">Camera Violation Hotspots</h2>
                <span className="ml-auto text-xs text-slate-500">Top {cameraViolationHotspots.length} cameras by total violations</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Camera</th>
                      <th className="px-5 py-3 text-left">Site</th>
                      <th className="px-5 py-3 text-right">Violations</th>
                      <th className="px-5 py-3 text-right">% of Site</th>
                      <th className="px-5 py-3 text-left">Top Violation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {cameraViolationHotspots.map((cam, i) => {
                      const topType = cam.byType[0];
                      const col = topType ? getColour(topType.type) : fallbackColour;
                      return (
                        <tr key={cam.cameraId} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-5 py-3.5 font-medium text-white print-text-dark">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500 tabular-nums">#{i + 1}</span>
                              {cam.name}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-slate-400 print-text-mid">{cam.site}</td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-red-500/70 rounded-full"
                                  style={{ width: `${Math.round((cam.total / (cameraViolationHotspots[0]?.total || 1)) * 100)}%` }}
                                />
                              </div>
                              <span className="font-semibold text-white print-text-dark tabular-nums">{cam.total}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right text-slate-300 print-text-mid tabular-nums">
                            {cam.percentageOfSite}%
                          </td>
                          <td className="px-5 py-3.5">
                            {topType ? (
                              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${col.badge}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${col.bar}`} />
                                {topType.type} ({topType.count})
                              </span>
                            ) : <span className="text-slate-600">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Alerts by camera (if hotspots empty) ── */}
          {cameraViolationHotspots.length === 0 && alertsByCamera.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden print-card">
              <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white print-text-dark">Alerts by Camera</h2>
              </div>
              <div className="divide-y divide-slate-700/30">
                {alertsByCamera.map((cam) => (
                  <div key={cam.cameraId} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-white print-text-dark">{cam.name}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-28 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500/70 rounded-full"
                          style={{ width: `${cam.percentageOfAlertsWithCamera}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-white print-text-dark tabular-nums w-6 text-right">{cam.count}</span>
                      <span className="text-xs text-slate-500 w-12 text-right tabular-nums">{cam.percentageOfAlertsWithCamera}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Recent incidents ── */}
          {recentAlertsWithCamera.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden print-card">
              <div className="px-5 py-4 border-b border-slate-700/50 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-slate-400" />
                <h2 className="text-base font-semibold text-white print-text-dark">Recent Incidents</h2>
                <span className="ml-auto text-xs text-slate-500">Latest {recentAlertsWithCamera.length} alerts</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="px-5 py-3 text-left">Time</th>
                      <th className="px-5 py-3 text-left">Alert</th>
                      <th className="px-5 py-3 text-left">Camera</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {recentAlertsWithCamera.map((alert) => {
                      const col = getColour(alert.title);
                      return (
                        <tr key={alert.id} className="hover:bg-slate-700/20 transition-colors">
                          <td className="px-5 py-3 text-slate-400 text-xs whitespace-nowrap print-text-mid">
                            {fmtTime(alert.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded border ${col.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${col.bar}`} />
                              {alert.title}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-slate-300 text-xs print-text-mid">
                            {alert.cameraName ?? <span className="text-slate-600 italic">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty state */}
          {periodTotals.alerts === 0 && periodTotals.safetyViolations === 0 && recentAlertsWithCamera.length === 0 && (
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-12 text-center">
              <Shield className="w-14 h-14 text-emerald-500/40 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-white mb-1">No Violations Recorded</h3>
              <p className="text-slate-400 text-sm">No alerts or violations were detected during this period. Great safety record!</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-slate-800/60 pt-4 flex items-center justify-between text-xs text-slate-600">
            <span>NEXXAU AI Safety Platform · {worksiteName ?? 'Worksite Report'}</span>
            <span>Generated {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <ReportsPageContent />
    </Suspense>
  );
}

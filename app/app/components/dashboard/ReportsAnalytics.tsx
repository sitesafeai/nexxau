"use client";
import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import WorksiteAnalyticsCharts from '@/app/components/dashboard/WorksiteAnalyticsCharts';

interface ReportCard {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance' | 'custom';
  title: string;
  description: string;
  lastGenerated?: string;
  icon: React.ReactNode;
}

interface ReportsAnalyticsProps {
  currentUser: any;
  siteFilter?: string;
}

export default function ReportsAnalytics({ siteFilter }: ReportsAnalyticsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  /** URL ?worksite= often set before context finishes hydrating */
  const effectiveWorksiteId = useMemo(
    () => siteFilter || searchParams.get('worksite') || undefined,
    [siteFilter, searchParams]
  );
  const [showExportModal, setShowExportModal] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['violations', 'alerts', 'safetyScore']);

  const reportCards: ReportCard[] = [
    {
      id: 'daily',
      type: 'daily',
      title: 'Daily Report',
      description: "Today's summary of all safety events",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'weekly',
      type: 'weekly',
      title: 'Weekly Report',
      description: "This week's trends and patterns",
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      id: 'monthly',
      type: 'monthly',
      title: 'Monthly Report',
      description: 'Full month analytics and compliance',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      id: 'incident',
      type: 'incident',
      title: 'Incident Report',
      description: 'Detailed incident analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
    },
    {
      id: 'compliance',
      type: 'compliance',
      title: 'Compliance Report',
      description: 'Regulatory compliance status',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    {
      id: 'custom',
      type: 'custom',
      title: 'Custom Report',
      description: 'Build your own report',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
  ];

  const buildReportsUrl = (type: string, extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    params.set('type', type);
    if (effectiveWorksiteId) {
      params.set('worksite', effectiveWorksiteId);
    }
    if (extra) {
      Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    }
    return `/dashboard/reports?${params.toString()}`;
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    const start = dateRange.start || new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const end = dateRange.end || new Date().toISOString().slice(0, 10);
    const base = {
      worksiteId: effectiveWorksiteId ?? null,
      dateStart: start,
      dateEnd: end,
      metrics: selectedMetrics,
      generatedAt: new Date().toISOString(),
      source: 'dashboard-reports-custom',
    };

    if (format === 'csv') {
      const header = ['worksiteId', 'dateStart', 'dateEnd', 'metrics', 'generatedAt'];
      const row = [
        base.worksiteId ?? '',
        base.dateStart,
        base.dateEnd,
        selectedMetrics.join(';'),
        base.generatedAt,
      ];
      const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
      const csv = [header.map(esc).join(','), row.map(esc).join(',')].join('\n');
      downloadBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `custom-report-${effectiveWorksiteId ?? 'worksite'}.csv`);
      setShowExportModal(false);
      return;
    }

    if (format === 'xlsx') {
      // Excel-friendly TSV (opens in Excel when saved with .xls extension is flaky); use CSV mime for compatibility
      const csv = `worksiteId\tdateStart\tdateEnd\tmetrics\tgeneratedAt\n${base.worksiteId ?? ''}\t${start}\t${end}\t${selectedMetrics.join(',')}\t${base.generatedAt}\n`;
      downloadBlob(
        new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8' }),
        `custom-report-${effectiveWorksiteId ?? 'worksite'}.xls`
      );
      setShowExportModal(false);
      return;
    }

    // PDF: downloadable HTML the user can open and Print → Save as PDF
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Custom report</title>
<style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:20px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #ccc;padding:8px;text-align:left}</style></head><body>
<h1>SiteSafe — Custom report (print to PDF)</h1>
<p><strong>Worksite ID:</strong> ${effectiveWorksiteId ?? '—'}</p>
<p><strong>Range:</strong> ${start} → ${end}</p>
<p><strong>Metrics:</strong> ${selectedMetrics.join(', ')}</p>
<p><strong>Generated:</strong> ${base.generatedAt}</p>
<table><tr><th>Field</th><th>Value</th></tr>
<tr><td>worksiteId</td><td>${effectiveWorksiteId ?? '—'}</td></tr>
<tr><td>metrics</td><td>${selectedMetrics.join(', ')}</td></tr>
</table>
<p style="margin-top:24px;color:#666;font-size:12px">Use your browser Print dialog and choose “Save as PDF”.</p>
</body></html>`;
    downloadBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `custom-report-${effectiveWorksiteId ?? 'worksite'}.html`);
    setShowExportModal(false);
  };

  const handleGenerateReport = (type: string) => {
    if (type === 'custom') {
      setShowExportModal(true);
    } else {
      router.push(buildReportsUrl(type));
    }
  };

  return (
    <div className="space-y-10">
      <header className="border-b border-slate-800/80 pb-6">
        <h1 className="text-xl font-semibold tracking-tight text-white">Reports</h1>
        <p className="mt-1 text-sm text-slate-500">Exports for this worksite, then analytics below.</p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Quick export</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {reportCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={() => handleGenerateReport(card.type)}
              className="group rounded-lg border border-slate-700/60 bg-slate-800/25 p-4 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/45"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md bg-blue-500/10 text-blue-400">
                <span className="scale-90 [&>svg]:h-5 [&>svg]:w-5">{card.icon}</span>
              </div>
              <h3 className="text-[15px] font-semibold text-white">{card.title}</h3>
              <p className="mt-0.5 text-sm leading-snug text-slate-500">{card.description}</p>
              {card.lastGenerated && <p className="mt-2 text-xs text-slate-600">Last: {card.lastGenerated}</p>}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-slate-500">Site analytics</h2>
        <WorksiteAnalyticsCharts siteFilter={effectiveWorksiteId} showPdfDownload />
      </section>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-700 p-4">
              <h3 className="text-lg font-bold text-white">Custom Report</h3>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-white"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                    className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                    className="rounded-lg border border-slate-600 bg-slate-700 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">Metrics</label>
                <div className="flex flex-wrap gap-2">
                  {['violations', 'alerts', 'safetyScore', 'cameras', 'responseTime'].map((metric) => (
                    <button
                      key={metric}
                      type="button"
                      onClick={() =>
                        setSelectedMetrics((prev) =>
                          prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric]
                        )
                      }
                      className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                        selectedMetrics.includes(metric)
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 p-4 space-y-3">
              <button
                type="button"
                onClick={() => {
                  setShowExportModal(false);
                  router.push(buildReportsUrl('custom'));
                }}
                disabled={!effectiveWorksiteId}
                className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {effectiveWorksiteId
                  ? 'Open full report builder'
                  : 'Select a worksite in the dashboard first'}
              </button>
              <p className="mb-1 text-sm text-slate-400">
                Download a quick export (uses the date range and metrics above)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleExport('csv')}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
                >
                  CSV
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('pdf')}
                  title="Downloads HTML — open file and use Print → Save as PDF"
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleExport('xlsx')}
                  title="Excel-compatible spreadsheet download"
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-600"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

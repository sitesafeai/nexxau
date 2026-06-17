'use client';

import { useState, useEffect } from 'react';
import WorksiteAnalyticsCharts from '@/app/components/dashboard/WorksiteAnalyticsCharts';
import {
  FileText, Download, Play, BarChart2, Clock, CheckCircle,
  AlertTriangle, Shield, Camera, Users,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Worksite { id: string; name: string }

interface ReportsPageProps {
  currentSite?: any;
  worksites: Worksite[];
}

interface ExportRecord {
  id:           string;
  reportName:   string;
  format:       string;
  rowCount:     number;
  downloadedAt: string; // ISO
}

/* ─── Local storage persistence ─────────────────────────────────────────── */
const LS_KEY = 'nexxau_report_exports';

function loadExports(): ExportRecord[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}

function saveExports(records: ExportRecord[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(records.slice(0, 50))); } catch {}
}

/* ─── Client-side file generators ───────────────────────────────────────── */
function triggerDownload(content: string, fileName: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: fileName });
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(rows: any[]): string {
  if (!rows.length) return 'No data for this period.\n';
  const headers = Object.keys(rows[0]);
  const esc = (v: any) => { const s = v == null ? '' : String(v); return s.includes(',') || s.includes('\n') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s; };
  return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
}

function toSpreadsheetML(rows: any[], sheetName: string): string {
  const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const headerRow = `<Row>${headers.map(h => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>`;
  const dataRows  = rows.map(r => `<Row>${headers.map(h => `<Cell><Data ss:Type="${typeof r[h] === 'number' ? 'Number' : 'String'}">${esc(r[h])}</Data></Cell>`).join('')}</Row>`).join('\n');
  return `<?xml version="1.0"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="hdr"><Font ss:Bold="1"/></Style></Styles>
  <Worksheet ss:Name="${esc(sheetName)}"><Table>${headerRow}${dataRows}</Table></Worksheet>
</Workbook>`;
}

function openPrintWindow(rows: any[], meta: { reportName: string; generatedAt: string; dateRange?: any }) {
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fromLabel = meta.dateRange?.from ? new Date(meta.dateRange.from).toLocaleDateString() : '';
  const toLabel   = meta.dateRange?.to   ? new Date(meta.dateRange.to).toLocaleDateString()   : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(meta.reportName)}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:-apple-system,Arial,sans-serif;font-size:11px;color:#0f172a;padding:24px}
header{margin-bottom:20px;border-bottom:2px solid #0f172a;padding-bottom:12px;display:flex;justify-content:space-between;align-items:flex-end}
header h1{font-size:18px;font-weight:700}header p{font-size:10px;color:#475569;margin-top:2px}.brand{font-size:14px;font-weight:900;letter-spacing:3px}
table{width:100%;border-collapse:collapse;margin-top:8px}th{background:#0f172a;color:#fff;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.5px;padding:6px 8px;text-align:left}
td{padding:5px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top;word-break:break-word;max-width:200px}tr:nth-child(even) td{background:#f8fafc}
footer{margin-top:16px;font-size:9px;color:#94a3b8;border-top:1px solid #e2e8f0;padding-top:8px;display:flex;justify-content:space-between}
@media print{body{padding:12px}@page{margin:1cm;size:A4 landscape}}</style></head>
<body><header><div><h1>${esc(meta.reportName)}</h1><p>${fromLabel && toLabel ? `${fromLabel} – ${toLabel}` : ''}</p></div><div class="brand">NEXXAU</div></header>
${rows.length === 0 ? '<p style="text-align:center;padding:40px;color:#64748b">No data for this period.</p>'
  : `<table><thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${headers.map(h => `<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody></table>`}
<footer><span>${rows.length} row${rows.length !== 1 ? 's' : ''}</span><span>Generated ${new Date(meta.generatedAt).toLocaleString()}</span></footer>
<script>window.onload=function(){window.print()}</script></body></html>`;
  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) { alert('Allow pop-ups to export PDF.'); return; }
  win.document.open(); win.document.write(html); win.document.close();
}

/* ─── Template definitions ───────────────────────────────────────────────── */
const TEMPLATES = [
  {
    id: 'daily-compliance',
    name: 'Daily Compliance Summary',
    description: 'Total alerts by severity, resolved rate, avg response time, top cameras',
    icon: <CheckCircle className="w-5 h-5" />,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    frequency: 'Daily',
    entities: ['ALERT'],
    fields: ['title', 'severity', 'status', 'createdAt', 'resolvedAt', 'camera', 'worksite'],
  },
  {
    id: 'weekly-incident',
    name: 'Weekly Incident Ledger',
    description: 'Every incident with timeline, camera, rule, and resolution status',
    icon: <AlertTriangle className="w-5 h-5" />,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    frequency: 'Weekly',
    entities: ['INCIDENT'],
    fields: ['incident_id', 'created_at', 'resolved_at', 'title', 'worksite', 'camera', 'rule', 'status', 'severity'],
  },
  {
    id: 'monthly-insurance',
    name: 'Monthly Insurance Summary',
    description: 'PPE compliance detections, alert volume, camera coverage hours',
    icon: <Shield className="w-5 h-5" />,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    frequency: 'Monthly',
    entities: ['ALERT', 'DETECTION'],
    fields: [],
  },
  {
    id: 'camera-health',
    name: 'Camera Health & Uptime',
    description: 'Camera status, last check, health record per camera',
    icon: <Camera className="w-5 h-5" />,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10 border-purple-500/20',
    frequency: 'Daily',
    entities: ['CAMERA'],
    fields: ['name', 'status', 'location', 'worksite', 'lastCheck', 'health'],
  },
  {
    id: 'user-activity',
    name: 'User Activity & Access Log',
    description: 'Login times, failed logins, permission changes, actions taken',
    icon: <Users className="w-5 h-5" />,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    frequency: 'Weekly',
    entities: ['USER', 'AUDIT'],
    fields: [],
  },
];

const FORMAT_LABELS: Record<string, string> = { csv: 'CSV', json: 'JSON', xlsx: 'Excel', pdf: 'PDF' };

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

/* ─── Run modal ──────────────────────────────────────────────────────────── */
interface RunModalProps {
  template: typeof TEMPLATES[0];
  worksites: Worksite[];
  currentSiteId?: string;
  onClose: () => void;
  onDone: (record: ExportRecord) => void;
}

function RunModal({ template, worksites, currentSiteId, onClose, onDone }: RunModalProps) {
  const [format,      setFormat]      = useState<'csv' | 'json' | 'xlsx' | 'pdf'>('csv');
  const [dateRange,   setDateRange]   = useState('last30d');
  const [worksiteId,  setWorksiteId]  = useState(currentSiteId ?? '');
  const [running,     setRunning]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  const run = async () => {
    setRunning(true); setError(null);
    try {
      const now = new Date();
      let to = now.toISOString();
      let from = new Date(now.getTime() - 30 * 86400000).toISOString();
      if (dateRange === 'today')   from = new Date(now.setHours(0,0,0,0)).toISOString();
      if (dateRange === 'last7d')  from = new Date(Date.now() -  7 * 86400000).toISOString();
      if (dateRange === 'last90d') from = new Date(Date.now() - 90 * 86400000).toISOString();

      const res  = await fetch('/api/reports/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportSpec: {
            name:      template.name,
            entities:  template.entities,
            fields:    template.fields,
            filters:   [],
            scope: { worksiteIds: worksiteId ? [worksiteId] : worksites.map(w => w.id), from, to },
          },
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error ?? 'Server error');

      const { data, meta } = json;
      const safeName = template.name.replace(/[^a-zA-Z0-9_-]/g, '_');
      const ts = new Date().toISOString().slice(0, 10);

      switch (format) {
        case 'csv':  triggerDownload(toCSV(data), `${safeName}_${ts}.csv`, 'text/csv'); break;
        case 'json': triggerDownload(JSON.stringify({ generated: meta.generatedAt, rows: data.length, data }, null, 2), `${safeName}_${ts}.json`, 'application/json'); break;
        case 'xlsx': triggerDownload(toSpreadsheetML(data, template.name), `${safeName}_${ts}.xls`, 'application/vnd.ms-excel'); break;
        case 'pdf':  openPrintWindow(data, { ...meta, dateRange: { from, to } }); break;
      }

      onDone({
        id:           `exp_${Date.now()}`,
        reportName:   template.name,
        format,
        rowCount:     data.length,
        downloadedAt: new Date().toISOString(),
      });
    } catch (e: any) {
      setError(e.message ?? 'Failed to run report');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className={`p-2 rounded-lg border ${template.bg} ${template.color}`}>{template.icon}</div>
          <div>
            <h3 className="text-base font-semibold text-white">{template.name}</h3>
            <p className="text-xs text-slate-400">{template.description}</p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Worksite */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Worksite</label>
            <select value={worksiteId} onChange={e => setWorksiteId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="">All Worksites</option>
              {worksites.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>

          {/* Date range */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Date Range</label>
            <select value={dateRange} onChange={e => setDateRange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="today">Today</option>
              <option value="last7d">Last 7 days</option>
              <option value="last30d">Last 30 days</option>
              <option value="last90d">Last 90 days</option>
            </select>
          </div>

          {/* Format */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Format</label>
            <div className="grid grid-cols-4 gap-2">
              {(['csv', 'json', 'xlsx', 'pdf'] as const).map(f => (
                <button key={f} onClick={() => setFormat(f)}
                  className={`py-2 rounded-lg text-xs font-semibold uppercase transition-colors ${format === f ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'}`}>
                  {f}
                </button>
              ))}
            </div>
            {format === 'pdf' && <p className="text-xs text-slate-500 mt-1.5">Opens print dialog — use "Save as PDF"</p>}
            {format === 'xlsx' && <p className="text-xs text-slate-500 mt-1.5">Downloads as .xls — opens in Excel, Numbers, Sheets</p>}
          </div>

          {error && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-slate-400 hover:text-white border border-slate-700 rounded-lg transition-colors">Cancel</button>
          <button onClick={run} disabled={running}
            className="flex-1 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2">
            {running
              ? <><span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Generating…</>
              : <><Download className="w-3.5 h-3.5" />Download</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */
export default function ReportsPage({ currentSite, worksites }: ReportsPageProps) {
  const [tab,           setTab]           = useState<'analytics' | 'reports'>('analytics');
  const [runTemplate,   setRunTemplate]   = useState<typeof TEMPLATES[0] | null>(null);
  const [exports,       setExports]       = useState<ExportRecord[]>([]);

  // Load export history from localStorage on mount
  useEffect(() => { setExports(loadExports()); }, []);

  const handleDone = (record: ExportRecord) => {
    setExports(prev => {
      const next = [record, ...prev];
      saveExports(next);
      return next;
    });
    setRunTemplate(null);
  };

  return (
    <div className="space-y-5">
      {/* Tab switcher */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/60 rounded-lg w-fit">
        {[
          { key: 'analytics', label: 'Site Analytics', icon: <BarChart2 className="w-3.5 h-3.5" /> },
          { key: 'reports',   label: 'Reports',        icon: <FileText   className="w-3.5 h-3.5" /> },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors ${tab === t.key ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Site Analytics tab ── */}
      {tab === 'analytics' && (
        currentSite?.id
          ? <WorksiteAnalyticsCharts siteFilter={currentSite.id} showPdfDownload={false} />
          : <div className="flex flex-col items-center justify-center py-20 text-center">
              <BarChart2 className="w-12 h-12 text-slate-600 mb-4" />
              <p className="text-slate-400 font-medium">No worksite selected</p>
              <p className="text-slate-500 text-sm mt-1">Pick a worksite from the dropdown to see analytics.</p>
            </div>
      )}

      {/* ── Reports tab ── */}
      {tab === 'reports' && (
        <div className="space-y-6">
          {/* Template cards */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Report Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {TEMPLATES.map(tpl => (
                <div key={tpl.id} className="bg-slate-800/50 border border-slate-700/50 hover:border-slate-600/70 rounded-xl p-4 transition-colors flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-2 rounded-lg border ${tpl.bg} ${tpl.color}`}>{tpl.icon}</div>
                    <span className="text-[11px] font-medium text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">{tpl.frequency}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{tpl.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{tpl.description}</p>
                  </div>
                  <button onClick={() => setRunTemplate(tpl)}
                    className="mt-auto flex items-center justify-center gap-2 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors">
                    <Play className="w-3 h-3" />Run Report
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Recent downloads */}
          <div>
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Recent Downloads</h2>
            {exports.length === 0 ? (
              <div className="bg-slate-800/30 border border-slate-700/40 rounded-xl p-8 text-center">
                <Download className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-400">No reports downloaded yet</p>
                <p className="text-xs text-slate-500 mt-1">Run a template above to get started</p>
              </div>
            ) : (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50 text-xs text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-3 text-left">Report</th>
                      <th className="px-4 py-3 text-left">Format</th>
                      <th className="px-4 py-3 text-right">Rows</th>
                      <th className="px-4 py-3 text-left">Downloaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {exports.map(exp => (
                      <tr key={exp.id} className="hover:bg-slate-700/20">
                        <td className="px-4 py-3 font-medium text-white">{exp.reportName}</td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-mono font-semibold uppercase text-slate-300 bg-slate-700/60 px-2 py-0.5 rounded">
                            {FORMAT_LABELS[exp.format] ?? exp.format}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{exp.rowCount.toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 shrink-0" />
                            {fmtTime(exp.downloadedAt)}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {exports.length > 0 && (
                  <div className="px-4 py-2.5 border-t border-slate-700/40 flex justify-end">
                    <button onClick={() => { setExports([]); saveExports([]); }}
                      className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                      Clear history
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Run modal */}
      {runTemplate && (
        <RunModal
          template={runTemplate}
          worksites={worksites}
          currentSiteId={currentSite?.id}
          onClose={() => setRunTemplate(null)}
          onDone={handleDone}
        />
      )}
    </div>
  );
}

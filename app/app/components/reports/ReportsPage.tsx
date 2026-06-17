'use client';

import { useState, useEffect } from 'react';
import ReportBuilder from './ReportBuilder';
import WorksiteAnalyticsCharts from '@/app/components/dashboard/WorksiteAnalyticsCharts';

/* ─── Client-side format generators ──────────────────────────────────────── */

function triggerDownload(content: string | Blob, fileName: string, mime: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function toCSV(rows: any[]): string {
  if (rows.length === 0) return 'No data for this period.\n';
  const headers = Object.keys(rows[0]);
  const escape  = (v: any) => {
    const s = v == null ? '' : String(v);
    return s.includes(',') || s.includes('\n') || s.includes('"')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map(r => headers.map(h => escape(r[h])).join(','))].join('\n');
}

function toSpreadsheetML(rows: any[], sheetName: string): string {
  const esc = (s: string) =>
    String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const cellType = (v: any) => (typeof v === 'number' ? 'Number' : 'String');

  const headerRow = `<Row>${headers.map(h => `<Cell ss:StyleID="hdr"><Data ss:Type="String">${esc(h)}</Data></Cell>`).join('')}</Row>`;
  const dataRows = rows.map(r =>
    `<Row>${headers.map(h => {
      const v = r[h] ?? '';
      return `<Cell><Data ss:Type="${cellType(v)}">${esc(String(v))}</Data></Cell>`;
    }).join('')}</Row>`
  ).join('\n');

  return `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:x="urn:schemas-microsoft-com:office:excel"
  xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles>
    <Style ss:ID="hdr">
      <Font ss:Bold="1"/>
      <Interior ss:Color="#1e293b" ss:Pattern="Solid"/>
      <Font ss:Color="#ffffff" ss:Bold="1"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="${esc(sheetName)}">
    <Table>${headerRow}${dataRows}</Table>
  </Worksheet>
</Workbook>`;
}

function openPrintWindow(rows: any[], meta: { reportName: string; generatedAt: string; dateRange?: any }) {
  const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
  const esc = (s: any) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const tableHead = `<tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr>`;
  const tableBody = rows.map(r =>
    `<tr>${headers.map(h => `<td>${esc(r[h])}</td>`).join('')}</tr>`
  ).join('');

  const fromLabel = meta.dateRange?.from ? new Date(meta.dateRange.from).toLocaleDateString() : '';
  const toLabel   = meta.dateRange?.to   ? new Date(meta.dateRange.to).toLocaleDateString()   : '';
  const dateLabel = fromLabel && toLabel ? `${fromLabel} – ${toLabel}` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(meta.reportName)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 11px; color: #0f172a; padding: 24px; }
    header { margin-bottom: 20px; border-bottom: 2px solid #0f172a; padding-bottom: 12px; display: flex; justify-content: space-between; align-items: flex-end; }
    header h1 { font-size: 18px; font-weight: 700; letter-spacing: -0.3px; }
    header p  { font-size: 10px; color: #475569; margin-top: 2px; }
    .brand { font-size: 14px; font-weight: 900; letter-spacing: 3px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #0f172a; color: #fff; font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; padding: 6px 8px; text-align: left; }
    td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; vertical-align: top; word-break: break-word; max-width: 200px; }
    tr:nth-child(even) td { background: #f8fafc; }
    footer { margin-top: 16px; font-size: 9px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 8px; display: flex; justify-content: space-between; }
    .empty { text-align: center; padding: 40px; color: #64748b; font-size: 13px; }
    @media print {
      body { padding: 12px; }
      @page { margin: 1cm; size: A4 landscape; }
    }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>${esc(meta.reportName)}</h1>
      <p>${dateLabel}</p>
    </div>
    <div class="brand">NEXXAU</div>
  </header>
  ${rows.length === 0
    ? `<div class="empty">No data for this period.</div>`
    : `<table><thead>${tableHead}</thead><tbody>${tableBody}</tbody></table>`}
  <footer>
    <span>${rows.length} row${rows.length !== 1 ? 's' : ''}</span>
    <span>Generated ${new Date(meta.generatedAt).toLocaleString()}</span>
  </footer>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=800');
  if (!win) { alert('Allow pop-ups to export PDF.'); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

// Types
interface Report {
  id: string;
  name: string;
  isTemplate: boolean;
  isSystem: boolean;
  spec: ReportSpec;
  schedule?: string;
  lastRunAt?: string;
  createdAt: string;
}

interface ReportSpec {
  name: string;
  scope: {
    worksiteIds: string[];
    from: string;
    to: string;
  };
  entities: string[];
  fields: string[];
  filters: any[];
  groupBy?: string[];
  aggregations?: any[];
  layout?: {
    format: string;
    orientation?: string;
  };
}

interface ReportExport {
  id: string;
  jobId: string;
  format: string;
  status: string;
  fileUrl?: string;
  fileSize?: number;
  requestedAt: string;
  completedAt?: string;
}

interface Worksite {
  id: string;
  name: string;
}

interface ReportsPageProps {
  currentSite?: any;
  worksites: Worksite[];
}

// System Report Templates
const SYSTEM_TEMPLATES = [
  {
    id: 'daily-compliance',
    name: 'Daily Compliance Summary',
    description: 'Total alerts by severity, resolved rate, avg time-to-ack, top cameras by violations',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    frequency: 'Daily',
    entities: ['ALERT'],
    fields: ['date', 'total_alerts', 'critical', 'warning', 'info', 'avg_ack_time_seconds', 'resolved_pct'],
  },
  {
    id: 'weekly-incident',
    name: 'Weekly Incident Ledger',
    description: 'Every incident with timeline, owner, notes, and evidence links',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    frequency: 'Weekly',
    entities: ['INCIDENT'],
    fields: ['incident_id', 'created_at', 'worksite', 'camera', 'rule', 'owner', 'status_history', 'resolution_type', 'evidence_urls'],
  },
  {
    id: 'monthly-insurance',
    name: 'Monthly Insurance Summary',
    description: 'PPE compliance %, incidents avoided estimate, hours monitored',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    frequency: 'Monthly',
    entities: ['ALERT', 'DETECTION'],
    fields: ['month', 'ppe_compliance_pct', 'incidents_avoided', 'hours_monitored', 'total_detections'],
  },
  {
    id: 'camera-health',
    name: 'Camera Health & Uptime',
    description: 'Uptime %, packet loss, last_seen, storage usage per camera',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    frequency: 'Daily',
    entities: ['CAMERA'],
    fields: ['camera_id', 'name', 'uptime_pct', 'packet_loss', 'last_seen', 'storage_used_gb'],
  },
  {
    id: 'user-activity',
    name: 'User Activity & Access Log',
    description: 'Login times, failed logins, permission changes, actions taken',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    frequency: 'Weekly',
    entities: ['USER', 'AUDIT'],
    fields: ['user_id', 'name', 'email', 'login_count', 'failed_logins', 'last_login', 'actions_taken'],
  },
];

export default function ReportsPage({ currentSite, worksites }: ReportsPageProps) {
  // State
  const [activeTab, setActiveTab] = useState<'templates' | 'saved' | 'scheduled'>('templates');
  const [savedReports, setSavedReports] = useState<Report[]>([]);
  const [recentExports, setRecentExports] = useState<ReportExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showBuilder, setShowBuilder] = useState(false);
  const [showRunModal, setShowRunModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [runningReport, setRunningReport] = useState<string | null>(null);
  
  // Run report modal state
  const [runConfig, setRunConfig] = useState({
    format: 'csv' as 'csv' | 'json' | 'pdf' | 'xlsx',
    dateRange: 'last7d',
    customFrom: '',
    customTo: '',
    includeEvidence: false,
    worksiteId: currentSite?.id || '',
  });

  // Fetch saved reports
  useEffect(() => {
    async function fetchReports() {
      try {
        setLoading(true);
        const response = await fetch('/api/reports');
        if (response.ok) {
          const data = await response.json();
          setSavedReports(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch reports:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchReports();
  }, []);

  // Fetch recent exports
  useEffect(() => {
    async function fetchExports() {
      try {
        const response = await fetch('/api/reports/exports?limit=10');
        if (response.ok) {
          const data = await response.json();
          setRecentExports(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch exports:', err);
      }
    }

    fetchExports();
  }, []);

  const handleRunTemplate = (template: any) => {
    setSelectedTemplate(template);
    setRunConfig(prev => ({
      ...prev,
      worksiteId: currentSite?.id || '',
    }));
    setShowRunModal(true);
  };

  const handleRunReport = async () => {
    if (!selectedTemplate) return;
    setRunningReport(selectedTemplate.id);

    try {
      // Build date range
      let from = runConfig.customFrom;
      let to   = runConfig.customTo;
      if (runConfig.dateRange !== 'custom') {
        const now = new Date();
        to = now.toISOString();
        switch (runConfig.dateRange) {
          case 'today':   from = new Date(now.setHours(0, 0, 0, 0)).toISOString(); break;
          case 'last7d':  from = new Date(now.getTime() -  7 * 86400000).toISOString(); break;
          case 'last30d': from = new Date(now.getTime() - 30 * 86400000).toISOString(); break;
          case 'last90d': from = new Date(now.getTime() - 90 * 86400000).toISOString(); break;
        }
      }

      const reportSpec = {
        name:      selectedTemplate.name,
        templateId:selectedTemplate.id,
        scope: {
          worksiteIds: runConfig.worksiteId ? [runConfig.worksiteId] : worksites.map(w => w.id),
          from,
          to,
        },
        entities: selectedTemplate.entities,
        fields:   selectedTemplate.fields,
        filters:  [],
      };

      // Fetch data as JSON — format generation happens client-side
      const res = await fetch('/api/reports/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ reportSpec }),
      });

      const json = await res.json();
      if (!json.success) {
        setError(json.error || 'Failed to run report');
        return;
      }

      const { data, meta } = json;
      const safeName = (meta.reportName || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
      const ts       = new Date().toISOString().slice(0, 10);
      const fmt      = runConfig.format;

      switch (fmt) {
        case 'csv':
          triggerDownload(toCSV(data), `${safeName}_${ts}.csv`, 'text/csv');
          break;
        case 'json':
          triggerDownload(
            JSON.stringify({ generated: meta.generatedAt, rows: data.length, data }, null, 2),
            `${safeName}_${ts}.json`,
            'application/json',
          );
          break;
        case 'xlsx':
          triggerDownload(toSpreadsheetML(data, meta.reportName), `${safeName}_${ts}.xls`, 'application/vnd.ms-excel');
          break;
        case 'pdf':
          openPrintWindow(data, meta);
          break;
        default:
          triggerDownload(toCSV(data), `${safeName}_${ts}.csv`, 'text/csv');
      }

      // Add to recent exports list
      const exportId = `local_${Date.now()}`;
      setRecentExports(prev => [{
        id:          exportId,
        jobId:       exportId,
        format:      fmt,
        status:      'ready',
        fileSize:    data.length * 80, // rough estimate
        requestedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      }, ...prev]);

      setShowRunModal(false);
      setActiveTab('saved');
    } catch (err: any) {
      setError(err.message || 'Failed to run report');
    } finally {
      setRunningReport(null);
    }
  };

  const handleDownload = async (exportItem: ReportExport) => {
    if (exportItem.status !== 'ready' || !exportItem.fileUrl) {
      return;
    }
    
    window.open(exportItem.fileUrl, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'processing':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'queued':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {currentSite?.id && (
        <WorksiteAnalyticsCharts siteFilter={currentSite.id} showPdfDownload={false} />
      )}

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold text-white">Reports</h1>
          <p className="text-sm text-slate-400 mt-1">
            Generate, schedule, and download compliance reports
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowBuilder(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Custom Report
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-800/50 rounded-lg w-fit">
        {[
          { key: 'templates', label: 'Templates' },
          { key: 'saved', label: 'Saved Reports' },
          { key: 'scheduled', label: 'Scheduled' },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-between">
          <p className="text-red-400">{error}</p>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SYSTEM_TEMPLATES.map(template => (
            <div
              key={template.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-5 hover:border-slate-600 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  {template.icon}
                </div>
                <span className="text-xs text-slate-500 font-medium">{template.frequency}</span>
              </div>
              
              <h3 className="text-white font-medium mb-2">{template.name}</h3>
              <p className="text-sm text-slate-400 mb-4 line-clamp-2">{template.description}</p>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleRunTemplate(template)}
                  disabled={runningReport === template.id}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {runningReport === template.id ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Running...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      </svg>
                      Run Report
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedTemplate(template);
                    setShowBuilder(true);
                  }}
                  className="py-2 px-3 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm rounded-lg transition-colors"
                >
                  Customize
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Saved Reports Tab */}
      {activeTab === 'saved' && (
        <div className="space-y-4">
          {/* Recent Exports */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50">
              <h3 className="text-sm font-medium text-white">Recent Exports</h3>
            </div>
            
            {recentExports.length === 0 ? (
              <div className="p-8 text-center">
                <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-slate-400">No reports generated yet</p>
                <p className="text-sm text-slate-500 mt-1">Run a template or create a custom report to get started</p>
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Report</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Size</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {recentExports.map(exp => (
                    <tr key={exp.id} className="hover:bg-slate-700/20">
                      <td className="px-4 py-3">
                        <p className="text-sm text-white">{exp.jobId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-slate-300 uppercase">{exp.format}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${getStatusBadge(exp.status)}`}>
                          {exp.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {formatFileSize(exp.fileSize)}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-400">
                        {new Date(exp.requestedAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exp.status === 'ready' ? (
                          <button
                            onClick={() => handleDownload(exp)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            Download
                          </button>
                        ) : exp.status === 'processing' || exp.status === 'queued' ? (
                          <span className="text-xs text-slate-400">Processing...</span>
                        ) : (
                          <span className="text-xs text-red-400">Failed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Saved Custom Reports */}
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-700/50">
              <h3 className="text-sm font-medium text-white">Saved Reports</h3>
            </div>
            
            {savedReports.filter(r => !r.isSystem).length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-slate-400">No custom reports saved</p>
                <button
                  onClick={() => setShowBuilder(true)}
                  className="mt-2 text-sm text-blue-400 hover:text-blue-300"
                >
                  Create your first custom report
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {savedReports.filter(r => !r.isSystem).map(report => (
                  <div key={report.id} className="p-4 flex items-center justify-between hover:bg-slate-700/20">
                    <div>
                      <p className="text-sm font-medium text-white">{report.name}</p>
                      <p className="text-xs text-slate-400">
                        Created {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleRunTemplate(report)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                      >
                        Run
                      </button>
                      <button className="px-3 py-1.5 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs rounded transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Scheduled Tab */}
      {activeTab === 'scheduled' && (
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
            <h3 className="text-sm font-medium text-white">Scheduled Reports</h3>
            <button className="text-sm text-blue-400 hover:text-blue-300">
              Schedule New
            </button>
          </div>
          
          <div className="p-8 text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-slate-400">No scheduled reports</p>
            <p className="text-sm text-slate-500 mt-1">Schedule reports to run automatically</p>
          </div>
        </div>
      )}

      {/* Run Report Modal */}
      {showRunModal && selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRunModal(false)} />
          <div 
            className="relative bg-slate-900 rounded-lg border border-slate-700 shadow-2xl w-full max-w-lg p-6"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-white mb-4">Run Report: {selectedTemplate.name}</h3>
            
            <div className="space-y-4">
              {/* Worksite Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Worksite</label>
                <select
                  value={runConfig.worksiteId}
                  onChange={e => setRunConfig(prev => ({ ...prev, worksiteId: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white"
                >
                  <option value="">All Worksites</option>
                  {worksites.map(ws => (
                    <option key={ws.id} value={ws.id}>{ws.name}</option>
                  ))}
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
                <select
                  value={runConfig.dateRange}
                  onChange={e => setRunConfig(prev => ({ ...prev, dateRange: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2.5 text-white"
                >
                  <option value="today">Today</option>
                  <option value="last7d">Last 7 Days</option>
                  <option value="last30d">Last 30 Days</option>
                  <option value="last90d">Last 90 Days</option>
                  <option value="custom">Custom Range</option>
                </select>
              </div>

              {runConfig.dateRange === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">From</label>
                    <input
                      type="date"
                      value={runConfig.customFrom}
                      onChange={e => setRunConfig(prev => ({ ...prev, customFrom: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">To</label>
                    <input
                      type="date"
                      value={runConfig.customTo}
                      onChange={e => setRunConfig(prev => ({ ...prev, customTo: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {/* Format */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Output Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {['csv', 'json', 'pdf', 'xlsx'].map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setRunConfig(prev => ({ ...prev, format: fmt as any }))}
                      className={`py-2 px-3 rounded-lg text-sm font-medium uppercase transition-colors ${
                        runConfig.format === fmt
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-600'
                      }`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Include Evidence */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={runConfig.includeEvidence}
                  onChange={e => setRunConfig(prev => ({ ...prev, includeEvidence: e.target.checked }))}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-600"
                />
                <span className="text-sm text-slate-300">Include evidence attachments (ZIP)</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowRunModal(false)}
                className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRunReport}
                disabled={runningReport !== null}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {runningReport ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Generate & Download
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Builder Modal */}
      {showBuilder && (
        <ReportBuilder
          isOpen={showBuilder}
          onClose={() => {
            setShowBuilder(false);
            setSelectedTemplate(null);
          }}
          worksites={worksites}
          initialTemplate={selectedTemplate}
          onSave={async (spec) => {
            // Save report spec
            const response = await fetch('/api/reports', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(spec),
            });
            if (response.ok) {
              const data = await response.json();
              setSavedReports(prev => [...prev, data.data]);
              setShowBuilder(false);
            }
          }}
        />
      )}
    </div>
  );
}


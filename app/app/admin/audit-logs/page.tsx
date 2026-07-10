'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { FileText, Download, Filter, X, Eye } from 'lucide-react';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  changes: any;
  ipAddress: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string | null;
  };
}

// ── CSV helpers ────────────────────────────────────────────────────────────────
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const CSV_HEADERS = ['Timestamp', 'User Name', 'User Email', 'Action', 'Entity', 'Entity ID', 'IP Address', 'Changes'];

function logToCSVRow(log: AuditLog): string {
  return [
    log.createdAt,
    log.user.name || '',
    log.user.email || '',
    log.action,
    log.entity,
    log.entityId || '',
    log.ipAddress || '',
    log.changes ? JSON.stringify(log.changes) : '',
  ].map(escapeCSV).join(',');
}

function downloadCSV(rows: AuditLog[], filename: string) {
  const csv = [CSV_HEADERS.join(','), ...rows.map(logToCSVRow)].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
// ──────────────────────────────────────────────────────────────────────────────

export default function AuditLogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filter, setFilter] = useState({
    action: 'ALL',
    entity: 'ALL',
    dateFrom: '',
    dateTo: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      if (userRole !== 'SUPER_ADMIN') {
        router.push('/dashboard');
        return;
      }
      fetchAuditLogs();
    }
  }, [status, session, router]);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filter.action !== 'ALL') params.append('action', filter.action);
      if (filter.entity !== 'ALL') params.append('entity', filter.entity);
      if (filter.dateFrom) params.append('from', filter.dateFrom);
      if (filter.dateTo) params.append('to', filter.dateTo);

      const response = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      const data = await response.json();
      if (data.success) setLogs(data.data);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (logs.length === 0) return;
    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCSV(logs, `audit-logs-${timestamp}.csv`);
  };

  const handleExportSingle = (log: AuditLog) => {
    const ts = new Date(log.createdAt).toISOString().slice(0, 19).replace(/[:.]/g, '-');
    downloadCSV([log], `audit-log-${log.action}-${ts}.csv`);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN':  return 'bg-purple-100 text-purple-800';
      case 'INVITE': return 'bg-yellow-100 text-yellow-800';
      default:       return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">Audit Logs</h1>
              <p className="text-slate-300">Track all system activities and changes</p>
            </div>
            <button
              onClick={handleExport}
              disabled={logs.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Action</label>
              <select
                value={filter.action}
                onChange={(e) => setFilter({ ...filter, action: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Actions</option>
                <option value="CREATE">Create</option>
                <option value="UPDATE">Update</option>
                <option value="DELETE">Delete</option>
                <option value="LOGIN">Login</option>
                <option value="INVITE">Invite</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Entity</label>
              <select
                value={filter.entity}
                onChange={(e) => setFilter({ ...filter, entity: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">All Entities</option>
                <option value="User">User</option>
                <option value="Company">Company</option>
                <option value="Worksite">Worksite</option>
                <option value="Camera">Camera</option>
                <option value="Alert">Alert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">From Date</label>
              <input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">To Date</label>
              <input
                type="date"
                value={filter.dateTo}
                onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={fetchAuditLogs}
            className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
        </div>

        {/* Table */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-900/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Entity</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">IP Address</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{log.user.name || 'Unknown'}</div>
                        <div className="text-xs text-slate-400">{log.user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">{log.entity}</div>
                        {log.entityId && (
                          <div className="text-xs text-slate-400 font-mono">{log.entityId.substring(0, 8)}...</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                        {log.ipAddress || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Detail Modal ── */}
      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="relative w-full max-w-2xl bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Audit Log Detail</h2>
                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getActionColor(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {/* Single-entry download */}
                <button
                  onClick={() => handleExportSingle(selectedLog)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
                {/* Close */}
                <button
                  onClick={() => setSelectedLog(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-400 mb-1">Timestamp</p>
                  <p className="text-sm text-white">{new Date(selectedLog.createdAt).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">IP Address</p>
                  <p className="text-sm text-white font-mono">{selectedLog.ipAddress || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">User</p>
                  <p className="text-sm text-white">{selectedLog.user.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-400">{selectedLog.user.email}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 mb-1">Entity</p>
                  <p className="text-sm text-white">{selectedLog.entity}</p>
                  {selectedLog.entityId && (
                    <p className="text-xs text-slate-400 font-mono">{selectedLog.entityId}</p>
                  )}
                </div>
              </div>

              {/* Changes */}
              <div>
                <p className="text-xs text-slate-400 mb-2">Changes / Details</p>
                {selectedLog.changes ? (
                  <pre className="w-full p-4 bg-slate-900 rounded-lg text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap break-all max-h-56 overflow-y-auto">
                    {JSON.stringify(selectedLog.changes, null, 2)}
                  </pre>
                ) : (
                  <p className="text-sm text-slate-500 italic">No change data recorded</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

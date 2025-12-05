"use client";
import { CriticalAlert } from './GlobalDashboard';

interface AlertsFeedProps {
  alerts: CriticalAlert[];
  loading: boolean;
  onAlertAction: (alertId: string, action: 'acknowledge' | 'assign' | 'view') => void;
}

export default function AlertsFeed({ alerts, loading, onAlertAction }: AlertsFeedProps) {
  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'high':
        return {
          badge: 'bg-red-500/20 text-red-400 border-red-500/30',
          dot: 'bg-red-500',
          row: 'hover:bg-red-500/5'
        };
      case 'medium':
        return {
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-500',
          row: 'hover:bg-amber-500/5'
        };
      case 'low':
        return {
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-500',
          row: 'hover:bg-emerald-500/5'
        };
      default:
        return {
          badge: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-500',
          row: 'hover:bg-slate-500/5'
        };
    }
  };

  const getStatusStyles = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-red-500/20 text-red-400';
      case 'acknowledged':
        return 'bg-amber-500/20 text-amber-400';
      case 'resolved':
        return 'bg-emerald-500/20 text-emerald-400';
      default:
        return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (loading) {
    return (
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="p-4 border-b border-slate-700/50">
          <div className="w-32 h-6 bg-slate-700 rounded animate-pulse" />
        </div>
        <div className="p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <div className="flex-1 space-y-2">
                <div className="w-3/4 h-4 bg-slate-700 rounded" />
                <div className="w-1/2 h-3 bg-slate-700 rounded" />
              </div>
              <div className="w-16 h-6 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <h2 className="text-lg font-semibold text-white">Critical Alerts</h2>
          <span className="text-xs text-slate-400 bg-slate-700/50 px-2 py-0.5 rounded-full">
            Top 10
          </span>
        </div>
        <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View All →
        </button>
      </div>

      {/* Alerts Table */}
      <div className="flex-1 overflow-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">No critical alerts</p>
            <p className="text-sm text-slate-500 mt-1">All systems are operating normally</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-xs text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Site</th>
                  <th className="px-4 py-3 text-left font-medium">Camera</th>
                  <th className="px-4 py-3 text-left font-medium">Alert Type</th>
                  <th className="px-4 py-3 text-left font-medium">Severity</th>
                  <th className="px-4 py-3 text-left font-medium">Time</th>
                  <th className="px-4 py-3 text-left font-medium">Manager</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/30">
                {alerts.map((alert) => {
                  const severityStyles = getSeverityStyles(alert.severity);
                  const statusStyles = getStatusStyles(alert.status);
                  
                  return (
                    <tr key={alert.id} className={`${severityStyles.row} transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${severityStyles.dot} ${alert.status === 'active' ? 'animate-pulse' : ''}`} />
                          <span className="text-sm text-white font-medium truncate max-w-[120px]">{alert.site}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 truncate max-w-[100px] block">{alert.camera}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{alert.alertType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${severityStyles.badge}`}>
                          {alert.severity.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-400">{alert.time}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300 truncate max-w-[100px] block">{alert.responsibleManager}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${statusStyles}`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end space-x-1">
                          {alert.status === 'active' && (
                            <button
                              onClick={() => onAlertAction(alert.id, 'acknowledge')}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                              title="Acknowledge"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={() => onAlertAction(alert.id, 'assign')}
                            className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                            title="Assign"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => onAlertAction(alert.id, 'view')}
                            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


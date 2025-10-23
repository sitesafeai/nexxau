'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus } from 'lucide-react';

export default function AlertsPage() {
  const router = useRouter();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAlerts();
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAlerts = async () => {
    try {
      const res = await fetch('/api/alerts', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        setAlerts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error('Failed to load alerts:', e);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const normalizedLevel = severity?.toUpperCase();
    switch (normalizedLevel) {
      case 'CRITICAL': return 'bg-red-900 text-red-300 border-red-700';
      case 'HIGH': return 'bg-orange-900 text-orange-300 border-orange-700';
      case 'MEDIUM': return 'bg-yellow-900 text-yellow-300 border-yellow-700';
      case 'LOW': return 'bg-blue-900 text-blue-300 border-blue-700';
      default: return 'bg-gray-700 text-gray-300 border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white">Alert Management</h1>
              <p className="text-gray-400">View and manage safety alerts</p>
            </div>
          </div>
          <button
            onClick={() => router.push('/dashboard/alert-builder')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-semibold shadow-lg"
          >
            <Plus className="h-5 w-5" />
            Create Alert Rule
          </button>
        </div>

        {/* Alert List */}
        <div className="bg-gray-800/50 backdrop-blur rounded-xl border border-gray-700/50">
          <div className="px-6 py-4 border-b border-gray-700">
            <h3 className="text-lg font-medium text-white">Active Alerts ({alerts.length})</h3>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-20">
              <svg className="w-16 h-16 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Active Alerts</h3>
              <p className="text-gray-400 mb-6">All systems are operating normally</p>
              <button
                onClick={() => router.push('/dashboard/alert-builder')}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Alert Rule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Severity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="hover:bg-gray-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                        {alert.id.substring(0, 8)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-white">{alert.title}</div>
                        <div className="text-xs text-gray-400 mt-1">{alert.description?.substring(0, 60)}...</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          alert.status === 'ACTIVE' ? 'bg-red-900 text-red-300' :
                          alert.status === 'ACKNOWLEDGED' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-green-900 text-green-300'
                        }`}>
                          {alert.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                        {alert.location || alert.worksite?.name || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                        {new Date(alert.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

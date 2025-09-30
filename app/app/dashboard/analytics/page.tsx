'use client';

import React, { useState, useEffect } from 'react';
import SystemMonitor from '../../components/SystemMonitor';

interface DetectionAnalytics {
  totalDetections: number;
  detectionsByClass: Record<string, number>;
  detectionsByCamera: Record<string, number>;
  detectionsByHour: Record<number, number>;
  averageConfidence: number;
  lastUpdated: string;
}

interface AlertAnalytics {
  totalAlerts: number;
  alertsBySeverity: Record<string, number>;
  alertsByType: Record<string, number>;
  recentAlerts: any[];
  lastUpdated: string;
}

export default function AnalyticsPage() {
  const [detectionAnalytics, setDetectionAnalytics] = useState<DetectionAnalytics | null>(null);
  const [alertAnalytics, setAlertAnalytics] = useState<AlertAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch detection analytics
      const detectionRes = await fetch('/api/analytics/detections');
      if (detectionRes.ok) {
        const detectionData = await detectionRes.json();
        setDetectionAnalytics(detectionData.data);
      }

      // Fetch alert analytics
      const alertRes = await fetch('/api/analytics/alerts');
      if (alertRes.ok) {
        const alertData = await alertRes.json();
        setAlertAnalytics(alertData.data);
      }
    } catch (err) {
      setError('Failed to fetch analytics data');
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-8">Analytics Dashboard</h1>
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-lg mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-64 bg-gray-200 rounded-lg"></div>
              <div className="h-64 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
          <button
            onClick={fetchAnalytics}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Refresh Data
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="text-red-800">{error}</div>
          </div>
        )}

        {/* System Monitor */}
        <div className="mb-8">
          <SystemMonitor />
        </div>

        {/* Detection Analytics */}
        {detectionAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Detection Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {detectionAnalytics.totalDetections}
                  </div>
                  <div className="text-sm text-gray-600">Total Detections</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {(detectionAnalytics.averageConfidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Avg Confidence</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Detections by Class</h3>
              <div className="space-y-2">
                {Object.entries(detectionAnalytics.detectionsByClass).map(([className, count]) => (
                  <div key={className} className="flex justify-between items-center">
                    <span className="capitalize">{className}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Alert Analytics */}
        {alertAnalytics && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Alert Overview</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">
                    {alertAnalytics.totalAlerts}
                  </div>
                  <div className="text-sm text-gray-600">Total Alerts</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {alertAnalytics.recentAlerts.length}
                  </div>
                  <div className="text-sm text-gray-600">Recent Alerts</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Alerts by Severity</h3>
              <div className="space-y-2">
                {Object.entries(alertAnalytics.alertsBySeverity).map(([severity, count]) => (
                  <div key={severity} className="flex justify-between items-center">
                    <span className="capitalize">{severity}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Recent Alerts */}
        {alertAnalytics && alertAnalytics.recentAlerts.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Alerts</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {alertAnalytics.recentAlerts.slice(0, 10).map((alert, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {alert.title}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          alert.severity === 'HIGH' ? 'bg-red-100 text-red-800' :
                          alert.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {alert.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {alert.location}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(alert.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

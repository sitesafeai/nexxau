'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  
  const [analytics, setAnalytics] = useState({
    safetyScore: {
      current: 87.5,
      previous: 84.2,
      trend: 'up'
    },
    violations: {
      total: 23,
      major: 5,
      minor: 18,
      trend: 'down',
      change: -12
    },
    compliance: {
      rate: 92,
      trend: 'up',
      change: 3
    },
    cameras: {
      total: 8,
      online: 7,
      offline: 1,
      uptime: 98.5
    },
    alerts: {
      total: 45,
      resolved: 38,
      pending: 7,
      avgResponseTime: '12 min'
    }
  });

  useEffect(() => {
    // Simulate loading
    setTimeout(() => setLoading(false), 1000);
  }, [timeRange]);

  const timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  const violationsByType = [
    { type: 'No Hardhat', count: 8, severity: 'major' },
    { type: 'No Safety Vest', count: 5, severity: 'major' },
    { type: 'Zone Breach', count: 4, severity: 'major' },
    { type: 'Improper PPE', count: 6, severity: 'minor' }
  ];

  const hourlyData = [
    { hour: '8AM', violations: 2 },
    { hour: '9AM', violations: 5 },
    { hour: '10AM', violations: 3 },
    { hour: '11AM', violations: 4 },
    { hour: '12PM', violations: 8 },
    { hour: '1PM', violations: 6 },
    { hour: '2PM', violations: 3 },
    { hour: '3PM', violations: 5 },
    { hour: '4PM', violations: 4 },
    { hour: '5PM', violations: 2 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-gray-300 hover:text-white transition-colors border border-slate-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white">Analytics</h1>
              <p className="text-gray-400">Comprehensive safety insights & trends</p>
            </div>
          </div>

          {/* Time Range Selector */}
          <div className="flex gap-2 bg-slate-800 rounded-lg p-1">
            {timeRanges.map(range => (
              <button
                key={range.value}
                onClick={() => setTimeRange(range.value)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  timeRange === range.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Safety Score */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Safety Score</h3>
                  {analytics.safetyScore.trend === 'up' ? (
                    <TrendingUp className="h-5 w-5 text-green-400" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-400" />
                  )}
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics.safetyScore.current}
                </div>
                <div className="text-sm text-green-400">
                  +{(analytics.safetyScore.current - analytics.safetyScore.previous).toFixed(1)} vs previous
                </div>
              </div>

              {/* Violations */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Total Violations</h3>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics.violations.total}
                </div>
                <div className="text-sm text-green-400">
                  {analytics.violations.change}% vs previous
                </div>
              </div>

              {/* Compliance Rate */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Compliance Rate</h3>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics.compliance.rate}%
                </div>
                <div className="text-sm text-green-400">
                  +{analytics.compliance.change}% improvement
                </div>
              </div>

              {/* Camera Uptime */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Camera Uptime</h3>
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics.cameras.uptime}%
                </div>
                <div className="text-sm text-gray-400">
                  {analytics.cameras.online}/{analytics.cameras.total} online
                </div>
              </div>
            </div>

            {/* Violations by Type */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                Violations by Type
              </h3>
              <div className="space-y-3">
                {violationsByType.map((violation, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white font-medium">{violation.type}</span>
                        <span className="text-gray-400">{violation.count} incidents</span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            violation.severity === 'major' ? 'bg-red-500' : 'bg-yellow-500'
                          }`}
                          style={{ width: `${(violation.count / 8) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hourly Violations Chart */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-400" />
                Violations by Hour
              </h3>
              <div className="flex items-end justify-between h-64 gap-2">
                {hourlyData.map((data, idx) => {
                  const maxViolations = Math.max(...hourlyData.map(d => d.violations));
                  const height = (data.violations / maxViolations) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="relative w-full flex flex-col items-center justify-end h-48">
                        <div
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-500 hover:to-blue-300 cursor-pointer"
                          style={{ height: `${height}%` }}
                          title={`${data.violations} violations`}
                        >
                          <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold">
                            {data.violations}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{data.hour}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Alert Response Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Alert Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Alerts</span>
                    <span className="text-2xl font-bold text-white">{analytics.alerts.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Resolved</span>
                    <span className="text-2xl font-bold text-green-400">{analytics.alerts.resolved}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Pending</span>
                    <span className="text-2xl font-bold text-yellow-400">{analytics.alerts.pending}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400">Avg Response Time</span>
                    <span className="text-2xl font-bold text-blue-400">{analytics.alerts.avgResponseTime}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Camera Status</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Cameras</span>
                    <span className="text-2xl font-bold text-white">{analytics.cameras.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Online</span>
                    <span className="text-2xl font-bold text-green-400">{analytics.cameras.online}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Offline</span>
                    <span className="text-2xl font-bold text-red-400">{analytics.cameras.offline}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-2xl font-bold text-blue-400">{analytics.cameras.uptime}%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Export Actions */}
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => router.push('/dashboard?tab=reports')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Export Report
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
              >
                Print Analytics
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

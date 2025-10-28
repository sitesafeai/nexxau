'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, BarChart3, Calendar } from 'lucide-react';

export default function AnalyticsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d');
  const [worksiteId, setWorksiteId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  const [analytics, setAnalytics] = useState<any>(null);

  // Get worksite ID from local storage or default
  useEffect(() => {
    const storedSite = localStorage.getItem('currentSite');
    if (storedSite) {
      const site = JSON.parse(storedSite);
      setWorksiteId(site.id);
    }
  }, []);

  // Fetch real analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!worksiteId) return;
      
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(
          `/api/analytics?worksiteId=${worksiteId}&timeRange=${timeRange}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch analytics');
        }
        
        const result = await response.json();
        
        if (result.success) {
          setAnalytics(result.data);
        } else {
          setError(result.error || 'Failed to load analytics');
        }
      } catch (err: any) {
        console.error('Error fetching analytics:', err);
        setError(err.message || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [worksiteId, timeRange]);

  const timeRanges = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  // Use real data from API
  const violationsByType = analytics?.violationsByType || [];
  const hourlyData = analytics?.hourlyViolations || [];

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

        {error ? (
          <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-8 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Error Loading Analytics</h3>
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
          </div>
        ) : loading || !analytics ? (
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
                  {analytics?.safetyScore?.current?.toFixed(1) || '0.0'}
                </div>
                <div className={`text-sm ${analytics?.safetyScore?.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {analytics?.safetyScore?.trend === 'up' ? '+' : ''}
                  {((analytics?.safetyScore?.current || 0) - (analytics?.safetyScore?.previous || 0)).toFixed(1)} vs previous
                </div>
              </div>

              {/* Violations */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Total Violations</h3>
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics?.violations?.total || 0}
                </div>
                <div className={`text-sm ${(analytics?.violations?.change || 0) < 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {(analytics?.violations?.change || 0) > 0 ? '+' : ''}{analytics?.violations?.change || 0}% vs previous
                </div>
              </div>

              {/* Compliance Rate */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Compliance Rate</h3>
                  <CheckCircle className="h-5 w-5 text-green-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics?.compliance?.rate || 0}%
                </div>
                <div className={`text-sm ${analytics?.compliance?.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                  {analytics?.compliance?.trend === 'up' ? '+' : ''}{analytics?.compliance?.change || 0}% vs previous
                </div>
              </div>

              {/* Camera Uptime */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-gray-400 text-sm font-medium">Camera Uptime</h3>
                  <BarChart3 className="h-5 w-5 text-blue-400" />
                </div>
                <div className="text-3xl font-bold text-white mb-1">
                  {analytics?.cameras?.uptime || 0}%
                </div>
                <div className="text-sm text-gray-400">
                  {analytics?.cameras?.online || 0}/{analytics?.cameras?.total || 0} online
                </div>
              </div>
            </div>

            {/* Violations by Type */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-red-400" />
                Violations by Type
              </h3>
              {violationsByType.length > 0 ? (
                <div className="space-y-3">
                  {violationsByType.map((violation: any, idx: number) => {
                    const maxCount = Math.max(...violationsByType.map((v: any) => v.count), 1);
                    return (
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
                              style={{ width: `${(violation.count / maxCount) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-400" />
                  <p>No violations recorded in this period! 🎉</p>
                </div>
              )}
            </div>

            {/* Hourly Violations Chart */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Calendar className="h-6 w-6 text-blue-400" />
                Violations by Hour
              </h3>
              {hourlyData.length > 0 ? (
                <div className="flex items-end justify-between h-64 gap-2">
                  {hourlyData.map((data: any, idx: number) => {
                    const maxViolations = Math.max(...hourlyData.map((d: any) => d.violations), 1);
                    const height = maxViolations > 0 ? (data.violations / maxViolations) * 100 : 0;
                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                        <div className="relative w-full flex flex-col items-center justify-end h-48">
                          {data.violations > 0 && (
                            <div
                              className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t-lg transition-all hover:from-blue-500 hover:to-blue-300 cursor-pointer"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`${data.violations} violations`}
                            >
                              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-white text-sm font-bold">
                                {data.violations}
                              </div>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{data.hour}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No hourly data available for this period</p>
                </div>
              )}
            </div>

            {/* Alert Response Times */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Alert Statistics</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Alerts</span>
                    <span className="text-2xl font-bold text-white">{analytics?.alerts?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Resolved</span>
                    <span className="text-2xl font-bold text-green-400">{analytics?.alerts?.resolved || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Pending</span>
                    <span className="text-2xl font-bold text-yellow-400">{analytics?.alerts?.pending || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400">Avg Response Time</span>
                    <span className="text-2xl font-bold text-blue-400">{analytics?.alerts?.avgResponseTime || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700">
                <h3 className="text-xl font-bold text-white mb-4">Camera Status</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Total Cameras</span>
                    <span className="text-2xl font-bold text-white">{analytics?.cameras?.total || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Online</span>
                    <span className="text-2xl font-bold text-green-400">{analytics?.cameras?.online || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Offline</span>
                    <span className="text-2xl font-bold text-red-400">{analytics?.cameras?.offline || 0}</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                    <span className="text-gray-400">Uptime</span>
                    <span className="text-2xl font-bold text-blue-400">{analytics?.cameras?.uptime || 0}%</span>
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

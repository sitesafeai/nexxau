'use client';

import React, { useState, useEffect } from 'react';

interface SystemMetrics {
  metrics: {
    totalQueries: number;
    failedQueries: number;
    averageQueryTime: number;
    uptime: number;
    successRate: string;
  };
  health: boolean;
  connectionCount: number;
}

interface DatabaseStats {
  cameras: number;
  detections: number;
  alerts: number;
  users: number;
  lastUpdated: string;
}

interface PerformanceMetrics {
  detectionsPerHour: Record<number, number>;
  totalDetections24h: number;
  averageDetectionsPerHour: number;
  lastUpdated: string;
}

export default function SystemMonitor() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [performance, setPerformance] = useState<PerformanceMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [metricsRes, statsRes, performanceRes] = await Promise.all([
        fetch('/api/analytics/database?type=overview'),
        fetch('/api/analytics/database?type=stats'),
        fetch('/api/analytics/database?type=performance'),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.data);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData.data);
      }

      if (performanceRes.ok) {
        const performanceData = await performanceRes.json();
        setPerformance(performanceData.data);
      }
    } catch (err) {
      setError('Failed to fetch system metrics');
      console.error('Error fetching system metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Monitor</h3>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">System Monitor</h3>
        <div className="text-red-500">{error}</div>
        <button 
          onClick={fetchData}
          className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold">System Monitor</h3>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${metrics?.health ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-sm text-gray-600">
            {metrics?.health ? 'Healthy' : 'Unhealthy'}
          </span>
        </div>
      </div>

      {/* Database Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{metrics.metrics.totalQueries}</div>
            <div className="text-sm text-gray-600">Total Queries</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{metrics.metrics.failedQueries}</div>
            <div className="text-sm text-gray-600">Failed Queries</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{metrics.metrics.successRate}</div>
            <div className="text-sm text-gray-600">Success Rate</div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {metrics.metrics.averageQueryTime.toFixed(2)}ms
            </div>
            <div className="text-sm text-gray-600">Avg Query Time</div>
          </div>
        </div>
      )}

      {/* Database Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{stats.cameras}</div>
            <div className="text-sm text-gray-600">Cameras</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{stats.detections}</div>
            <div className="text-sm text-gray-600">Detections</div>
          </div>
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-yellow-600">{stats.alerts}</div>
            <div className="text-sm text-gray-600">Alerts</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{stats.users}</div>
            <div className="text-sm text-gray-600">Users</div>
          </div>
        </div>
      )}

      {/* Performance Metrics */}
      {performance && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-semibold mb-3">24h Performance</h4>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-xl font-bold text-blue-600">{performance.totalDetections24h}</div>
              <div className="text-sm text-gray-600">Total Detections</div>
            </div>
            <div>
              <div className="text-xl font-bold text-green-600">
                {performance.averageDetectionsPerHour.toFixed(1)}
              </div>
              <div className="text-sm text-gray-600">Avg/Hour</div>
            </div>
            <div>
              <div className="text-xl font-bold text-purple-600">
                {Math.floor(performance.totalDetections24h / 24)}
              </div>
              <div className="text-sm text-gray-600">Peak/Hour</div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Info */}
      {metrics && (
        <div className="mt-4 text-sm text-gray-600">
          <div>Active Connections: {metrics.connectionCount}</div>
          <div>Uptime: {Math.floor(metrics.metrics.uptime / 1000)}s</div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { 
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  EyeIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface AnalyticsData {
  totalSites: number;
  activeSites: number;
  totalCameras: number;
  onlineCameras: number;
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  totalUsers: number;
  activeUsers: number;
  safetyScore: number;
  monthlyTrends: {
    month: string;
    alerts: number;
    incidents: number;
    safetyScore: number;
  }[];
  alertTypes: {
    type: string;
    count: number;
    percentage: number;
  }[];
  sitePerformance: {
    name: string;
    safetyScore: number;
    alerts: number;
    cameras: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    // Simulate loading data
    setTimeout(() => {
      setData({
        totalSites: 12,
        activeSites: 10,
        totalCameras: 48,
        onlineCameras: 42,
        totalAlerts: 156,
        activeAlerts: 8,
        resolvedAlerts: 148,
        totalUsers: 24,
        activeUsers: 20,
        safetyScore: 87,
        monthlyTrends: [
          { month: 'Jan', alerts: 45, incidents: 2, safetyScore: 82 },
          { month: 'Feb', alerts: 38, incidents: 1, safetyScore: 85 },
          { month: 'Mar', alerts: 42, incidents: 3, safetyScore: 80 },
          { month: 'Apr', alerts: 35, incidents: 1, safetyScore: 87 },
          { month: 'May', alerts: 28, incidents: 0, safetyScore: 90 },
          { month: 'Jun', alerts: 32, incidents: 1, safetyScore: 88 }
        ],
        alertTypes: [
          { type: 'Safety Violation', count: 45, percentage: 35 },
          { type: 'Equipment Malfunction', count: 32, percentage: 25 },
          { type: 'Unauthorized Access', count: 28, percentage: 22 },
          { type: 'Environmental Hazard', count: 15, percentage: 12 },
          { type: 'Other', count: 8, percentage: 6 }
        ],
        sitePerformance: [
          { name: 'Downtown Construction', safetyScore: 92, alerts: 2, cameras: 8 },
          { name: 'Industrial Warehouse', safetyScore: 88, alerts: 1, cameras: 12 },
          { name: 'Highway Bridge Project', safetyScore: 78, alerts: 3, cameras: 6 },
          { name: 'Shopping Center Renovation', safetyScore: 85, alerts: 1, cameras: 4 },
          { name: 'Office Tower Construction', safetyScore: 90, alerts: 1, cameras: 10 }
        ]
      });
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (!data) return null;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600">Monitor system performance and safety metrics</p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overall Safety Score</p>
                <p className="text-2xl font-bold text-gray-900">{data.safetyScore}%</p>
                <div className="flex items-center text-sm">
                  <ArrowTrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">+5% from last month</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Sites</p>
                <p className="text-2xl font-bold text-gray-900">{data.activeSites}/{data.totalSites}</p>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500">{Math.round((data.activeSites / data.totalSites) * 100)}% active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Alerts</p>
                <p className="text-2xl font-bold text-gray-900">{data.activeAlerts}</p>
                <div className="flex items-center text-sm">
                  <ArrowTrendingDownIcon className="h-4 w-4 text-green-500 mr-1" />
                  <span className="text-green-600">-12% from last week</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <UserGroupIcon className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-gray-900">{data.activeUsers}/{data.totalUsers}</p>
                <div className="flex items-center text-sm">
                  <span className="text-gray-500">{Math.round((data.activeUsers / data.totalUsers) * 100)}% active</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Trends */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Trends</h3>
            <div className="space-y-4">
              {data.monthlyTrends.map((trend, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{trend.month}</span>
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Alerts</div>
                      <div className="text-lg font-semibold text-gray-900">{trend.alerts}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm text-gray-500">Safety Score</div>
                      <div className="text-lg font-semibold text-gray-900">{trend.safetyScore}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Alert Types */}
          <div className="bg-white p-6 rounded-lg shadow border">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Alert Types Distribution</h3>
            <div className="space-y-4">
              {data.alertTypes.map((alert, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full mr-3" style={{
                      backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index]
                    }}></div>
                    <span className="text-sm font-medium text-gray-700">{alert.type}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full" 
                        style={{ 
                          width: `${alert.percentage}%`,
                          backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][index]
                        }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{alert.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Site Performance */}
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Site Performance</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Site</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Safety Score</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Alerts</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cameras</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.sitePerformance.map((site, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{site.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${site.safetyScore >= 90 ? 'bg-green-600' : site.safetyScore >= 70 ? 'bg-yellow-600' : 'bg-red-600'}`}
                            style={{ width: `${site.safetyScore}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{site.safetyScore}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{site.alerts}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{site.cameras}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        site.safetyScore >= 90 ? 'bg-green-100 text-green-800' :
                        site.safetyScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {site.safetyScore >= 90 ? 'Excellent' :
                         site.safetyScore >= 70 ? 'Good' : 'Needs Attention'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <EyeIcon className="h-5 w-5 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">View Detailed Reports</span>
            </button>
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Review Active Alerts</span>
            </button>
            <button className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <ClockIcon className="h-5 w-5 text-yellow-600 mr-2" />
              <span className="text-sm font-medium text-gray-700">Schedule Maintenance</span>
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
} 
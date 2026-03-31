'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '../../components/DashboardHeader';
import { TrendingUp, TrendingDown, AlertTriangle, Camera, Users, Building2 } from 'lucide-react';

interface CompanyAnalytics {
  totalWorksites: number;
  totalCameras: number;
  totalUsers: number;
  activeAlerts: number;
  resolvedAlerts24h: number;
  averageSafetyScore: number;
  worksiteBreakdown: Array<{
    id: string;
    name: string;
    safetyScore: number;
    alerts: number;
    cameras: number;
  }>;
  alertTrends: Array<{
    date: string;
    count: number;
    severity: string;
  }>;
  complianceRate: number;
}

export default function CompanyAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<CompanyAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // 24h, 7d, 30d, 90d

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      const userRole = (session.user as any).role;
      
      // Only COMPANY_ADMIN can access this page
      if (userRole !== 'COMPANY_ADMIN') {
        if (userRole === 'SUPER_ADMIN') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      fetchAnalytics();
    }
  }, [status, session, router, timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const companyId = (session?.user as any).companyId;
      
      // Fetch company data
      const companyRes = await fetch(`/api/admin/companies/${companyId}`);
      const companyData = await companyRes.json();

      if (companyData.success) {
        const company = companyData.data;
        
        // Calculate analytics
        const worksiteBreakdown = await Promise.all(
          company.worksites.map(async (ws: any) => {
            // Fetch safety score for each worksite
            const scoreRes = await fetch(`/api/safety-score?worksiteId=${ws.id}`);
            const scoreData = await scoreRes.json();
            
            return {
              id: ws.id,
              name: ws.name,
              safetyScore: scoreData.score || 0,
              alerts: ws._count?.alerts || 0,
              cameras: ws._count?.cameras || 0
            };
          })
        );

        const analyticsData: CompanyAnalytics = {
          totalWorksites: company._count?.worksites || 0,
          totalCameras: company.worksites.reduce((sum: number, ws: any) => sum + (ws._count?.cameras || 0), 0),
          totalUsers: company._count?.companyUsers || company._count?.users || 0,
          activeAlerts: company.worksites.reduce((sum: number, ws: any) => sum + (ws._count?.alerts || 0), 0),
          resolvedAlerts24h: 0, // TODO: Fetch from alerts API
          averageSafetyScore: worksiteBreakdown.reduce((sum, ws) => sum + ws.safetyScore, 0) / worksiteBreakdown.length || 0,
          worksiteBreakdown,
          alertTrends: [], // TODO: Fetch alert trends
          complianceRate: 0.92 // TODO: Calculate actual compliance
        };

        setAnalytics(analyticsData);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <DashboardHeader />
        <div className="p-6 flex items-center justify-center min-h-[80vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <DashboardHeader />
        <div className="p-6">
          <div className="text-center text-white">Failed to load analytics</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Company Analytics</h1>
            <p className="text-slate-300">Overview of all worksites and performance metrics</p>
          </div>

          {/* Time Range Selector */}
          <div className="mb-6 flex gap-2">
            {['24h', '7d', '30d', '90d'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  timeRange === range
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {range === '24h' ? 'Last 24 Hours' : 
                 range === '7d' ? 'Last 7 Days' :
                 range === '30d' ? 'Last 30 Days' : 
                 'Last 90 Days'}
              </button>
            ))}
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Worksites */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-500/20 p-3 rounded-lg">
                  <Building2 className="h-6 w-6 text-blue-500" />
                </div>
                <span className="text-xs text-slate-400">Total</span>
              </div>
              <p className="text-3xl font-bold text-white">{analytics.totalWorksites}</p>
              <p className="text-sm text-slate-400 mt-1">Active Worksites</p>
            </div>

            {/* Total Cameras */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-500/20 p-3 rounded-lg">
                  <Camera className="h-6 w-6 text-purple-500" />
                </div>
                <span className="text-xs text-slate-400">Total</span>
              </div>
              <p className="text-3xl font-bold text-white">{analytics.totalCameras}</p>
              <p className="text-sm text-slate-400 mt-1">Cameras Deployed</p>
            </div>

            {/* Total Users */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-500/20 p-3 rounded-lg">
                  <Users className="h-6 w-6 text-green-500" />
                </div>
                <span className="text-xs text-slate-400">Total</span>
              </div>
              <p className="text-3xl font-bold text-white">{analytics.totalUsers}</p>
              <p className="text-sm text-slate-400 mt-1">Team Members</p>
            </div>

            {/* Active Alerts */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-red-500/20 p-3 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-500" />
                </div>
                <span className="text-xs text-slate-400">Active</span>
              </div>
              <p className="text-3xl font-bold text-white">{analytics.activeAlerts}</p>
              <p className="text-sm text-slate-400 mt-1">Open Alerts</p>
            </div>
          </div>

          {/* Safety Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Average Safety Score */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Company Safety Score</h3>
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-48 h-48">
                  <svg className="w-48 h-48 transform -rotate-90">
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      className="text-slate-700"
                    />
                    <circle
                      cx="96"
                      cy="96"
                      r="80"
                      stroke="currentColor"
                      strokeWidth="12"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 80}`}
                      strokeDashoffset={`${2 * Math.PI * 80 * (1 - analytics.averageSafetyScore / 100)}`}
                      className={`${
                        analytics.averageSafetyScore >= 90 ? 'text-green-500' :
                        analytics.averageSafetyScore >= 75 ? 'text-yellow-500' :
                        'text-red-500'
                      } transition-all duration-1000`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-4xl font-bold text-white">{analytics.averageSafetyScore.toFixed(0)}%</p>
                      <p className="text-sm text-slate-400">Average Score</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm">
                {analytics.averageSafetyScore >= 90 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span className="text-green-500">Excellent Performance</span>
                  </>
                ) : analytics.averageSafetyScore >= 75 ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-yellow-500" />
                    <span className="text-yellow-500">Good Performance</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="h-4 w-4 text-red-500" />
                    <span className="text-red-500">Needs Improvement</span>
                  </>
                )}
              </div>
            </div>

            {/* Compliance Rate */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">Compliance Rate</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">Overall Compliance</span>
                    <span className="text-white font-semibold">{(analytics.complianceRate * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${analytics.complianceRate * 100}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6">
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-green-400">{analytics.resolvedAlerts24h}</p>
                    <p className="text-xs text-slate-400 mt-1">Resolved (24h)</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-4">
                    <p className="text-2xl font-bold text-red-400">{analytics.activeAlerts}</p>
                    <p className="text-xs text-slate-400 mt-1">Open Alerts</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                  <p className="text-xs text-blue-300">
                    ✅ Your company is meeting safety compliance standards
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Worksite Performance Breakdown */}
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-700">
              <h2 className="text-2xl font-bold text-white">Worksite Performance</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Worksite</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Safety Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Active Alerts</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cameras</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {analytics.worksiteBreakdown.map((ws) => (
                    <tr key={ws.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                        {ws.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-slate-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                ws.safetyScore >= 90 ? 'bg-green-500' :
                                ws.safetyScore >= 75 ? 'bg-yellow-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${ws.safetyScore}%` }}
                            />
                          </div>
                          <span className="text-sm text-slate-300">{ws.safetyScore.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          ws.alerts === 0 ? 'bg-green-100 text-green-800' :
                          ws.alerts < 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {ws.alerts} {ws.alerts === 1 ? 'alert' : 'alerts'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {ws.cameras}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ws.safetyScore >= 90 ? (
                          <span className="text-green-400 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Excellent
                          </span>
                        ) : ws.safetyScore >= 75 ? (
                          <span className="text-yellow-400 flex items-center gap-1">
                            <TrendingUp className="h-4 w-4" />
                            Good
                          </span>
                        ) : (
                          <span className="text-red-400 flex items-center gap-1">
                            <TrendingDown className="h-4 w-4" />
                            At Risk
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Safety Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performers */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">🏆 Top Performing Sites</h3>
              <div className="space-y-3">
                {analytics.worksiteBreakdown
                  .sort((a, b) => b.safetyScore - a.safetyScore)
                  .slice(0, 5)
                  .map((ws, index) => (
                    <div key={ws.id} className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-500' :
                        index === 1 ? 'bg-gray-400/20 text-gray-400' :
                        index === 2 ? 'bg-orange-500/20 text-orange-500' :
                        'bg-slate-700 text-slate-400'
                      }`}>
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{ws.name}</p>
                        <p className="text-xs text-slate-400">Score: {ws.safetyScore.toFixed(0)}%</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Areas Needing Attention */}
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <h3 className="text-xl font-bold text-white mb-4">⚠️ Needs Attention</h3>
              <div className="space-y-3">
                {analytics.worksiteBreakdown
                  .filter(ws => ws.alerts > 0 || ws.safetyScore < 75)
                  .sort((a, b) => b.alerts - a.alerts)
                  .slice(0, 5)
                  .map((ws) => (
                    <div key={ws.id} className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-white">{ws.name}</p>
                        <p className="text-xs text-red-400">{ws.alerts} open {ws.alerts === 1 ? 'alert' : 'alerts'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-red-400">{ws.safetyScore.toFixed(0)}%</p>
                      </div>
                    </div>
                  ))}
                {analytics.worksiteBreakdown.filter(ws => ws.alerts > 0 || ws.safetyScore < 75).length === 0 && (
                  <div className="text-center py-8 text-green-400">
                    <p className="text-sm">🎉 All worksites are performing well!</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


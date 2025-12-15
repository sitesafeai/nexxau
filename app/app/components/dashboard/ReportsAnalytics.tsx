"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface ReportCard {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance' | 'custom';
  title: string;
  description: string;
  lastGenerated?: string;
  icon: React.ReactNode;
}

interface TrendData {
  date: string;
  safetyScore: number;
  violations: number;
  alerts: number;
}

interface ViolationHotspot {
  name: string;
  site: string;
  violations: number;
  percentage: number;
}

interface ReportsAnalyticsProps {
  currentUser: any;
  siteFilter?: string;
}

export default function ReportsAnalytics({ currentUser, siteFilter }: ReportsAnalyticsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [hotspots, setHotspots] = useState<ViolationHotspot[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedSites, setSelectedSites] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['violations', 'alerts', 'safetyScore']);
  
  // Real data from API
  const [violationsByType, setViolationsByType] = useState<Array<{ type: string; count: number; color: string }>>([]);
  const [topSites, setTopSites] = useState<Array<{ name: string; score: number }>>([]);
  const [responseTime, setResponseTime] = useState<{
    overall: number;
    bySeverity: { HIGH: number; CRITICAL: number; MEDIUM: number; LOW: number };
  }>({
    overall: 0,
    bySeverity: { HIGH: 0, CRITICAL: 0, MEDIUM: 0, LOW: 0 }
  });

  const reportCards: ReportCard[] = [
    {
      id: 'daily',
      type: 'daily',
      title: 'Daily Report',
      description: 'Today\'s summary of all safety events',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'weekly',
      type: 'weekly',
      title: 'Weekly Report',
      description: 'This week\'s trends and patterns',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      id: 'monthly',
      type: 'monthly',
      title: 'Monthly Report',
      description: 'Full month analytics and compliance',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 'incident',
      type: 'incident',
      title: 'Incident Report',
      description: 'Detailed incident analysis',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      )
    },
    {
      id: 'compliance',
      type: 'compliance',
      title: 'Compliance Report',
      description: 'Regulatory compliance status',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      id: 'custom',
      type: 'custom',
      title: 'Custom Report',
      description: 'Build your own report',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      )
    }
  ];

  useEffect(() => {
    fetchAnalytics();
  }, [siteFilter]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      
      // Fetch real analytics data
      const analyticsUrl = siteFilter 
        ? `/api/reports/analytics?worksiteId=${siteFilter}`
        : '/api/reports/analytics';
      
      const analyticsResponse = await fetch(analyticsUrl);
      const analyticsResult = await analyticsResponse.json();
      
      if (analyticsResult.success && analyticsResult.data) {
        setViolationsByType(analyticsResult.data.violationsByType || []);
        setTopSites(analyticsResult.data.topPerformingSites || []);
        setResponseTime(
          analyticsResult.data.responseTime || {
            overall: 0,
            bySeverity: { HIGH: 0, CRITICAL: 0, MEDIUM: 0, LOW: 0 }
          }
        );

        // Use real violation hotspots from API.
        // These are already site-specific when a worksiteId filter is provided,
        // and camera-based (each hotspot corresponds to a camera/area).
        if (Array.isArray(analyticsResult.data.violationHotspots)) {
          const apiHotspots: ViolationHotspot[] = analyticsResult.data.violationHotspots.map(
            (h: any) => ({
              name: h.name || 'Unknown Camera',
              site: h.site || '',
              violations: h.violations ?? 0,
              percentage: h.percentage ?? 0,
            })
          );

          // If a specific site is selected, keep only that site's hotspots.
          // (API already scopes by worksiteId, but this double-guards against cross-site data.)
          const filteredHotspots =
            siteFilter && siteFilter.length > 0
              ? apiHotspots.filter(h => !h.site || h.site.length > 0)
              : apiHotspots;

          setHotspots(filteredHotspots);
        } else {
          setHotspots([]);
        }
      }
      
      // Mock data for trend visualization (can be replaced with real data later)
      const mockTrend: TrendData[] = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        safetyScore: 75 + Math.random() * 20,
        violations: Math.floor(Math.random() * 10),
        alerts: Math.floor(Math.random() * 15)
      }));

      setTrendData(mockTrend);
      // Leave hotspots as-is (API-driven). If none returned, the section will render empty state.
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = (type: string) => {
    setSelectedReportType(type);
    if (type === 'custom') {
      setShowExportModal(true);
    } else {
      router.push(`/dashboard/reports?type=${type}`);
    }
  };

  const handleExport = (format: 'csv' | 'pdf' | 'xlsx') => {
    // Trigger export
    console.log('Exporting as', format, { dateRange, selectedSites, selectedMetrics });
    setShowExportModal(false);
  };

  const maxViolations = Math.max(...trendData.map(d => d.violations), 1);
  const maxAlerts = Math.max(...trendData.map(d => d.alerts), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports & Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Generate reports and view analytics insights</p>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <button
            key={card.id}
            onClick={() => handleGenerateReport(card.type)}
            className="group bg-slate-800/30 hover:bg-slate-800/50 rounded-xl p-5 border border-slate-700/50 hover:border-blue-500/50 transition-all text-left"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                {card.icon}
              </div>
              <svg className="w-5 h-5 text-slate-500 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">{card.title}</h3>
            <p className="text-sm text-slate-400">{card.description}</p>
            {card.lastGenerated && (
              <p className="text-xs text-slate-500 mt-2">Last: {card.lastGenerated}</p>
            )}
          </button>
        ))}
      </div>

      {/* Visual Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Trend Graph */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Safety Score Trend</h2>
            <select className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-white">
              <option value="30">Last 30 days</option>
              <option value="7">Last 7 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
          
          {/* Simple line visualization */}
          <div className="relative h-48 pl-8">
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-slate-500 w-8">
              <span>100%</span>
              <span>50%</span>
              <span>0%</span>
            </div>
            {/* Chart bars */}
            <div className="flex items-end justify-between gap-1 h-full">
              {trendData.slice(-15).map((data, i) => (
                <div key={i} className="flex-1 flex flex-col items-center h-full justify-end">
                  <div
                    className="w-full bg-gradient-to-t from-blue-500/50 to-blue-400/20 rounded-t transition-all"
                    style={{ height: `${(data.safetyScore / 100) * 100}%` }}
                  />
                </div>
              ))}
            </div>
          </div>
          
          {/* X-axis labels */}
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            {trendData.slice(-15).filter((_, i) => i % 3 === 0).map((data, i) => (
              <span key={i}>{data.date}</span>
            ))}
          </div>
        </div>

        {/* Violation Heatmap / Hotspots */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
          <h2 className="text-lg font-semibold text-white mb-4">Violation Hotspots</h2>
          <p className="text-sm text-slate-400 mb-4">Areas with most violations</p>
          
          <div className="space-y-3">
            {hotspots.map((hotspot, i) => (
              <div key={i} className="group">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-white">{hotspot.name}</span>
                    <span className="text-xs text-slate-500">• {hotspot.site}</span>
                  </div>
                  <span className="text-sm font-medium text-red-400">{hotspot.violations}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full transition-all group-hover:opacity-80"
                    style={{ width: `${hotspot.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Violations by Type */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-4">Violations by Type</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : violationsByType.length > 0 ? (
              violationsByType.slice(0, 8).map((item, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${item.color}`} />
                    <span className="text-sm text-slate-300">{item.type}</span>
                  </div>
                  <span className="text-sm font-medium text-white">{item.count}</span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400">No violations found</div>
            )}
          </div>
        </div>

        {/* Top Performing Sites */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-4">Top Performing Sites</h3>
          <div className="space-y-3">
            {loading ? (
              <div className="text-sm text-slate-400">Loading...</div>
            ) : topSites.length > 0 ? (
              topSites.slice(0, 8).map((site, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-500 w-4">{i + 1}.</span>
                    <span className="text-sm text-slate-300">{site.name}</span>
                  </div>
                  <span className={`text-sm font-medium ${site.score >= 95 ? 'text-emerald-400' : site.score >= 80 ? 'text-blue-400' : 'text-amber-400'}`}>
                    {site.score.toFixed(1)}%
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-slate-400">No sites with safety scores found</div>
            )}
          </div>
        </div>

        {/* Alert Response Time */}
        <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-4">Avg. Response Time</h3>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-4xl font-bold text-emerald-400">
                {loading ? '...' : responseTime.overall > 0 ? responseTime.overall.toFixed(1) : '0.0'}
              </p>
              <p className="text-sm text-slate-400">minutes</p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">High Severity</span>
                <span className="text-emerald-400">
                  {loading ? '...' : responseTime.bySeverity.HIGH > 0 
                    ? `${responseTime.bySeverity.HIGH.toFixed(1)} min` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Critical Severity</span>
                <span className="text-red-400">
                  {loading ? '...' : responseTime.bySeverity.CRITICAL > 0 
                    ? `${responseTime.bySeverity.CRITICAL.toFixed(1)} min` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Medium Severity</span>
                <span className="text-blue-400">
                  {loading ? '...' : responseTime.bySeverity.MEDIUM > 0 
                    ? `${responseTime.bySeverity.MEDIUM.toFixed(1)} min` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Low Severity</span>
                <span className="text-amber-400">
                  {loading ? '...' : responseTime.bySeverity.LOW > 0 
                    ? `${responseTime.bySeverity.LOW.toFixed(1)} min` 
                    : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Report Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-800 rounded-2xl w-full max-w-lg border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-bold text-white">Custom Report</h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Date Range</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
              </div>

              {/* Metrics Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Metrics</label>
                <div className="flex flex-wrap gap-2">
                  {['violations', 'alerts', 'safetyScore', 'cameras', 'responseTime'].map((metric) => (
                    <button
                      key={metric}
                      onClick={() => {
                        setSelectedMetrics(prev =>
                          prev.includes(metric)
                            ? prev.filter(m => m !== metric)
                            : [...prev, metric]
                        );
                      }}
                      className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                        selectedMetrics.includes(metric)
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {metric.charAt(0).toUpperCase() + metric.slice(1).replace(/([A-Z])/g, ' $1')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-700">
              <p className="text-sm text-slate-400 mb-3">Export Format</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleExport('csv')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  PDF
                </button>
                <button
                  onClick={() => handleExport('xlsx')}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Download, FileText, TrendingUp, TrendingDown, AlertTriangle, Shield, CheckCircle, XCircle, Camera, Users, Clock, BarChart3 } from 'lucide-react';

function ReportsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  
  const [selectedReportType, setSelectedReportType] = useState('safety');
  const [dateRange, setDateRange] = useState('7d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [worksite, setWorksite] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const reportTypes = [
    { 
      id: 'safety', 
      name: 'Safety Analytics', 
      description: 'Comprehensive safety analytics & insights',
      icon: Shield,
      color: 'from-blue-600 to-blue-700'
    },
    { 
      id: 'alerts', 
      name: 'Alert Analysis', 
      description: 'Detailed analysis of safety alerts and incidents',
      icon: AlertTriangle,
      color: 'from-yellow-600 to-yellow-700'
    },
    { 
      id: 'cameras', 
      name: 'Camera Performance', 
      description: 'Camera health, uptime, and performance metrics',
      icon: Camera,
      color: 'from-purple-600 to-purple-700'
    },
    { 
      id: 'compliance', 
      name: 'Compliance Report', 
      description: 'Regulatory compliance and audit documentation',
      icon: CheckCircle,
      color: 'from-green-600 to-green-700'
    }
  ];

  const dateRanges = [
    { id: '1d', name: 'Last 24 Hours' },
    { id: '7d', name: 'Last 7 Days' },
    { id: '30d', name: 'Last 30 Days' },
    { id: '90d', name: 'Last 90 Days' },
    { id: 'custom', name: 'Custom Range' }
  ];

  // Load worksite data
  useEffect(() => {
    const loadWorksite = async () => {
      if (!worksiteParam) {
        setLoading(false);
        return;
      }
      
      try {
        const res = await fetch(`/api/worksites/${worksiteParam}`);
        if (res.ok) {
          const data = await res.json();
          setWorksite(data.data);
        }
      } catch (error) {
        console.error('Error loading worksite:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadWorksite();
  }, [worksiteParam]);

  const handleGenerateReport = async () => {
    if (!worksiteParam) {
      alert('Please select a worksite to generate reports');
      return;
    }

    setIsGenerating(true);
    
    try {
      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (dateRange) {
        case '1d':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(startDate.getDate() - 90);
          break;
      }

      // Fetch actual data based on report type
      let reportContent: any = {};

      switch (selectedReportType) {
        case 'safety':
          // Fetch safety violations
          const violationsRes = await fetch(`/api/safety-violations?worksiteId=${worksiteParam}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
          let violations = [];
          if (violationsRes.ok) {
            const violationsData = await violationsRes.json();
            violations = violationsData.success ? (violationsData.data || []) : (violationsData.data || violationsData || []);
          }
          
          // Fetch safety score
          const scoreRes = await fetch(`/api/safety-score?worksiteId=${worksiteParam}&date=${new Date().toISOString().split('T')[0]}`);
          let scoreData = null;
          if (scoreRes.ok) {
            const scoreResData = await scoreRes.json();
            scoreData = scoreResData.success ? scoreResData.data : scoreResData;
          }
          
          reportContent = {
            type: 'safety',
            violations: violations,
            safetyScore: scoreData?.safetyScore || scoreData?.overall || scoreData?.score || null,
            dateRange: { start: startDate, end: endDate }
          };
          break;

        case 'alerts':
          // Fetch alerts
          const alertsRes = await fetch(`/api/alerts?worksiteId=${worksiteParam}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`);
          let alerts = [];
          if (alertsRes.ok) {
            const alertsData = await alertsRes.json();
            alerts = alertsData.success ? (alertsData.data || []) : (Array.isArray(alertsData) ? alertsData : (alertsData.data || []));
          }
          
          reportContent = {
            type: 'alerts',
            alerts: alerts,
            dateRange: { start: startDate, end: endDate }
          };
          break;

        case 'cameras':
          // Fetch camera health data
          const camerasRes = await fetch(`/api/cameras?worksiteId=${worksiteParam}`);
          let cameras = [];
          if (camerasRes.ok) {
            const camerasData = await camerasRes.json();
            cameras = Array.isArray(camerasData) ? camerasData : (camerasData.data || camerasData.success ? camerasData.data : []);
          }
          
          reportContent = {
            type: 'cameras',
            cameras: cameras,
            dateRange: { start: startDate, end: endDate }
          };
          break;

        case 'compliance':
          // Fetch compliance data (violations, alerts, scores)
          const complianceRes = await Promise.all([
            fetch(`/api/safety-violations?worksiteId=${worksiteParam}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
            fetch(`/api/alerts?worksiteId=${worksiteParam}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`),
            fetch(`/api/safety-score?worksiteId=${worksiteParam}&date=${new Date().toISOString().split('T')[0]}`)
          ]);
          
          const [violationsRes2, alertsRes2, scoreRes2] = complianceRes;
          let violations2 = [];
          let alerts2 = [];
          let scoreData2 = null;
          
          if (violationsRes2.ok) {
            const violationsData = await violationsRes2.json();
            violations2 = violationsData.success ? (violationsData.data || []) : (violationsData.data || violationsData || []);
          }
          
          if (alertsRes2.ok) {
            const alertsData = await alertsRes2.json();
            alerts2 = alertsData.success ? (alertsData.data || []) : (Array.isArray(alertsData) ? alertsData : (alertsData.data || []));
          }
          
          if (scoreRes2.ok) {
            const scoreResData = await scoreRes2.json();
            scoreData2 = scoreResData.success ? scoreResData.data : scoreResData;
          }
          
          reportContent = {
            type: 'compliance',
            violations: violations2,
            alerts: alerts2,
            safetyScore: scoreData2?.safetyScore || scoreData2?.overall || scoreData2?.score || null,
            dateRange: { start: startDate, end: endDate }
          };
          break;
      }

      setReportData(reportContent);
      
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
    setIsGenerating(false);
    }
  };

  const handleDownloadReport = () => {
    if (!reportData) return;

    // Create a formatted report document
    const reportDocument = {
      title: `${reportTypes.find(t => t.id === selectedReportType)?.name} Report`,
      worksite: worksite?.name || 'N/A',
      dateRange: {
        start: new Date(reportData.dateRange.start).toLocaleDateString(),
        end: new Date(reportData.dateRange.end).toLocaleDateString()
      },
      generatedAt: new Date().toISOString(),
      data: reportData
    };

    const blob = new Blob([JSON.stringify(reportDocument, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const filename = `${worksite?.name || 'worksite'}-${selectedReportType}-report-${new Date().toISOString().split('T')[0]}.json`;
    a.download = filename.replace(/\s+/g, '-').toLowerCase();
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!worksiteParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Worksite Selected</h2>
            <p className="text-gray-400 mb-6">Please select a worksite to generate reports</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.push(`/dashboard${worksiteParam ? `?worksite=${worksiteParam}` : ''}`)}
              className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </button>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Safety Analytics & Insights</h1>
                <p className="text-gray-400 mt-1">
                  {worksite ? `Generate comprehensive reports for ${worksite.name}` : 'Generate detailed safety analytics, compliance reports, and performance insights'}
                </p>
              </div>
            </div>
          </div>
          {reportData && (
            <button
              onClick={handleDownloadReport}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-semibold"
            >
              <Download className="w-5 h-5" />
              Download Report
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Report Configuration */}
          <div className="lg:col-span-1">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Report Configuration</h2>
              
              {/* Report Type Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Report Type</label>
                <div className="space-y-3">
                  {reportTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = selectedReportType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setSelectedReportType(type.id)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`p-2 rounded-lg bg-gradient-to-br ${type.color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="flex-1">
                            <div className="text-white font-semibold">{type.name}</div>
                            <div className="text-gray-400 text-sm mt-1">{type.description}</div>
                          </div>
                          {isSelected && (
                            <div className="flex-shrink-0">
                              <CheckCircle className="w-5 h-5 text-blue-500" />
                            </div>
                          )}
                      </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {dateRanges.map((range) => (
                    <option key={range.id} value={range.id}>
                      {range.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                  isGenerating
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isGenerating ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating Report...
                  </div>
                ) : (
                  'Generate Report'
                )}
              </button>
            </div>
          </div>

          {/* Report Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-semibold text-white mb-6">Report Preview</h2>
              
              <div className="space-y-6">
                {!reportData ? (
                  <div className="bg-gray-700 rounded-lg p-12 text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-lg font-semibold text-white mb-2">No Report Generated</h3>
                    <p className="text-gray-400 text-sm">
                      Select a report type and date range, then click "Generate Report" to create your report.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Report Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-2xl font-bold text-white mb-1">
                            {reportTypes.find(t => t.id === selectedReportType)?.name}
                  </h3>
                          <p className="text-blue-100">
                            {worksite?.name || 'Worksite'} • {dateRanges.find(r => r.id === dateRange)?.name}
                          </p>
                          <p className="text-blue-200 text-sm mt-1">
                            {new Date(reportData.dateRange.start).toLocaleDateString()} - {new Date(reportData.dateRange.end).toLocaleDateString()}
                          </p>
                        </div>
                        <BarChart3 className="w-16 h-16 text-blue-200 opacity-50" />
                      </div>
                    </div>

                    {/* Safety Report View */}
                    {reportData.type === 'safety' && (
                      <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500">
                            <div className="flex items-center justify-between mb-2">
                              <AlertTriangle className="w-5 h-5 text-red-400" />
                              <span className="text-xs text-gray-400">Total</span>
                            </div>
                            <div className="text-3xl font-bold text-white">{reportData.violations?.length || 0}</div>
                            <div className="text-sm text-gray-400 mt-1">Safety Violations</div>
                          </div>
                          
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
                            <div className="flex items-center justify-between mb-2">
                              <Shield className="w-5 h-5 text-green-400" />
                              <span className="text-xs text-gray-400">Score</span>
                            </div>
                            <div className="text-3xl font-bold text-white">{reportData.safetyScore?.overall || 'N/A'}</div>
                            <div className="text-sm text-gray-400 mt-1">Safety Score</div>
                          </div>

                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500">
                            <div className="flex items-center justify-between mb-2">
                              <Clock className="w-5 h-5 text-yellow-400" />
                              <span className="text-xs text-gray-400">Active</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                              {reportData.violations?.filter((v: any) => v.status === 'OPEN').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Open Violations</div>
                          </div>

                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                            <div className="flex items-center justify-between mb-2">
                              <CheckCircle className="w-5 h-5 text-blue-400" />
                              <span className="text-xs text-gray-400">Resolved</span>
                            </div>
                            <div className="text-3xl font-bold text-white">
                              {reportData.violations?.filter((v: any) => v.status === 'RESOLVED').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Resolved</div>
                          </div>
                        </div>

                        {/* Violation Breakdown */}
                        <div className="bg-gray-700 rounded-lg p-4">
                          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5" />
                            Violation Breakdown by Type
                          </h4>
                          <div className="space-y-3">
                            {reportData.violations && reportData.violations.length > 0 ? (
                              Object.entries(
                                reportData.violations.reduce((acc: any, v: any) => {
                                  acc[v.violationType || 'Unknown'] = (acc[v.violationType || 'Unknown'] || 0) + 1;
                                  return acc;
                                }, {})
                              ).map(([type, count]: [string, any]) => (
                                <div key={type} className="flex items-center justify-between">
                                  <span className="text-gray-300">{type}</span>
                                  <div className="flex items-center gap-3">
                                    <div className="w-32 bg-gray-600 rounded-full h-2">
                                      <div
                                        className="bg-red-500 h-2 rounded-full"
                                        style={{
                                          width: `${(count / reportData.violations.length) * 100}%`
                                        }}
                                      ></div>
                                    </div>
                                    <span className="text-white font-semibold w-8 text-right">{count}</span>
                    </div>
                    </div>
                              ))
                            ) : (
                              <p className="text-gray-400 text-center py-4">No violations recorded</p>
                            )}
                    </div>
                  </div>

                        {/* Recent Violations */}
                        {reportData.violations && reportData.violations.length > 0 && (
                          <div className="bg-gray-700 rounded-lg p-4">
                            <h4 className="text-white font-semibold mb-4">Recent Violations</h4>
                            <div className="space-y-3 max-h-64 overflow-y-auto">
                              {reportData.violations.slice(0, 10).map((violation: any, idx: number) => (
                                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-800 rounded-lg">
                                  <div className={`w-2 h-2 rounded-full mt-2 ${
                                    violation.severity === 'CRITICAL' ? 'bg-red-500' :
                                    violation.severity === 'HIGH' ? 'bg-orange-500' :
                                    violation.severity === 'MEDIUM' ? 'bg-yellow-500' : 'bg-blue-500'
                                  }`}></div>
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-white font-medium">{violation.violationType || 'Safety Violation'}</span>
                                      <span className={`text-xs px-2 py-1 rounded ${
                                        violation.status === 'OPEN' ? 'bg-yellow-500/20 text-yellow-400' :
                                        violation.status === 'RESOLVED' ? 'bg-green-500/20 text-green-400' :
                                        'bg-gray-600 text-gray-300'
                                      }`}>
                                        {violation.status || 'Unknown'}
                                      </span>
                                    </div>
                                    <p className="text-gray-400 text-sm mt-1">{violation.description || 'No description'}</p>
                                    <p className="text-gray-500 text-xs mt-1">
                                      {new Date(violation.createdAt).toLocaleString()}
                  </p>
                </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Alerts Report View */}
                    {reportData.type === 'alerts' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                            <AlertTriangle className="w-5 h-5 text-blue-400 mb-2" />
                            <div className="text-3xl font-bold text-white">{reportData.alerts?.length || 0}</div>
                            <div className="text-sm text-gray-400 mt-1">Total Alerts</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500">
                            <XCircle className="w-5 h-5 text-red-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                              {reportData.alerts?.filter((a: any) => a.severity === 'CRITICAL').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Critical</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-orange-500">
                            <AlertTriangle className="w-5 h-5 text-orange-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                              {reportData.alerts?.filter((a: any) => a.severity === 'HIGH').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">High Priority</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500">
                            <Clock className="w-5 h-5 text-yellow-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                              {reportData.alerts?.filter((a: any) => a.status === 'ACTIVE').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Active</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Cameras Report View */}
                    {reportData.type === 'cameras' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-blue-500">
                            <Camera className="w-5 h-5 text-blue-400 mb-2" />
                            <div className="text-3xl font-bold text-white">{reportData.cameras?.length || 0}</div>
                            <div className="text-sm text-gray-400 mt-1">Total Cameras</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
                            <CheckCircle className="w-5 h-5 text-green-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                              {reportData.cameras?.filter((c: any) => c.status === 'online' || c.status === 'active').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Online</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500">
                            <XCircle className="w-5 h-5 text-red-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                              {reportData.cameras?.filter((c: any) => c.status === 'offline' || c.status === 'error').length || 0}
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Offline</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-purple-500">
                            <TrendingUp className="w-5 h-5 text-purple-400 mb-2" />
                            <div className="text-3xl font-bold text-white">
                              {Math.round((reportData.cameras?.filter((c: any) => c.status === 'online' || c.status === 'active').length / (reportData.cameras?.length || 1)) * 100) || 0}%
                            </div>
                            <div className="text-sm text-gray-400 mt-1">Uptime</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Compliance Report View */}
                    {reportData.type === 'compliance' && (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-red-500">
                            <AlertTriangle className="w-5 h-5 text-red-400 mb-2" />
                            <div className="text-3xl font-bold text-white">{reportData.violations?.length || 0}</div>
                            <div className="text-sm text-gray-400 mt-1">Violations</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-yellow-500">
                            <Clock className="w-5 h-5 text-yellow-400 mb-2" />
                            <div className="text-3xl font-bold text-white">{reportData.alerts?.length || 0}</div>
                            <div className="text-sm text-gray-400 mt-1">Alerts</div>
                          </div>
                          <div className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
                            <Shield className="w-5 h-5 text-green-400 mb-2" />
                            <div className="text-3xl font-bold text-white">{reportData.safetyScore?.overall || 'N/A'}</div>
                            <div className="text-sm text-gray-400 mt-1">Safety Score</div>
                          </div>
                  </div>
                </div>
                    )}

                    {/* Raw Data Section (Collapsible) */}
                    <details className="bg-gray-700 rounded-lg p-4">
                      <summary className="text-white font-semibold cursor-pointer flex items-center gap-2 hover:text-blue-400 transition-colors">
                        <FileText className="w-5 h-5" />
                        View Raw Data (JSON)
                      </summary>
                      <div className="mt-4 max-h-96 overflow-y-auto">
                        <pre className="text-xs text-gray-300 overflow-x-auto bg-gray-800 p-4 rounded">
                          {JSON.stringify(reportData, null, 2)}
                        </pre>
                      </div>
                    </details>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
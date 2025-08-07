'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();
  const [selectedReportType, setSelectedReportType] = useState('safety');
  const [dateRange, setDateRange] = useState('7d');
  const [isGenerating, setIsGenerating] = useState(false);

  const reportTypes = [
    { id: 'safety', name: 'Safety Report', description: 'Comprehensive safety analytics and compliance metrics' },
    { id: 'alerts', name: 'Alert Analysis', description: 'Detailed analysis of safety alerts and incidents' },
    { id: 'cameras', name: 'Camera Performance', description: 'Camera health, uptime, and performance metrics' },
    { id: 'compliance', name: 'Compliance Report', description: 'Regulatory compliance and audit documentation' }
  ];

  const dateRanges = [
    { id: '1d', name: 'Last 24 Hours' },
    { id: '7d', name: 'Last 7 Days' },
    { id: '30d', name: 'Last 30 Days' },
    { id: '90d', name: 'Last 90 Days' },
    { id: 'custom', name: 'Custom Range' }
  ];

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    // Simulate report generation
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGenerating(false);
    // In a real app, this would trigger actual report generation
    console.log('Generating report:', { type: selectedReportType, range: dateRange });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">Safety Reports</h1>
            <p className="text-gray-400 mt-2">Generate comprehensive safety analytics and compliance reports</p>
          </div>
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
                  {reportTypes.map((type) => (
                    <label key={type.id} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="reportType"
                        value={type.id}
                        checked={selectedReportType === type.id}
                        onChange={(e) => setSelectedReportType(e.target.value)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div>
                        <div className="text-white font-medium">{type.name}</div>
                        <div className="text-gray-400 text-sm">{type.description}</div>
                      </div>
                    </label>
                  ))}
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
                {/* Sample Report Content */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    {reportTypes.find(t => t.id === selectedReportType)?.name} - {dateRanges.find(r => r.id === dateRange)?.name}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">24</div>
                      <div className="text-sm text-gray-400">Active Cameras</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-400">7</div>
                      <div className="text-sm text-gray-400">Safety Alerts</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-400">98.5%</div>
                      <div className="text-sm text-gray-400">Uptime</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">A+</div>
                      <div className="text-sm text-gray-400">Safety Grade</div>
                    </div>
                  </div>
                  <p className="text-gray-300 text-sm">
                    This report includes comprehensive analytics on safety metrics, camera performance, 
                    alert patterns, and compliance data for the selected time period.
                  </p>
                </div>

                {/* Recent Reports */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Recent Reports</h3>
                  <div className="space-y-3">
                    {[
                      { name: 'Safety Report - Last 7 Days', date: '2024-01-15', status: 'completed' },
                      { name: 'Alert Analysis - Last 30 Days', date: '2024-01-10', status: 'completed' },
                      { name: 'Camera Performance - Last 90 Days', date: '2024-01-05', status: 'completed' }
                    ].map((report, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                        <div>
                          <div className="text-white font-medium">{report.name}</div>
                          <div className="text-gray-400 text-sm">{report.date}</div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-green-400 text-sm">✓ Completed</span>
                          <button className="text-blue-400 hover:text-blue-300 text-sm">Download</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
'use client';

import React, { useState } from 'react';
import ExportService from '../lib/export-service';

interface ExportButtonProps {
  siteId?: string;
  siteName?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  reportType?: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance' | 'performance' | 'custom';
  reportTitle?: string;
}

interface ExportOptions {
  format: string;
  sections: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

const ExportButton: React.FC<ExportButtonProps> = ({
  siteId,
  siteName = 'Site',
  className = '',
  variant = 'primary',
  size = 'md',
  reportType,
  reportTitle
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  
  // Set default date range based on report type
  const getDefaultDateRange = () => {
    const end = new Date();
    let start = new Date();
    
    switch (reportType) {
      case 'daily':
        start = new Date(end.getTime() - 1 * 24 * 60 * 60 * 1000);
        break;
      case 'weekly':
        start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        start = new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  };
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'pdf',
    sections: ['summary', 'violations', 'cameras', 'analytics'],
    dateRange: getDefaultDateRange()
  });

  const formats = [
    { id: 'pdf', name: 'PDF Report', description: 'Professional formatted report' },
    { id: 'csv', name: 'CSV Data', description: 'Raw data for analysis' },
    { id: 'excel', name: 'Excel Spreadsheet', description: 'Formatted spreadsheet' }
  ];

  const sections = [
    { id: 'summary', name: 'Executive Summary' },
    { id: 'violations', name: 'Safety Violations' },
    { id: 'cameras', name: 'Camera Status' },
    { id: 'analytics', name: 'Analytics & Trends' }
  ];

  const dateRanges = [
    {
      id: 'today',
      name: 'Today',
      getDates: () => ({
        start: new Date().toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      })
    },
    {
      id: 'yesterday',
      name: 'Yesterday',
      getDates: () => {
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0]
        };
      }
    },
    {
      id: 'last7days',
      name: 'Last 7 Days',
      getDates: () => ({
        start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      })
    },
    {
      id: 'last30days',
      name: 'Last 30 Days',
      getDates: () => ({
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      })
    },
    {
      id: 'last90days',
      name: 'Last 90 Days',
      getDates: () => ({
        start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
      })
    }
  ];

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const response = await fetch('/api/export/reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for NextAuth session
        body: JSON.stringify({
          format: exportOptions.format,
          siteId,
          dateRange: exportOptions.dateRange,
          sections: exportOptions.sections,
          includeCharts: true,
          includeRawData: true,
          reportType: reportType || 'custom'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(errorData.error || 'Export failed');
      }

      if (exportOptions.format === 'pdf') {
        // For PDF, we'll generate it client-side
        const data = await response.json();
        await ExportService.generatePDF(data.data, {
          format: 'pdf',
          dateRange: {
            start: new Date(exportOptions.dateRange.start),
            end: new Date(exportOptions.dateRange.end)
          },
          siteId,
          includeCharts: true,
          includeRawData: true,
          sections: exportOptions.sections
        });
      } else {
        // For CSV/Excel, download the file
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        
        const filename = `sitesafe-report-${siteId || 'all-sites'}-${new Date().toISOString().split('T')[0]}.${exportOptions.format === 'excel' ? 'xls' : 'csv'}`;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }

      setIsOpen(false);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to generate export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDateRangeSelect = (rangeId: string) => {
    const range = dateRanges.find(r => r.id === rangeId);
    if (range) {
      setExportOptions(prev => ({
        ...prev,
        dateRange: range.getDates()
      }));
    }
  };

  const handleSectionToggle = (sectionId: string) => {
    setExportOptions(prev => ({
      ...prev,
      sections: prev.sections.includes(sectionId)
        ? prev.sections.filter(id => id !== sectionId)
        : [...prev.sections, sectionId]
    }));
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm rounded-md',
      md: 'px-4 py-2 text-sm rounded-md',
      lg: 'px-6 py-3 text-base rounded-lg'
    };

    const variantClasses = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
      secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
      outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500'
    };

    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={getButtonClasses()}
      >
        {isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Report
          </>
        )}
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal */}
          <div className="absolute right-0 bottom-full mb-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-20 max-h-[80vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">
                  Export {siteName} Report
                </h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 -m-1 rounded-md hover:bg-gray-100 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Format Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <div className="space-y-1.5">
                  {formats.map((format) => (
                    <label key={format.id} className="flex items-center">
                      <input
                        type="radio"
                        name="format"
                        value={format.id}
                        checked={exportOptions.format === format.id}
                        onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{format.name}</div>
                        <div className="text-xs text-gray-500">{format.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Date Range Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {dateRanges.map((range) => (
                    <button
                      key={range.id}
                      onClick={() => handleDateRangeSelect(range.id)}
                      className="text-left px-2 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                    >
                      {range.name}
                    </button>
                  ))}
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-medium">Start Date</label>
                    <input
                      type="date"
                      value={exportOptions.dateRange.start}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, start: e.target.value }
                      }))}
                      className="w-full px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1 font-medium">End Date</label>
                    <input
                      type="date"
                      value={exportOptions.dateRange.end}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        dateRange: { ...prev.dateRange, end: e.target.value }
                      }))}
                      className="w-full px-2 py-1 text-xs text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Sections Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Sections
                </label>
                <div className="space-y-1.5">
                  {sections.map((section) => (
                    <label key={section.id} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={exportOptions.sections.includes(section.id)}
                        onChange={() => handleSectionToggle(section.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="ml-3 text-sm text-gray-900">{section.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-2 border-t border-gray-200">
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExport}
                  disabled={isExporting || exportOptions.sections.length === 0}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? 'Exporting...' : 'Export Report'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExportButton;

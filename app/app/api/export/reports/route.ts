import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import ExportService from '@/lib/export-service';

export async function POST(request: NextRequest) {
  try {
    // Optional: Check for authentication (commented out for now to allow testing)
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const body = await request.json();
    const { 
      format, 
      siteId,
      siteName,
      dateRange, 
      sections = ['summary', 'violations', 'cameras', 'analytics'],
      includeCharts = false,
      includeRawData = true,
      reportType = 'custom'
    } = body;

    // Validate required fields
    if (!format || !['pdf', 'csv', 'excel'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format. Must be pdf, csv, or excel' }, { status: 400 });
    }

    if (!dateRange?.start || !dateRange?.end) {
      return NextResponse.json({ error: 'Date range is required' }, { status: 400 });
    }

    const exportOptions = {
      format,
      dateRange: {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end)
      },
      siteId,
      includeCharts,
      includeRawData,
      sections,
      reportType
    };

    // Get export data based on report type (in production, this would fetch from database)
    let exportData;
    switch (reportType) {
      case 'incident':
        exportData = ExportService.getIncidentReportData(siteId);
        break;
      case 'compliance':
        exportData = ExportService.getComplianceReportData(siteId);
        break;
      case 'performance':
        exportData = ExportService.getPerformanceReportData(siteId);
        break;
      default:
        exportData = ExportService.getMockData(siteId);
    }

    // Helper function to generate timestamp with minutes and seconds
    const getTimestamp = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
    };

    // Helper function to sanitize filename
    const sanitizeFilename = (name: string) => {
      return name.replace(/[^a-z0-9]/gi, '-').toLowerCase().replace(/-+/g, '-').replace(/^-|-$/g, '');
    };

    // Helper function to get time range label
    const getTimeRangeLabel = () => {
      if (reportType && reportType !== 'custom') {
        return reportType;
      }
      // Calculate days from date range
      const start = new Date(dateRange.start);
      const end = new Date(dateRange.end);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      return `${days}d`;
    };

    const sanitizedName = sanitizeFilename(siteName || 'Worksite');
    const timeRangeLabel = getTimeRangeLabel();
    const timestamp = getTimestamp();

    if (format === 'csv') {
      const csvContent = await ExportService.generateCSV(exportData, exportOptions as any);
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${sanitizedName}-${timeRangeLabel}-${timestamp}.csv"`
        }
      });
    }

    if (format === 'pdf') {
      // For PDF, we'll return the data and let the client handle the PDF generation
      // In production, you might want to use Puppeteer or similar for server-side PDF generation
      return NextResponse.json({
        success: true,
        data: exportData,
        options: exportOptions,
        message: 'PDF generation initiated. Use the client-side PDF generator.'
      });
    }

    if (format === 'excel') {
      // For Excel, we'll return CSV format with Excel MIME type
      const csvContent = await ExportService.generateCSV(exportData, exportOptions as any);
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'application/vnd.ms-excel',
          'Content-Disposition': `attachment; filename="${sanitizedName}-${timeRangeLabel}-${timestamp}.xls"`
        }
      });
    }

    return NextResponse.json({ error: 'Unsupported format' }, { status: 400 });

  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json(
      { error: 'Failed to generate export' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Optional: Check for authentication (commented out for now to allow testing)
    // const session = await getServerSession(authOptions);
    // if (!session?.user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Return available export options and formats
    return NextResponse.json({
      formats: [
        {
          id: 'pdf',
          name: 'PDF Report',
          description: 'Professional formatted report with charts and analytics',
          icon: '📄'
        },
        {
          id: 'csv',
          name: 'CSV Data',
          description: 'Raw data export for analysis in Excel or other tools',
          icon: '📊'
        },
        {
          id: 'excel',
          name: 'Excel Spreadsheet',
          description: 'Formatted spreadsheet with multiple sheets',
          icon: '📈'
        }
      ],
      sections: [
        {
          id: 'summary',
          name: 'Executive Summary',
          description: 'Key metrics and overview'
        },
        {
          id: 'violations',
          name: 'Safety Violations',
          description: 'Detailed violation records'
        },
        {
          id: 'cameras',
          name: 'Camera Status',
          description: 'Camera health and status information'
        },
        {
          id: 'analytics',
          name: 'Analytics & Trends',
          description: 'Statistical analysis and trends'
        }
      ],
      dateRanges: [
        {
          id: 'today',
          name: 'Today',
          start: new Date().toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        {
          id: 'yesterday',
          name: 'Yesterday',
          start: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        },
        {
          id: 'last7days',
          name: 'Last 7 Days',
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        {
          id: 'last30days',
          name: 'Last 30 Days',
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        },
        {
          id: 'last90days',
          name: 'Last 90 Days',
          start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      ]
    });

  } catch (error) {
    console.error('Export options error:', error);
    return NextResponse.json(
      { error: 'Failed to get export options' },
      { status: 500 }
    );
  }
}

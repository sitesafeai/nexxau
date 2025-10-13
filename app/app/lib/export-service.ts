/**
 * Export Service - Professional PDF/CSV Report Generation
 * Handles exporting safety reports, analytics, and compliance data
 */

export interface ExportOptions {
  format: 'pdf' | 'csv' | 'excel';
  dateRange: {
    start: Date;
    end: Date;
  };
  siteId?: string;
  includeCharts?: boolean;
  includeRawData?: boolean;
  sections?: string[];
}

export interface ExportData {
  siteInfo: {
    name: string;
    address: string;
    status: string;
    safetyScore: number;
  };
  summary: {
    totalViolations: number;
    totalCameras: number;
    activeAlerts: number;
    complianceRate: number;
    period: string;
  };
  violations: Array<{
    id: string;
    type: string;
    severity: string;
    timestamp: Date;
    camera: string;
    description: string;
    status: string;
  }>;
  cameras: Array<{
    id: string;
    name: string;
    status: string;
    lastSeen: Date;
    alerts: number;
  }>;
  analytics: {
    dailyViolations: Array<{
      date: string;
      count: number;
      types: Record<string, number>;
    }>;
    complianceTrend: Array<{
      date: string;
      score: number;
    }>;
    topViolations: Array<{
      type: string;
      count: number;
      percentage: number;
    }>;
  };
}

class ExportService {
  private static instance: ExportService;

  public static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Generate CSV export
   */
  async generateCSV(data: ExportData, options: ExportOptions): Promise<string> {
    const csvRows: string[] = [];
    
    // Header
    csvRows.push('SiteSafe Export Report');
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push(`Period: ${options.dateRange.start.toDateString()} - ${options.dateRange.end.toDateString()}`);
    csvRows.push('');

    // Site Information
    csvRows.push('Site Information');
    csvRows.push('Name,Address,Status,Safety Score');
    csvRows.push(`"${data.siteInfo.name}","${data.siteInfo.address}","${data.siteInfo.status}",${data.siteInfo.safetyScore}%`);
    csvRows.push('');

    // Summary
    csvRows.push('Summary');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Violations,${data.summary.totalViolations}`);
    csvRows.push(`Total Cameras,${data.summary.totalCameras}`);
    csvRows.push(`Active Alerts,${data.summary.activeAlerts}`);
    csvRows.push(`Compliance Rate,${data.summary.complianceRate}%`);
    csvRows.push('');

    // Violations
    if (options.sections?.includes('violations') || !options.sections) {
      csvRows.push('Safety Violations');
      csvRows.push('ID,Type,Severity,Timestamp,Camera,Description,Status');
      data.violations.forEach(violation => {
        csvRows.push(`"${violation.id}","${violation.type}","${violation.severity}","${violation.timestamp.toISOString()}","${violation.camera}","${violation.description}","${violation.status}"`);
      });
      csvRows.push('');
    }

    // Cameras
    if (options.sections?.includes('cameras') || !options.sections) {
      csvRows.push('Camera Status');
      csvRows.push('ID,Name,Status,Last Seen,Alerts');
      data.cameras.forEach(camera => {
        csvRows.push(`"${camera.id}","${camera.name}","${camera.status}","${camera.lastSeen.toISOString()}",${camera.alerts}`);
      });
      csvRows.push('');
    }

    // Analytics
    if (options.sections?.includes('analytics') || !options.sections) {
      csvRows.push('Daily Violations');
      csvRows.push('Date,Count,Types');
      data.analytics.dailyViolations.forEach(day => {
        const types = Object.entries(day.types).map(([type, count]) => `${type}:${count}`).join(';');
        csvRows.push(`"${day.date}",${day.count},"${types}"`);
      });
      csvRows.push('');

      csvRows.push('Compliance Trend');
      csvRows.push('Date,Score');
      data.analytics.complianceTrend.forEach(trend => {
        csvRows.push(`"${trend.date}",${trend.score}`);
      });
      csvRows.push('');

      csvRows.push('Top Violations');
      csvRows.push('Type,Count,Percentage');
      data.analytics.topViolations.forEach(violation => {
        csvRows.push(`"${violation.type}",${violation.count},${violation.percentage}%`);
      });
    }

    return csvRows.join('\n');
  }

  /**
   * Generate PDF export using browser's print functionality
   * For production, consider using libraries like jsPDF or Puppeteer
   */
  async generatePDF(data: ExportData, options: ExportOptions): Promise<void> {
    // Create a temporary div with formatted content
    const printContent = this.createPDFContent(data, options);
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      throw new Error('Unable to open print window. Please check your popup blocker settings.');
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>SiteSafe Report - ${data.siteInfo.name}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 20px;
              color: #333;
              line-height: 1.6;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #2563eb;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              color: #2563eb;
              margin: 0;
              font-size: 28px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .section {
              margin-bottom: 30px;
              page-break-inside: avoid;
            }
            .section h2 {
              color: #1f2937;
              border-bottom: 1px solid #e5e7eb;
              padding-bottom: 10px;
              margin-bottom: 15px;
            }
            .metric-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
              gap: 15px;
              margin-bottom: 20px;
            }
            .metric-card {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
            }
            .metric-value {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
            }
            .metric-label {
              color: #666;
              font-size: 14px;
              margin-top: 5px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            th, td {
              border: 1px solid #e5e7eb;
              padding: 12px;
              text-align: left;
            }
            th {
              background-color: #f9fafb;
              font-weight: 600;
              color: #374151;
            }
            .severity-high { color: #dc2626; font-weight: bold; }
            .severity-medium { color: #f59e0b; font-weight: bold; }
            .severity-low { color: #10b981; font-weight: bold; }
            .status-active { color: #dc2626; }
            .status-acknowledged { color: #f59e0b; }
            .status-resolved { color: #10b981; }
            @media print {
              body { margin: 0; }
              .section { page-break-inside: avoid; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  }

  private createPDFContent(data: ExportData, options: ExportOptions): string {
    const formatDate = (date: Date) => date.toLocaleDateString();
    const formatDateTime = (date: Date) => date.toLocaleString();

    return `
      <div class="header">
        <h1>SiteSafe Safety Report</h1>
        <p><strong>${data.siteInfo.name}</strong></p>
        <p>${data.siteInfo.address}</p>
        <p>Report Period: ${formatDate(options.dateRange.start)} - ${formatDate(options.dateRange.end)}</p>
        <p>Generated: ${formatDateTime(new Date())}</p>
      </div>

      <div class="section">
        <h2>Executive Summary</h2>
        <div class="metric-grid">
          <div class="metric-card">
            <div class="metric-value">${data.siteInfo.safetyScore}%</div>
            <div class="metric-label">Safety Score</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.summary.totalViolations}</div>
            <div class="metric-label">Total Violations</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.summary.totalCameras}</div>
            <div class="metric-label">Active Cameras</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.summary.activeAlerts}</div>
            <div class="metric-label">Active Alerts</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${data.summary.complianceRate}%</div>
            <div class="metric-label">Compliance Rate</div>
          </div>
        </div>
      </div>

      ${options.sections?.includes('violations') || !options.sections ? `
      <div class="section">
        <h2>Safety Violations</h2>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Severity</th>
              <th>Timestamp</th>
              <th>Camera</th>
              <th>Description</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${data.violations.map(violation => `
              <tr>
                <td>${violation.type}</td>
                <td><span class="severity-${violation.severity.toLowerCase()}">${violation.severity}</span></td>
                <td>${formatDateTime(violation.timestamp)}</td>
                <td>${violation.camera}</td>
                <td>${violation.description}</td>
                <td><span class="status-${violation.status.toLowerCase()}">${violation.status}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${options.sections?.includes('cameras') || !options.sections ? `
      <div class="section">
        <h2>Camera Status</h2>
        <table>
          <thead>
            <tr>
              <th>Camera Name</th>
              <th>Status</th>
              <th>Last Seen</th>
              <th>Alerts</th>
            </tr>
          </thead>
          <tbody>
            ${data.cameras.map(camera => `
              <tr>
                <td>${camera.name}</td>
                <td>${camera.status}</td>
                <td>${formatDateTime(camera.lastSeen)}</td>
                <td>${camera.alerts}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      ${options.sections?.includes('analytics') || !options.sections ? `
      <div class="section">
        <h2>Analytics Summary</h2>
        <h3>Top Violation Types</h3>
        <table>
          <thead>
            <tr>
              <th>Violation Type</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            ${data.analytics.topViolations.map(violation => `
              <tr>
                <td>${violation.type}</td>
                <td>${violation.count}</td>
                <td>${violation.percentage}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="section">
        <p style="text-align: center; color: #666; margin-top: 50px;">
          This report was generated by SiteSafe Safety Monitoring System<br>
          For questions or support, contact your system administrator
        </p>
      </div>
    `;
  }

  /**
   * Download file with proper filename
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Get mock data for testing
   */
  getMockData(siteId?: string): ExportData {
    return {
      siteInfo: {
        name: siteId ? `Construction Site ${siteId}` : 'Construction Site Alpha',
        address: '123 Industrial Blvd, Construction City, CC 12345',
        status: 'Active',
        safetyScore: 87
      },
      summary: {
        totalViolations: 23,
        totalCameras: 8,
        activeAlerts: 3,
        complianceRate: 87,
        period: 'Last 30 days'
      },
      violations: [
        {
          id: 'V-001',
          type: 'Hard Hat Violation',
          severity: 'High',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
          camera: 'Main Entrance',
          description: 'Worker detected without required safety helmet',
          status: 'Active'
        },
        {
          id: 'V-002',
          type: 'Safety Vest Violation',
          severity: 'Medium',
          timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
          camera: 'Safety Zone A',
          description: 'Worker without high-visibility vest',
          status: 'Acknowledged'
        }
      ],
      cameras: [
        {
          id: 'CAM-001',
          name: 'Main Entrance',
          status: 'Online',
          lastSeen: new Date(Date.now() - 5 * 60 * 1000),
          alerts: 2
        },
        {
          id: 'CAM-002',
          name: 'Safety Zone A',
          status: 'Online',
          lastSeen: new Date(Date.now() - 2 * 60 * 1000),
          alerts: 1
        }
      ],
      analytics: {
        dailyViolations: [
          { date: '2024-01-15', count: 5, types: { 'Hard Hat': 3, 'Safety Vest': 2 } },
          { date: '2024-01-14', count: 3, types: { 'Hard Hat': 2, 'Safety Vest': 1 } }
        ],
        complianceTrend: [
          { date: '2024-01-15', score: 87 },
          { date: '2024-01-14', score: 85 }
        ],
        topViolations: [
          { type: 'Hard Hat Violation', count: 12, percentage: 52 },
          { type: 'Safety Vest Violation', count: 8, percentage: 35 },
          { type: 'Restricted Area Access', count: 3, percentage: 13 }
        ]
      }
    };
  }
}

export default ExportService.getInstance();

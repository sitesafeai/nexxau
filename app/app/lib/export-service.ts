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
  reportType?: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance' | 'performance' | 'custom';
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

export interface IncidentReportData extends ExportData {
  incidents: Array<{
    id: string;
    title: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    timestamp: Date;
    location: string;
    camera: string;
    description: string;
    rootCause?: string;
    correctiveActions?: string;
    preventiveMeasures?: string;
    witnesses?: string[];
    evidence?: string[];
    status: 'open' | 'investigating' | 'resolved' | 'closed';
    resolvedBy?: string;
    resolvedAt?: Date;
    resolutionNotes?: string;
  }>;
  incidentStats: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    resolved: number;
    pending: number;
    averageResolutionTime: number; // in hours
  };
}

export interface ComplianceReportData extends ExportData {
  compliance: {
    overallScore: number;
    requirements: Array<{
      id: string;
      category: string;
      requirement: string;
      standard: string; // e.g., "OSHA 1926.501", "ISO 45001"
      status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
      lastAudit: Date;
      nextAudit: Date;
      findings?: string;
      evidence?: string[];
    }>;
    audits: Array<{
      id: string;
      date: Date;
      auditor: string;
      type: 'internal' | 'external' | 'regulatory';
      score: number;
      findings: number;
      correctedFindings: number;
      status: 'completed' | 'in-progress' | 'scheduled';
    }>;
    certifications: Array<{
      name: string;
      issuer: string;
      issueDate: Date;
      expiryDate: Date;
      status: 'valid' | 'expiring-soon' | 'expired';
    }>;
    violations: Array<{
      date: Date;
      regulation: string;
      description: string;
      severity: string;
      correctedDate?: Date;
      responsibleParty: string;
    }>;
  };
}

export interface PerformanceReportData extends ExportData {
  performance: {
    systemHealth: {
      uptime: number; // percentage
      avgResponseTime: number; // ms
      errorRate: number; // percentage
      totalRequests: number;
    };
    cameraPerformance: Array<{
      id: string;
      name: string;
      uptime: number; // percentage
      frameRate: number; // fps
      detectionAccuracy: number; // percentage
      falsePositives: number;
      truePositives: number;
      avgLatency: number; // ms
      bandwidth: number; // mbps
      storageUsed: number; // GB
      lastMaintenance: Date;
      status: 'excellent' | 'good' | 'fair' | 'poor';
    }>;
    aiPerformance: {
      totalDetections: number;
      accuracy: number; // percentage
      precision: number;
      recall: number;
      f1Score: number;
      avgProcessingTime: number; // ms
      modelVersion: string;
      trainingDate: Date;
    };
    alerts: {
      total: number;
      avgResponseTime: number; // minutes
      resolved: number;
      acknowledged: number;
      escalated: number;
      falseAlarms: number;
    };
    resources: {
      cpuUsage: number; // percentage
      memoryUsage: number; // percentage
      storageUsed: number; // GB
      storageTotal: number; // GB
      networkBandwidth: number; // mbps
    };
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
    // Route to specialized generators based on report type
    if (options.reportType === 'incident' && 'incidents' in data) {
      return this.generateIncidentCSV(data as IncidentReportData, options);
    }
    if (options.reportType === 'compliance' && 'compliance' in data) {
      return this.generateComplianceCSV(data as ComplianceReportData, options);
    }
    if (options.reportType === 'performance' && 'performance' in data) {
      return this.generatePerformanceCSV(data as PerformanceReportData, options);
    }
    
    // Default standard report
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
   * Generate Incident Report CSV
   */
  private generateIncidentCSV(data: IncidentReportData, options: ExportOptions): string {
    const csvRows: string[] = [];
    
    csvRows.push('INCIDENT REPORT');
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push(`Period: ${options.dateRange.start.toDateString()} - ${options.dateRange.end.toDateString()}`);
    csvRows.push('');
    
    // Site Info
    csvRows.push('Site Information');
    csvRows.push('Name,Address,Status,Safety Score');
    csvRows.push(`"${data.siteInfo.name}","${data.siteInfo.address}","${data.siteInfo.status}",${data.siteInfo.safetyScore}%`);
    csvRows.push('');
    
    // Incident Statistics
    csvRows.push('Incident Statistics');
    csvRows.push('Total Incidents,Resolved,Pending,Avg Resolution Time (hrs)');
    csvRows.push(`${data.incidentStats.total},${data.incidentStats.resolved},${data.incidentStats.pending},${data.incidentStats.averageResolutionTime}`);
    csvRows.push('');
    
    // Incidents by Severity
    csvRows.push('Incidents by Severity');
    csvRows.push('Severity,Count');
    Object.entries(data.incidentStats.bySeverity).forEach(([severity, count]) => {
      csvRows.push(`"${severity}",${count}`);
    });
    csvRows.push('');
    
    // Detailed Incidents
    csvRows.push('Detailed Incident Log');
    csvRows.push('ID,Title,Severity,Timestamp,Location,Camera,Description,Root Cause,Corrective Actions,Status,Resolved By,Resolution Notes');
    data.incidents.forEach(incident => {
      csvRows.push(`"${incident.id}","${incident.title}","${incident.severity}","${incident.timestamp.toISOString()}","${incident.location}","${incident.camera}","${incident.description}","${incident.rootCause || 'N/A'}","${incident.correctiveActions || 'N/A'}","${incident.status}","${incident.resolvedBy || 'Pending'}","${incident.resolutionNotes || 'N/A'}"`);
    });
    csvRows.push('');
    
    // Witnesses and Evidence
    csvRows.push('Incident Evidence Summary');
    csvRows.push('Incident ID,Witnesses,Evidence Files');
    data.incidents.forEach(incident => {
      const witnesses = incident.witnesses?.join('; ') || 'None';
      const evidence = incident.evidence?.join('; ') || 'None';
      csvRows.push(`"${incident.id}","${witnesses}","${evidence}"`);
    });
    
    return csvRows.join('\n');
  }

  /**
   * Generate Compliance Report CSV
   */
  private generateComplianceCSV(data: ComplianceReportData, options: ExportOptions): string {
    const csvRows: string[] = [];
    
    csvRows.push('COMPLIANCE REPORT');
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push(`Period: ${options.dateRange.start.toDateString()} - ${options.dateRange.end.toDateString()}`);
    csvRows.push('');
    
    // Site Info
    csvRows.push('Site Information');
    csvRows.push('Name,Address,Status,Overall Compliance Score');
    csvRows.push(`"${data.siteInfo.name}","${data.siteInfo.address}","${data.siteInfo.status}",${data.compliance.overallScore}%`);
    csvRows.push('');
    
    // Compliance Requirements
    csvRows.push('Compliance Requirements');
    csvRows.push('ID,Category,Requirement,Standard,Status,Last Audit,Next Audit,Findings');
    data.compliance.requirements.forEach(req => {
      csvRows.push(`"${req.id}","${req.category}","${req.requirement}","${req.standard}","${req.status}","${req.lastAudit.toDateString()}","${req.nextAudit.toDateString()}","${req.findings || 'N/A'}"`);
    });
    csvRows.push('');
    
    // Audit History
    csvRows.push('Audit History');
    csvRows.push('ID,Date,Auditor,Type,Score,Findings,Corrected Findings,Status');
    data.compliance.audits.forEach(audit => {
      csvRows.push(`"${audit.id}","${audit.date.toDateString()}","${audit.auditor}","${audit.type}",${audit.score},${audit.findings},${audit.correctedFindings},"${audit.status}"`);
    });
    csvRows.push('');
    
    // Certifications
    csvRows.push('Active Certifications');
    csvRows.push('Certification,Issuer,Issue Date,Expiry Date,Status');
    data.compliance.certifications.forEach(cert => {
      csvRows.push(`"${cert.name}","${cert.issuer}","${cert.issueDate.toDateString()}","${cert.expiryDate.toDateString()}","${cert.status}"`);
    });
    csvRows.push('');
    
    // Violations
    csvRows.push('Historical Violations');
    csvRows.push('Date,Regulation,Description,Severity,Corrected Date,Responsible Party');
    data.compliance.violations.forEach(violation => {
      csvRows.push(`"${violation.date.toDateString()}","${violation.regulation}","${violation.description}","${violation.severity}","${violation.correctedDate?.toDateString() || 'Pending'}","${violation.responsibleParty}"`);
    });
    
    return csvRows.join('\n');
  }

  /**
   * Generate Performance Report CSV
   */
  private generatePerformanceCSV(data: PerformanceReportData, options: ExportOptions): string {
    const csvRows: string[] = [];
    
    csvRows.push('PERFORMANCE REPORT');
    csvRows.push(`Generated: ${new Date().toISOString()}`);
    csvRows.push(`Period: ${options.dateRange.start.toDateString()} - ${options.dateRange.end.toDateString()}`);
    csvRows.push('');
    
    // Site Info
    csvRows.push('Site Information');
    csvRows.push('Name,Address,Status');
    csvRows.push(`"${data.siteInfo.name}","${data.siteInfo.address}","${data.siteInfo.status}"`);
    csvRows.push('');
    
    // System Health
    csvRows.push('System Health');
    csvRows.push('Metric,Value');
    csvRows.push(`Uptime,${data.performance.systemHealth.uptime}%`);
    csvRows.push(`Avg Response Time,${data.performance.systemHealth.avgResponseTime}ms`);
    csvRows.push(`Error Rate,${data.performance.systemHealth.errorRate}%`);
    csvRows.push(`Total Requests,${data.performance.systemHealth.totalRequests}`);
    csvRows.push('');
    
    // Camera Performance
    csvRows.push('Camera Performance');
    csvRows.push('ID,Name,Uptime %,Frame Rate (fps),Detection Accuracy %,False Positives,True Positives,Avg Latency (ms),Bandwidth (mbps),Storage (GB),Last Maintenance,Status');
    data.performance.cameraPerformance.forEach(camera => {
      csvRows.push(`"${camera.id}","${camera.name}",${camera.uptime},${camera.frameRate},${camera.detectionAccuracy},${camera.falsePositives},${camera.truePositives},${camera.avgLatency},${camera.bandwidth},${camera.storageUsed},"${camera.lastMaintenance.toDateString()}","${camera.status}"`);
    });
    csvRows.push('');
    
    // AI Performance
    csvRows.push('AI Performance Metrics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Detections,${data.performance.aiPerformance.totalDetections}`);
    csvRows.push(`Accuracy,${data.performance.aiPerformance.accuracy}%`);
    csvRows.push(`Precision,${data.performance.aiPerformance.precision}`);
    csvRows.push(`Recall,${data.performance.aiPerformance.recall}`);
    csvRows.push(`F1 Score,${data.performance.aiPerformance.f1Score}`);
    csvRows.push(`Avg Processing Time,${data.performance.aiPerformance.avgProcessingTime}ms`);
    csvRows.push(`Model Version,"${data.performance.aiPerformance.modelVersion}"`);
    csvRows.push(`Training Date,"${data.performance.aiPerformance.trainingDate.toDateString()}"`);
    csvRows.push('');
    
    // Alert Metrics
    csvRows.push('Alert Metrics');
    csvRows.push('Metric,Value');
    csvRows.push(`Total Alerts,${data.performance.alerts.total}`);
    csvRows.push(`Avg Response Time,${data.performance.alerts.avgResponseTime} minutes`);
    csvRows.push(`Resolved,${data.performance.alerts.resolved}`);
    csvRows.push(`Acknowledged,${data.performance.alerts.acknowledged}`);
    csvRows.push(`Escalated,${data.performance.alerts.escalated}`);
    csvRows.push(`False Alarms,${data.performance.alerts.falseAlarms}`);
    csvRows.push('');
    
    // Resource Usage
    csvRows.push('Resource Usage');
    csvRows.push('Resource,Usage');
    csvRows.push(`CPU,${data.performance.resources.cpuUsage}%`);
    csvRows.push(`Memory,${data.performance.resources.memoryUsage}%`);
    csvRows.push(`Storage,${data.performance.resources.storageUsed}GB / ${data.performance.resources.storageTotal}GB`);
    csvRows.push(`Network Bandwidth,${data.performance.resources.networkBandwidth} mbps`);
    
    return csvRows.join('\n');
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

  /**
   * Get mock incident report data
   */
  getIncidentReportData(siteId?: string): IncidentReportData {
    const baseData = this.getMockData(siteId);
    return {
      ...baseData,
      incidents: [
        {
          id: 'INC-001',
          title: 'Fall from Height Incident',
          severity: 'HIGH',
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          location: 'Building A - 3rd Floor',
          camera: 'CAM-003',
          description: 'Worker fell from scaffolding platform, approximately 15 feet high. Emergency services contacted immediately.',
          rootCause: 'Inadequate fall protection equipment and failure to use safety harness',
          correctiveActions: 'All work suspended for safety review. Implemented mandatory harness checks. Additional safety training scheduled.',
          preventiveMeasures: 'Installed additional fall protection anchors. Enhanced pre-work safety inspections. Daily equipment checks.',
          witnesses: ['John Smith (Supervisor)', 'Maria Garcia (Safety Officer)', 'Robert Chen (Co-worker)'],
          evidence: ['incident_photos_001.jpg', 'medical_report.pdf', 'site_inspection.pdf'],
          status: 'investigating',
          resolvedBy: undefined,
          resolvedAt: undefined,
          resolutionNotes: undefined
        },
        {
          id: 'INC-002',
          title: 'Equipment Malfunction - Crane',
          severity: 'HIGH',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          location: 'Loading Zone B',
          camera: 'CAM-007',
          description: 'Tower crane experienced hydraulic failure during lift operation. Load secured safely, no injuries.',
          rootCause: 'Hydraulic pump seal failure due to exceeded service interval',
          correctiveActions: 'Crane removed from service. Complete hydraulic system inspection and repair. Maintenance logs audited.',
          preventiveMeasures: 'Implemented automated maintenance scheduling system. Enhanced equipment inspection protocols.',
          witnesses: ['David Lee (Crane Operator)', 'Sarah Johnson (Site Manager)'],
          evidence: ['crane_inspection_report.pdf', 'maintenance_logs.xlsx', 'hydraulic_test_results.pdf'],
          status: 'resolved',
          resolvedBy: 'Michael Brown (Chief Safety Officer)',
          resolvedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
          resolutionNotes: 'Crane repaired and certified. Operator retrained. Maintenance schedule updated.'
        },
        {
          id: 'INC-003',
          title: 'Chemical Exposure Incident',
          severity: 'MEDIUM',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          location: 'Storage Area C',
          camera: 'CAM-005',
          description: 'Minor chemical splash during material transfer. Worker received immediate first aid and medical evaluation.',
          rootCause: 'Improper container handling and inadequate PPE usage',
          correctiveActions: 'Enhanced PPE requirements for chemical handling. Refresher training on chemical safety protocols.',
          preventiveMeasures: 'New spill containment procedures. Additional safety signage. Secondary containment systems installed.',
          witnesses: ['Lisa Wang (First Responder)', 'Tom Miller (Area Supervisor)'],
          evidence: ['medical_evaluation.pdf', 'incident_photos_003.jpg', 'sds_sheets.pdf'],
          status: 'closed',
          resolvedBy: 'Emily Davis (Safety Coordinator)',
          resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          resolutionNotes: 'All required actions completed. Worker cleared to return. No lasting effects.'
        }
      ],
      incidentStats: {
        total: 3,
        byType: {
          'Fall from Height': 1,
          'Equipment Malfunction': 1,
          'Chemical Exposure': 1
        },
        bySeverity: {
          'CRITICAL': 1,
          'HIGH': 1,
          'MEDIUM': 1,
          'LOW': 0
        },
        resolved: 2,
        pending: 1,
        averageResolutionTime: 48
      }
    };
  }

  /**
   * Get mock compliance report data
   */
  getComplianceReportData(siteId?: string): ComplianceReportData {
    const baseData = this.getMockData(siteId);
    return {
      ...baseData,
      compliance: {
        overallScore: 92,
        requirements: [
          {
            id: 'REQ-001',
            category: 'Fall Protection',
            requirement: 'Fall protection systems required for work at heights >6 feet',
            standard: 'OSHA 1926.501',
            status: 'compliant',
            lastAudit: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            nextAudit: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            findings: 'All fall protection equipment inspected and certified. Documentation complete.',
            evidence: ['fall_protection_cert.pdf', 'inspection_logs.xlsx']
          },
          {
            id: 'REQ-002',
            category: 'Personal Protective Equipment',
            requirement: 'Hard hats, safety glasses, and high-visibility vests required in all work zones',
            standard: 'OSHA 1926.95',
            status: 'compliant',
            lastAudit: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            nextAudit: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
            findings: 'PPE compliance rate exceeds requirements. Adequate inventory maintained.',
            evidence: ['ppe_inventory.xlsx', 'compliance_audit.pdf']
          },
          {
            id: 'REQ-003',
            category: 'Excavation Safety',
            requirement: 'Competent person required for excavations >5 feet deep',
            standard: 'OSHA 1926.651',
            status: 'partial',
            lastAudit: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            nextAudit: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            findings: 'Two designated competent persons. One requires certification renewal.',
            evidence: ['excavation_permits.pdf', 'competent_person_certs.pdf']
          },
          {
            id: 'REQ-004',
            category: 'Electrical Safety',
            requirement: 'Ground-fault circuit interrupters (GFCIs) on temporary power',
            standard: 'OSHA 1926.404',
            status: 'compliant',
            lastAudit: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            nextAudit: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
            findings: 'All temporary power equipped with GFCIs. Monthly testing records current.',
            evidence: ['gfci_test_logs.xlsx', 'electrical_inspection.pdf']
          }
        ],
        audits: [
          {
            id: 'AUD-001',
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            auditor: 'SafetyFirst Consulting Inc.',
            type: 'external',
            score: 94,
            findings: 12,
            correctedFindings: 10,
            status: 'completed'
          },
          {
            id: 'AUD-002',
            date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            auditor: 'Internal Safety Team',
            type: 'internal',
            score: 91,
            findings: 8,
            correctedFindings: 8,
            status: 'completed'
          },
          {
            id: 'AUD-003',
            date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            auditor: 'OSHA Regional Office',
            type: 'regulatory',
            score: 0,
            findings: 0,
            correctedFindings: 0,
            status: 'scheduled'
          }
        ],
        certifications: [
          {
            name: 'ISO 45001:2018',
            issuer: 'International Standards Organization',
            issueDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
            expiryDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000),
            status: 'valid'
          },
          {
            name: 'OSHA VPP Star',
            issuer: 'Occupational Safety and Health Administration',
            issueDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
            expiryDate: new Date(Date.now() + 1095 * 24 * 60 * 60 * 1000),
            status: 'valid'
          },
          {
            name: 'Safety Excellence Award',
            issuer: 'National Safety Council',
            issueDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
            expiryDate: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
            status: 'valid'
          }
        ],
        violations: [
          {
            date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
            regulation: 'OSHA 1926.451(g)(1)',
            description: 'Scaffolding lacking proper guardrails',
            severity: 'Serious',
            correctedDate: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000),
            responsibleParty: 'ABC Construction Co.'
          }
        ]
      }
    };
  }

  /**
   * Get mock performance report data
   */
  getPerformanceReportData(siteId?: string): PerformanceReportData {
    const baseData = this.getMockData(siteId);
    return {
      ...baseData,
      performance: {
        systemHealth: {
          uptime: 99.8,
          avgResponseTime: 125,
          errorRate: 0.2,
          totalRequests: 1250000
        },
        cameraPerformance: [
          {
            id: 'CAM-001',
            name: 'Main Entrance',
            uptime: 99.9,
            frameRate: 30,
            detectionAccuracy: 94.5,
            falsePositives: 12,
            truePositives: 234,
            avgLatency: 85,
            bandwidth: 4.2,
            storageUsed: 125.6,
            lastMaintenance: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
            status: 'excellent'
          },
          {
            id: 'CAM-002',
            name: 'Construction Zone A',
            uptime: 98.5,
            frameRate: 25,
            detectionAccuracy: 91.2,
            falsePositives: 23,
            truePositives: 189,
            avgLatency: 105,
            bandwidth: 3.8,
            storageUsed: 98.3,
            lastMaintenance: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            status: 'good'
          },
          {
            id: 'CAM-003',
            name: 'Parking Lot',
            uptime: 97.2,
            frameRate: 20,
            detectionAccuracy: 88.7,
            falsePositives: 34,
            truePositives: 156,
            avgLatency: 145,
            bandwidth: 3.2,
            storageUsed: 87.4,
            lastMaintenance: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
            status: 'fair'
          }
        ],
        aiPerformance: {
          totalDetections: 15234,
          accuracy: 92.3,
          precision: 0.91,
          recall: 0.89,
          f1Score: 0.90,
          avgProcessingTime: 78,
          modelVersion: 'YOLOv8n-Safety-v2.1',
          trainingDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
        },
        alerts: {
          total: 487,
          avgResponseTime: 4.2,
          resolved: 450,
          acknowledged: 32,
          escalated: 5,
          falseAlarms: 28
        },
        resources: {
          cpuUsage: 42.5,
          memoryUsage: 68.3,
          storageUsed: 2847,
          storageTotal: 5000,
          networkBandwidth: 125.4
        }
      }
    };
  }
}

export default ExportService.getInstance();

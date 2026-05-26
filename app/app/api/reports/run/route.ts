import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// POST /api/reports/run - Run a report and generate export
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { reportSpec, format = 'csv' } = body;

    if (!reportSpec) {
      return NextResponse.json({
        success: false,
        error: 'Report specification is required',
      }, { status: 400 });
    }

    // Generate a unique job ID
    const jobId = `rpt_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // For small reports (<5MB), we can generate synchronously
    // For production, this would be a background job
    
    try {
      // Determine which data to fetch based on entities
      const entities = reportSpec.entities || ['ALERT'];
      const scope = reportSpec.scope || {};
      const fields = reportSpec.fields || [];
      const filters = reportSpec.filters || [];
      
      let data: any[] = [];
      
      // Build date filter
      const dateFilter: any = {};
      if (scope.from) dateFilter.gte = new Date(scope.from);
      if (scope.to) dateFilter.lte = new Date(scope.to);

      // Fetch data based on entities
      for (const entity of entities) {
        switch (entity) {
          case 'ALERT':
            const alerts = await prisma.alert.findMany({
              where: {
                ...(scope.worksiteIds?.length > 0 ? { worksiteId: { in: scope.worksiteIds } } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
              },
              include: {
                camera: { select: { id: true, name: true } },
                worksite: { select: { id: true, name: true } },
                rule: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 10000, // Limit for safety
            });
            data.push(...alerts.map(a => ({
              _entity: 'ALERT',
              id: a.id,
              title: a.title,
              description: a.description,
              severity: a.severity,
              status: a.status,
              createdAt: a.createdAt,
              resolvedAt: a.resolvedAt,
              'camera.name': a.camera?.name,
              'worksite.name': a.worksite?.name,
              'rule.name': a.rule?.name,
            })));
            break;
            
          case 'CAMERA':
            const cameras = await prisma.camera.findMany({
              where: {
                ...(scope.worksiteIds?.length > 0 ? { worksiteId: { in: scope.worksiteIds } } : {}),
              },
              include: {
                worksite: { select: { id: true, name: true } },
              },
            });
            data.push(...cameras.map(c => ({
              _entity: 'CAMERA',
              id: c.id,
              name: c.name,
              status: c.status,
              enabled: (c as any).enabled ?? true, // enabled field may not exist in Camera model
              aiEnabled: (c as any).aiEnabled ?? false, // aiEnabled field may not exist in Camera model
              'worksite.name': c.worksite?.name,
              lastTestAt: (c as any).lastTestAt ?? null, // lastTestAt field may not exist in Camera model
              lastTestOk: (c as any).lastTestOk ?? null, // lastTestOk field may not exist in Camera model
            })));
            break;
            
          case 'INCIDENT':
            const incidents = await prisma.incident.findMany({
              where: {
                ...(scope.worksiteIds?.length > 0 ? { worksiteId: { in: scope.worksiteIds } } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
              },
              orderBy: { createdAt: 'desc' },
              take: 10000,
            });
            data.push(...incidents.map(i => ({
              _entity: 'INCIDENT',
              id: i.id,
              title: i.title,
              description: i.description,
              severity: i.severity,
              status: i.status,
              createdAt: i.createdAt,
              resolvedAt: i.resolvedAt,
              resolutionType: i.resolutionType,
            })));
            break;
            
          case 'USER':
            const users = await prisma.user.findMany({
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                lastLogin: true,
                createdAt: true,
              },
            });
            data.push(...users.map(u => ({
              _entity: 'USER',
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              lastLogin: u.lastLogin,
              createdAt: u.createdAt,
            })));
            break;
            
          case 'AUDIT':
            const auditLogs = await prisma.auditLog.findMany({
              where: {
                ...(scope.worksiteIds?.length > 0 ? { worksiteId: { in: scope.worksiteIds } } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
              },
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 10000,
            });
            data.push(...auditLogs.map(a => ({
              _entity: 'AUDIT',
              id: a.id,
              action: a.action,
              entity: a.entity,
              entityId: a.entityId,
              'user.name': a.user?.name,
              createdAt: a.createdAt,
              ipAddress: a.ipAddress,
            })));
            break;
        }
      }

      // Apply filters
      if (filters.length > 0) {
        data = data.filter(row => {
          return filters.every((filter: any) => {
            const value = row[filter.field];
            switch (filter.op) {
              case 'eq': return value === filter.value;
              case 'neq': return value !== filter.value;
              case 'gt': return value > filter.value;
              case 'lt': return value < filter.value;
              case 'contains': return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
              case 'in': return filter.value.split(',').map((v: string) => v.trim()).includes(value);
              default: return true;
            }
          });
        });
      }

      // Filter to only requested fields if specified
      if (fields.length > 0) {
        data = data.map(row => {
          const filtered: any = {};
          fields.forEach((field: string) => {
            // Remove entity prefix if present
            const fieldName = field.includes('.') && field.split('.')[0] === row._entity 
              ? field.split('.').slice(1).join('.') 
              : field;
            if (row[fieldName] !== undefined) {
              filtered[fieldName] = row[fieldName];
            }
          });
          return filtered;
        });
      }

      // Generate output based on format
      let fileContent: string;
      let contentType: string;
      let fileName: string;
      
      switch (format) {
        case 'json':
          fileContent = JSON.stringify(data, null, 2);
          contentType = 'application/json';
          fileName = `report_${jobId}.json`;
          break;
          
        case 'csv':
        default:
          // Generate CSV
          if (data.length === 0) {
            fileContent = '';
          } else {
            const headers = Object.keys(data[0]);
            const csvRows = [headers.join(',')];
            data.forEach(row => {
              const values = headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Escape quotes and wrap in quotes if contains comma or newline
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                  return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
              });
              csvRows.push(values.join(','));
            });
            fileContent = csvRows.join('\n');
          }
          contentType = 'text/csv';
          fileName = `report_${jobId}.csv`;
          break;
      }

      // For now, return the file directly
      // In production, would save to S3 and return signed URL
      const fileSize = Buffer.byteLength(fileContent, 'utf8');
      
      // Create export record
      // Note: We need a Report to link to, so create a temporary one if none exists
      let reportId: string;
      
      // Check if this is from a saved report
      if (reportSpec.reportId) {
        reportId = reportSpec.reportId;
      } else {
        // Create a temporary report record
        const tempReport = await prisma.report.create({
          data: {
            name: reportSpec.name || `Report ${new Date().toISOString()}`,
            ownerId: user.id,
            isTemplate: false,
            isSystem: false,
            spec: reportSpec,
          },
        });
        reportId = tempReport.id;
      }

      // Create export record
      const exportRecord = await prisma.reportExport.create({
        data: {
          reportId,
          jobId,
          format,
          status: 'ready',
          fileSize,
          requestedBy: user.id,
          requestedAt: new Date(),
          completedAt: new Date(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });

      // Create audit log
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REPORT_EXPORTED',
          entity: 'REPORT',
          entityId: reportId,
          entityName: reportSpec.name,
          details: {
            jobId,
            format,
            rowCount: data.length,
            fileSize,
          },
          result: 'SUCCESS',
          severity: 'LOW',
        },
      });

      // Return inline download for small files
      // In production, would return signed URL to S3
      return new NextResponse(fileContent, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'X-Job-Id': jobId,
          'X-Row-Count': String(data.length),
        },
      });

    } catch (genError: any) {
      console.error('Error generating report:', genError);
      
      // Create failed export record
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REPORT_EXPORT_FAILED',
          entity: 'REPORT',
          details: { error: genError.message, jobId },
          result: 'FAILURE',
          severity: 'ERROR',
        },
      });

      return NextResponse.json({
        success: false,
        error: 'Failed to generate report',
        details: genError.message,
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Error running report:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to run report',
      details: error.message,
    }, { status: 500 });
  }
}


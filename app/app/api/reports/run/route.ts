import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// POST /api/reports/run - Generate and stream a report file
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { reportSpec, format = 'csv' } = body;

    if (!reportSpec) {
      return NextResponse.json({ success: false, error: 'Report specification is required' }, { status: 400 });
    }

    const jobId = `rpt_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const entities: string[] = reportSpec.entities || ['ALERT'];
    const scope = reportSpec.scope || {};
    const fields: string[] = reportSpec.fields || [];
    const filters: any[] = reportSpec.filters || [];

    // Build date filter
    const dateFilter: any = {};
    if (scope.from) dateFilter.gte = new Date(scope.from);
    if (scope.to)   dateFilter.lte = new Date(scope.to);
    const hasDates = Object.keys(dateFilter).length > 0;

    // Worksite filter
    const worksiteFilter = scope.worksiteIds?.length > 0
      ? { worksiteId: { in: scope.worksiteIds } }
      : {};

    let data: any[] = [];

    for (const entity of entities) {
      switch (entity) {

        case 'ALERT': {
          const rows = await prisma.alert.findMany({
            where: {
              ...worksiteFilter,
              ...(hasDates ? { createdAt: dateFilter } : {}),
            },
            include: {
              camera:   { select: { id: true, name: true } },
              worksite: { select: { id: true, name: true } },
              rule:     { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(a => ({
            id:              a.id,
            title:           a.title,
            description:     a.description,
            severity:        a.severity,
            status:          a.status,
            createdAt:       a.createdAt?.toISOString() ?? '',
            resolvedAt:      a.resolvedAt?.toISOString() ?? '',
            'camera.name':   a.camera?.name ?? '',
            'worksite.name': a.worksite?.name ?? '',
            'rule.name':     a.rule?.name ?? '',
          })));
          break;
        }

        // INCIDENT maps to Alert (no Incident model in schema)
        case 'INCIDENT': {
          const rows = await prisma.alert.findMany({
            where: {
              ...worksiteFilter,
              ...(hasDates ? { createdAt: dateFilter } : {}),
            },
            include: {
              camera:   { select: { id: true, name: true } },
              worksite: { select: { id: true, name: true } },
              rule:     { select: { id: true, name: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(a => ({
            incident_id:       a.id,
            created_at:        a.createdAt?.toISOString() ?? '',
            resolved_at:       a.resolvedAt?.toISOString() ?? '',
            title:             a.title,
            worksite:          a.worksite?.name ?? '',
            camera:            a.camera?.name ?? '',
            rule:              a.rule?.name ?? '',
            status:            a.status,
            severity:          a.severity,
            resolution_type:   a.resolvedAt ? 'RESOLVED' : 'OPEN',
          })));
          break;
        }

        case 'DETECTION': {
          const rows = await prisma.detectionLog.findMany({
            where: {
              ...worksiteFilter,
              ...(hasDates ? { timestamp: dateFilter } : {}),
            },
            include: {
              camera: { select: { id: true, name: true } },
            },
            orderBy: { timestamp: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(d => ({
            id:            d.id,
            detectedAt:    d.timestamp?.toISOString() ?? '',
            violationType: d.type,
            confidence:    d.confidence,
            'camera.name': d.camera?.name ?? '',
          })));
          break;
        }

        case 'CAMERA': {
          const rows = await prisma.camera.findMany({
            where: { ...worksiteFilter },
            include: {
              worksite: { select: { id: true, name: true } },
              health:   { orderBy: { lastCheck: 'desc' }, take: 1 },
            },
          });
          data.push(...rows.map(c => ({
            id:              c.id,
            name:            c.name,
            status:          c.status,
            location:        c.location ?? '',
            'worksite.name': c.worksite?.name ?? '',
            lastCheck:       c.health?.[0]?.lastCheck?.toISOString() ?? '',
            healthStatus:    c.health?.[0]?.status ?? 'UNKNOWN',
          })));
          break;
        }

        case 'USER': {
          const rows = await prisma.user.findMany({
            select: {
              id:        true,
              name:      true,
              email:     true,
              role:      true,
              lastLogin: true,
              createdAt: true,
            },
          });
          data.push(...rows.map(u => ({
            id:        u.id,
            name:      u.name ?? '',
            email:     u.email ?? '',
            role:      u.role ?? '',
            lastLogin: u.lastLogin?.toISOString() ?? '',
            createdAt: u.createdAt?.toISOString() ?? '',
          })));
          break;
        }

        case 'AUDIT': {
          const rows = await prisma.auditLog.findMany({
            where: {
              ...(hasDates ? { createdAt: dateFilter } : {}),
            },
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(a => ({
            id:           a.id,
            action:       a.action,
            entity:       a.entity ?? '',
            entityId:     a.entityId ?? '',
            'user.name':  a.user?.name ?? '',
            'user.email': a.user?.email ?? '',
            createdAt:    a.createdAt?.toISOString() ?? '',
            ipAddress:    a.ipAddress ?? '',
            result:       a.result ?? '',
          })));
          break;
        }
      }
    }

    // Apply filters
    if (filters.length > 0) {
      data = data.filter(row =>
        filters.every((f: any) => {
          const val = row[f.field];
          switch (f.op) {
            case 'eq':       return val === f.value;
            case 'neq':      return val !== f.value;
            case 'gt':       return val > f.value;
            case 'lt':       return val < f.value;
            case 'contains': return String(val).toLowerCase().includes(String(f.value).toLowerCase());
            case 'in':       return f.value.split(',').map((v: string) => v.trim()).includes(val);
            default:         return true;
          }
        })
      );
    }

    // Field projection
    if (fields.length > 0 && data.length > 0) {
      const allKeys = Object.keys(data[0]);
      data = data.map(row => {
        const out: any = {};
        for (const f of fields) {
          if (row[f] !== undefined) out[f] = row[f];
        }
        // If field projection left nothing (spec fields don't match real keys), keep all
        return Object.keys(out).length > 0 ? out : row;
      });
    }

    // ── Generate output ──────────────────────────────────────────────────────
    const reportName = (reportSpec.name || 'report').replace(/[^a-zA-Z0-9_-]/g, '_');
    const ts = new Date().toISOString().slice(0, 10);
    let fileContent: string;
    let contentType: string;
    const fileName = `${reportName}_${ts}.${format}`;

    if (format === 'json') {
      fileContent = JSON.stringify({ generated: new Date().toISOString(), rows: data.length, data }, null, 2);
      contentType = 'application/json';
    } else {
      // CSV (default)
      if (data.length === 0) {
        fileContent = `# ${reportSpec.name || 'Report'}\n# Generated: ${new Date().toISOString()}\n# No data for this period.\n`;
      } else {
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        for (const row of data) {
          const values = headers.map(h => {
            const v = row[h];
            if (v === null || v === undefined) return '';
            const s = String(v);
            return s.includes(',') || s.includes('\n') || s.includes('"')
              ? `"${s.replace(/"/g, '""')}"`
              : s;
          });
          csvRows.push(values.join(','));
        }
        fileContent = csvRows.join('\n');
      }
      contentType = 'text/csv';
    }

    // Audit log — best effort, don't crash if it fails
    prisma.auditLog.create({
      data: {
        userId:     user.id,
        action:     'REPORT_EXPORTED',
        entity:     'REPORT',
        entityName: reportSpec.name,
        details:    { jobId, format, rowCount: data.length },
        result:     'SUCCESS',
        severity:   'LOW',
      },
    }).catch(() => {/* ignore */});

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        'Content-Type':        contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'X-Job-Id':            jobId,
        'X-Row-Count':         String(data.length),
      },
    });

  } catch (error: any) {
    console.error('[Reports Run] Error:', error);
    return NextResponse.json({
      success: false,
      error:   error.message ?? 'Failed to run report',
    }, { status: 500 });
  }
}

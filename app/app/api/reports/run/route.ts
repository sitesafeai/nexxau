import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// POST /api/reports/run — fetch data and return JSON; client generates the file
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
    const { reportSpec } = body;
    if (!reportSpec) {
      return NextResponse.json({ success: false, error: 'Report specification is required' }, { status: 400 });
    }

    const entities: string[]  = reportSpec.entities || ['ALERT'];
    const scope                = reportSpec.scope    || {};
    const fields: string[]    = reportSpec.fields   || [];
    const filters: any[]      = reportSpec.filters  || [];

    const dateFilter: any = {};
    if (scope.from) dateFilter.gte = new Date(scope.from);
    if (scope.to)   dateFilter.lte = new Date(scope.to);
    const hasDates = Object.keys(dateFilter).length > 0;

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
            'camera':        a.camera?.name ?? '',
            'worksite':      a.worksite?.name ?? '',
            'rule':          a.rule?.name ?? '',
          })));
          break;
        }

        // INCIDENT = Alert (no Incident model in schema)
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
            incident_id:      a.id,
            created_at:       a.createdAt?.toISOString() ?? '',
            resolved_at:      a.resolvedAt?.toISOString() ?? '',
            title:            a.title,
            worksite:         a.worksite?.name ?? '',
            camera:           a.camera?.name ?? '',
            rule:             a.rule?.name ?? '',
            status:           a.status,
            severity:         a.severity,
            resolution_type:  a.resolvedAt ? 'RESOLVED' : 'OPEN',
          })));
          break;
        }

        case 'DETECTION': {
          const rows = await prisma.detectionLog.findMany({
            where: {
              ...worksiteFilter,
              ...(hasDates ? { timestamp: dateFilter } : {}),
            },
            include: { camera: { select: { id: true, name: true } } },
            orderBy: { timestamp: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(d => ({
            id:             d.id,
            detectedAt:     d.timestamp?.toISOString() ?? '',
            violationType:  d.type,
            confidence:     d.confidence,
            camera:         d.camera?.name ?? '',
          })));
          break;
        }

        case 'CAMERA': {
          const rows = await prisma.camera.findMany({
            where: worksiteFilter,
            include: {
              worksite: { select: { id: true, name: true } },
              health:   { orderBy: { lastCheck: 'desc' }, take: 1 },
            },
          });
          data.push(...rows.map(c => ({
            id:          c.id,
            name:        c.name,
            status:      c.status,
            location:    c.location ?? '',
            worksite:    c.worksite?.name ?? '',
            lastCheck:   c.health?.[0]?.lastCheck?.toISOString() ?? '',
            health:      c.health?.[0]?.status ?? 'UNKNOWN',
          })));
          break;
        }

        case 'USER': {
          const rows = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, lastLogin: true, createdAt: true },
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
              ...worksiteFilter,
              ...(hasDates ? { createdAt: dateFilter } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(a => ({
            id:        a.id,
            action:    a.action,
            entity:    a.entity ?? '',
            entityId:  a.entityId ?? '',
            user:      a.user?.name ?? '',
            email:     a.user?.email ?? '',
            createdAt: a.createdAt?.toISOString() ?? '',
            ip:        a.ipAddress ?? '',
          })));
          break;
        }
      }
    }

    // Apply row filters
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

    // Field projection (only if spec fields actually exist in the data)
    if (fields.length > 0 && data.length > 0) {
      const allKeys = Object.keys(data[0]);
      const validFields = fields.filter(f => allKeys.includes(f));
      if (validFields.length > 0) {
        data = data.map(row => {
          const out: any = {};
          for (const f of validFields) out[f] = row[f];
          return out;
        });
      }
    }

    // Audit (best-effort)
    prisma.auditLog.create({
      data: {
        userId:  user.id,
        action:  'REPORT_EXPORTED',
        entity:  'REPORT',
        metadata: { reportName: reportSpec.name, rowCount: data.length },
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data,
      meta: {
        reportName:  reportSpec.name || 'Report',
        rowCount:    data.length,
        generatedAt: new Date().toISOString(),
        entities,
        dateRange:   { from: scope.from, to: scope.to },
      },
    });

  } catch (error: any) {
    console.error('[Reports Run]', error);
    return NextResponse.json({ success: false, error: error.message ?? 'Failed to run report' }, { status: 500 });
  }
}

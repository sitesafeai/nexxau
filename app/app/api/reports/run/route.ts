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
          // Per-user activity summary: join user record with their audit log stats
          const users = await prisma.user.findMany({
            select: { id: true, name: true, email: true, role: true, lastLogin: true, createdAt: true },
            orderBy: { lastLogin: 'desc' },
          });

          // Batch-fetch audit stats for all users in the date window
          const userIds = users.map(u => u.id);
          const auditRows = await prisma.auditLog.findMany({
            where: {
              userId: { in: userIds },
              ...(hasDates ? { createdAt: dateFilter } : {}),
            },
            select: { userId: true, action: true, createdAt: true, ipAddress: true, metadata: true },
          });

          // Aggregate per user
          const statsMap = new Map<string, {
            logins: number; failedLogins: number; permissionChanges: number;
            actions: number; lastSeen: string; lastIp: string;
          }>();
          for (const row of auditRows) {
            if (!row.userId) continue;
            const s = statsMap.get(row.userId) ?? { logins: 0, failedLogins: 0, permissionChanges: 0, actions: 0, lastSeen: '', lastIp: '' };
            if (row.action === 'LOGIN')          s.logins++;
            if (row.action === 'LOGIN_FAILED')   s.failedLogins++;
            if (row.action === 'USER_ROLE_UPDATED') s.permissionChanges++;
            s.actions++;
            if (!s.lastSeen || row.createdAt > new Date(s.lastSeen)) {
              s.lastSeen = row.createdAt.toISOString();
              s.lastIp   = row.ipAddress ?? '';
            }
            statsMap.set(row.userId, s);
          }

          data.push(...users.map(u => {
            const s = statsMap.get(u.id);
            return {
              name:              u.name ?? '',
              email:             u.email ?? '',
              role:              u.role ?? '',
              lastLogin:         u.lastLogin?.toISOString() ?? 'Never',
              logins:            s?.logins ?? 0,
              failedLogins:      s?.failedLogins ?? 0,
              permissionChanges: s?.permissionChanges ?? 0,
              totalActions:      s?.actions ?? 0,
              lastActiveAt:      s?.lastSeen ?? '',
              lastIp:            s?.lastIp ?? '',
              accountCreated:    u.createdAt?.toISOString() ?? '',
            };
          }));
          break;
        }

        case 'AUDIT': {
          // User-activity-relevant audit log entries
          const USER_ACTIVITY_ACTIONS = [
            'LOGIN', 'LOGIN_FAILED', 'LOGOUT',
            'USER_ROLE_UPDATED', 'USER_REMOVED_FROM_WORKSITE',
            'INVITE', 'CLAIM_ACCOUNT',
          ];
          const rows = await prisma.auditLog.findMany({
            where: {
              action: { in: USER_ACTIVITY_ACTIONS },
              ...(hasDates ? { createdAt: dateFilter } : {}),
            },
            include: { user: { select: { id: true, name: true, email: true } } },
            orderBy: { createdAt: 'desc' },
            take: 10000,
          });
          data.push(...rows.map(a => {
            const meta = (a.metadata as Record<string, any>) ?? {};
            return {
              timestamp:   a.createdAt?.toISOString() ?? '',
              action:      a.action,
              user:        a.user?.name ?? '',
              email:       a.user?.email ?? meta.email ?? '',
              entity:      a.entity ?? '',
              details:     a.action === 'USER_ROLE_UPDATED'
                ? `${meta.oldRole ?? '?'} → ${meta.newRole ?? '?'}`
                : a.action === 'LOGIN_FAILED'
                ? `Failed: ${meta.reason ?? 'unknown'}`
                : a.action === 'INVITE'
                ? `Invited ${meta.invitedEmail ?? '?'} as ${meta.role ?? '?'}`
                : '',
              ipAddress:   a.ipAddress ?? '',
            };
          }));
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

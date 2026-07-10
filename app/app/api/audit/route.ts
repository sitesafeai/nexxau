import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// GET /api/audit - Fetch audit logs with filters
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ 
        data: [], 
        pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
        error: 'Not authenticated' 
      });
    }

    // Get params
    const { searchParams } = new URL(request.url);
    const entity = searchParams.get('entity');
    const worksiteId = searchParams.get('worksiteId');
    const search = searchParams.get('search');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Build where clause - only add conditions if values are truthy
    const where: any = {};

    if (entity && entity.trim()) {
      where.entity = entity.toUpperCase();
    }

    // Only filter by worksite if provided and valid
    if (worksiteId && worksiteId.trim() && worksiteId !== 'undefined' && worksiteId !== 'null') {
      where.worksiteId = worksiteId;
    }

    // Text search across action, entityName, entity
    if (search && search.trim()) {
      where.OR = [
        { action: { contains: search.trim(), mode: 'insensitive' } },
        { entityName: { contains: search.trim(), mode: 'insensitive' } },
        { entity: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    // Date range filter
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = toDate;
      }
    }

    console.log('[Audit API] Query params:', { entity, worksiteId, page, limit });
    console.log('[Audit API] Where clause:', where);

    // Try to fetch audit logs
    let auditLogs: any[] = [];
    let total = 0;

    try {
      [auditLogs, total] = await Promise.all([
        prisma.auditLog.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.auditLog.count({ where }),
      ]);
      console.log('[Audit API] Found', auditLogs.length, 'logs, total:', total);
    } catch (dbError: any) {
      console.error('[Audit API] Database query failed:', dbError.message);
      // Return empty result instead of crashing
      return NextResponse.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
        debug: { error: dbError.message, where }
      });
    }

    // Enrich with user info if we have logs
    if (auditLogs.length > 0) {
      try {
        const userIds = [...new Set(auditLogs.filter(log => log.userId).map(log => log.userId))];
        if (userIds.length > 0) {
          const users = await prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
            select: { id: true, name: true, email: true, role: true },
          });
          const userMap = new Map(users.map(u => [u.id, u]));
          auditLogs = auditLogs.map(log => ({
            ...log,
            user: log.userId ? userMap.get(log.userId) || null : null,
          }));
        }
      } catch (userError: any) {
        console.error('[Audit API] Failed to fetch users:', userError.message);
        // Continue without user info
      }

      try {
        const wsIds = [...new Set(auditLogs.filter(log => log.worksiteId).map(log => log.worksiteId))];
        if (wsIds.length > 0) {
          const worksites = await prisma.worksite.findMany({
            where: { id: { in: wsIds as string[] } },
            select: { id: true, name: true, companyId: true },
          });

          // Also fetch companies referenced by those worksites
          const companyIds = [...new Set(worksites.filter(w => w.companyId).map(w => w.companyId as string))];
          let companyMap = new Map<string, { id: string; name: string }>();
          if (companyIds.length > 0) {
            const companies = await prisma.company.findMany({
              where: { id: { in: companyIds } },
              select: { id: true, name: true },
            });
            companyMap = new Map(companies.map(c => [c.id, c]));
          }

          const wsMap = new Map(worksites.map(w => [w.id, {
            id: w.id,
            name: w.name,
            companyId: w.companyId,
            company: w.companyId ? companyMap.get(w.companyId) || null : null,
          }]));

          auditLogs = auditLogs.map(log => {
            const ws = log.worksiteId ? wsMap.get(log.worksiteId) || null : null;
            return {
              ...log,
              worksite: ws ? { id: ws.id, name: ws.name } : null,
              company: ws?.company || null,
            };
          });
        }
      } catch (wsError: any) {
        console.error('[Audit API] Failed to fetch worksites/companies:', wsError.message);
        // Continue without worksite/company info
      }

      // Flatten metadata fields so the UI can access entityName, severity, result, details directly
      auditLogs = auditLogs.map(log => {
        const meta = (log.metadata as any) || {};
        return {
          ...log,
          entityName: meta.entityName || log.entityId || null,
          severity: meta.severity || 'INFO',
          result: meta.result || 'SUCCESS',
          details: meta.details || null,
        };
      });
    }

    return NextResponse.json({
      data: auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Audit API] Unexpected error:', error);
    // NEVER return 500 - always return empty data
    return NextResponse.json({
      data: [],
      pagination: { page: 1, limit: 50, total: 0, totalPages: 0 },
      error: error.message,
    });
  }
}

// POST /api/audit - Create audit log entry
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();

    const {
      action,
      entity,
      entityId,
      entityName,
      worksiteId,
      companyId,
      changes,
      details,
      result,
      severity,
      metadata,
    } = body;

    if (!action || !entity) {
      return NextResponse.json(
        { error: 'action and entity are required' },
        { status: 400 }
      );
    }

    // Get user ID if authenticated
    let userId = null;
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      userId = user?.id || null;
    }

    // Get IP and user agent from headers
    const ipAddress = request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const auditLog = await prisma.auditLog.create({
      data: {
        userId,
        action: action.toUpperCase(),
        entity: entity.toUpperCase(),
        entityId,
        entityName,
        worksiteId: worksiteId || null,
        companyId: companyId || null,
        changes,
        details,
        result: result || 'SUCCESS',
        severity: severity || 'LOW',
        ipAddress,
        userAgent,
        metadata,
      },
    });

    return NextResponse.json({ success: true, data: auditLog });
  } catch (error: any) {
    console.error('[Audit API] Error creating audit log:', error);
    return NextResponse.json(
      { error: 'Failed to create audit log', details: error.message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// Helper to escape CSV values
function escapeCSV(value: any): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Convert audit logs to CSV format
function auditToCSV(logs: any[]): string {
  const headers = [
    'id', 'timestamp', 'user_name', 'user_email', 'event_type',
    'object_type', 'object_id', 'object_name', 'worksite_name',
    'old_value', 'new_value', 'notes', 'result', 'severity',
    'ip_address', 'user_agent'
  ];

  const rows = logs.map(log => [
    log.id,
    log.createdAt,
    log.user?.name || 'SYSTEM',
    log.user?.email || '',
    log.action,
    log.entity,
    log.entityId || '',
    log.entityName || '',
    log.worksite?.name || '',
    JSON.stringify(log.changes?.old || {}),
    JSON.stringify(log.changes?.new || {}),
    log.details?.notes || '',
    log.result || '',
    log.severity || '',
    log.ipAddress || '',
    log.userAgent || ''
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ].join('\n');
}

// POST /api/audit/export - Export audit logs
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

    // Check permissions - supervisors and above can export audit logs
    const userRole = user.role?.toUpperCase().replace(/-/g, '_') || '';
    const allowedRoles = [
      'SUPER_ADMIN', 'SUPERADMIN', 
      'COMPANY_ADMIN', 'SITE_ADMIN', 'SAFETY_ADMIN',
      'SUPERVISOR', 'ADMIN',
      'SALES_ADMIN', 'MARKETING_ADMIN', 'OPERATIONS_ADMIN',
      'FINANCE_ADMIN', 'HR_ADMIN', 'SUPPORT_ADMIN', 'CUSTOMER_SUCCESS'
    ];
    
    // Allow if role is in allowed list OR if role contains ADMIN
    const hasAccess = allowedRoles.includes(userRole) || userRole.includes('ADMIN') || userRole.includes('SUPERVISOR');
    if (!hasAccess) {
      return NextResponse.json({ error: `Insufficient permissions. Your role: ${user.role}` }, { status: 403 });
    }

    const body = await request.json();
    const { format, filters, range } = body;

    if (!format || !['csv', 'json', 'pdf'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Must be csv, json, or pdf' },
        { status: 400 }
      );
    }

    // Build where clause
    const where: any = {};

    if (filters?.eventTypes?.length) {
      where.action = { in: filters.eventTypes };
    }

    if (filters?.objectTypes?.length) {
      where.entity = { in: filters.objectTypes };
    }

    if (filters?.userIds?.length) {
      where.userId = { in: filters.userIds };
    }

    if (filters?.projects?.length) {
      where.worksiteId = { in: filters.projects };
    }

    if (filters?.severity?.length) {
      where.severity = { in: filters.severity };
    }

    if (range?.from || range?.to) {
      where.createdAt = {};
      if (range.from) where.createdAt.gte = new Date(range.from);
      if (range.to) where.createdAt.lte = new Date(range.to);
    }

    // Restrict to user's worksites if not SUPER_ADMIN
    if (!['SUPER_ADMIN', 'SUPERADMIN'].includes(userRole)) {
      const userWorksites = await prisma.worksiteUser.findMany({
        where: { userId: user.id },
        select: { worksiteId: true },
      });
      const worksiteIds = userWorksites.map(w => w.worksiteId);
      where.worksiteId = { in: worksiteIds };
    }

    // Fetch audit logs (limit to 10000 for exports)
    const auditLogs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        worksite: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000,
    });

    // Generate export based on format
    if (format === 'csv') {
      const csvContent = auditToCSV(auditLogs);
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=audit_export_${new Date().toISOString()}.csv`,
        },
      });
    }

    if (format === 'json') {
      const jsonContent = JSON.stringify(auditLogs, null, 2);
      return new NextResponse(jsonContent, {
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename=audit_export_${new Date().toISOString()}.json`,
        },
      });
    }

    if (format === 'pdf') {
      // For PDF, return JSON that the frontend can use to generate PDF
      // In production, you'd use a PDF library like PDFKit or jsPDF
      return NextResponse.json({
        message: 'PDF export requires client-side generation',
        data: auditLogs,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalRecords: auditLogs.length,
          filters,
          range,
        },
      });
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 });
  } catch (error: any) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to export audit logs', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/support/activity-timeline
 * Get customer activity timeline for support troubleshooting
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const worksiteId = searchParams.get('worksiteId');
    const userId = searchParams.get('userId');
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!companyId && !worksiteId && !userId) {
      return NextResponse.json({ error: 'companyId, worksiteId, or userId is required' }, { status: 400 });
    }

    const timeline: any[] = [];

    // 1. User login history
    const loginLogs = await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN',
        ...(userId ? { userId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    loginLogs.forEach((log) => {
      timeline.push({
        type: 'login',
        timestamp: log.createdAt,
        user: log.user?.email || 'Unknown',
        details: `User logged in from ${log.ipAddress || 'unknown IP'}`,
        metadata: log.metadata,
      });
    });

    // 2. Camera offline/online events
    const cameraEvents = await prisma.auditLog.findMany({
      where: {
        entity: 'Camera',
        action: { in: ['CREATE', 'UPDATE', 'DELETE'] },
        ...(worksiteId
          ? {
              metadata: {
                path: ['worksiteId'],
                equals: worksiteId,
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    cameraEvents.forEach((log) => {
      timeline.push({
        type: 'camera_event',
        timestamp: log.createdAt,
        user: log.user?.email || 'System',
        details: `Camera ${log.action.toLowerCase()}: ${log.entityId}`,
        metadata: log.metadata,
      });
    });

    // 3. Alert generation events
    const alertEvents = await prisma.alert.findMany({
      where: {
        ...(worksiteId ? { worksiteId } : companyId
          ? {
              worksite: {
                companyId,
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        severity: true,
        status: true,
        worksite: {
          select: {
            name: true,
          },
        },
      },
    });

    alertEvents.forEach((alert) => {
      timeline.push({
        type: 'alert',
        timestamp: alert.createdAt,
        user: 'System',
        details: `${alert.severity} alert generated at ${alert.worksite?.name || 'unknown worksite'}`,
        metadata: {
          alertId: alert.id,
          severity: alert.severity,
          status: alert.status,
        },
      });
    });

    // 4. Configuration changes
    const configChanges = await prisma.auditLog.findMany({
      where: {
        entity: { in: ['Worksite', 'Zone', 'Camera'] },
        action: 'UPDATE',
        ...(worksiteId
          ? {
              metadata: {
                path: ['worksiteId'],
                equals: worksiteId,
              },
            }
          : companyId
          ? {
              metadata: {
                path: ['companyId'],
                equals: companyId,
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    configChanges.forEach((log) => {
      timeline.push({
        type: 'config_change',
        timestamp: log.createdAt,
        user: log.user?.email || 'System',
        details: `${log.entity} configuration updated`,
        metadata: log.metadata,
      });
    });

    // Sort by timestamp descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json({
      success: true,
      data: timeline.slice(0, limit),
    });
  } catch (error: any) {
    console.error('[admin][support][activity-timeline] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch activity timeline', details: error.message },
      { status: 500 }
    );
  }
}


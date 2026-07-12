/**
 * GET /api/company/worksites
 *
 * Returns all worksites in the current user's company,
 * with a `hasAccess` flag per site based on worksiteUser assignments.
 * COMPANY_ADMIN and SUPER_ADMIN have access to all sites.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = session.user as any;
  const companyId = user.companyId;
  const role: string = user.role || '';
  const userId: string = user.id;

  if (!companyId) {
    return NextResponse.json(
      { error: 'No company associated with your account' },
      { status: 400 }
    );
  }

  const isAdmin = ['COMPANY_ADMIN', 'SUPER_ADMIN', 'ADMIN'].includes(role);

  // Fetch all worksites for the company with basic stats
  const [worksites, worksiteAccess] = await Promise.all([
    prisma.worksite.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        worksiteName: true,
        location: true,
        address: true,
        status: true,
        createdAt: true,
        _count: {
          select: {
            cameras: true,
            worksiteUsers: true,
            alerts: {
              where: { status: { in: ['ACTIVE', 'ACKNOWLEDGED', 'ESCALATED', 'SNOOZED'] } },
            },
          },
        },
        // Latest safety score
        safetyScores: {
          orderBy: { date: 'desc' },
          take: 1,
          select: { safetyScore: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    }),
    // For non-admins, get their worksite access list
    isAdmin
      ? Promise.resolve([] as { worksiteId: string }[])
      : prisma.worksiteUser.findMany({
          where: { userId },
          select: { worksiteId: true },
        }),
  ]);

  const accessibleIds = new Set(worksiteAccess.map((wu) => wu.worksiteId));

  const result = worksites.map((ws) => ({
    id: ws.id,
    name: ws.name,
    worksiteName: ws.worksiteName,
    location: ws.location,
    address: ws.address,
    status: ws.status,
    createdAt: ws.createdAt,
    cameraCount: ws._count.cameras,
    userCount: ws._count.worksiteUsers,
    activeAlertCount: ws._count.alerts,
    safetyScore: ws.safetyScores[0]?.safetyScore ?? null,
    hasAccess: isAdmin || accessibleIds.has(ws.id),
  }));

  return NextResponse.json({ success: true, data: result });
}

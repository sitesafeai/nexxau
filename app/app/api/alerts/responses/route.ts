import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function GET(request: NextRequest) {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const alertResponses = await prisma.alertResponse.findMany({
      where,
      include: {
        // Note: AlertResponse doesn't have alertRule relation
        alert: {
          select: {
            id: true,
            severity: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json(alertResponses);
  } catch (error) {
    console.error('Failed to fetch alert responses:', error);
    return NextResponse.json({ error: 'Failed to fetch alert responses' }, { status: 500 });
  }
}

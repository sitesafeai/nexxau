import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/admin/billing/history
 * Get billing history for all companies or a specific company
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
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (companyId) {
      where.companyId = companyId;
    }

    const records = await prisma.companyBillingRecord.findMany({
      where,
      include: {
        company: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    // Calculate billing statistics
    const now = new Date();
    const pastDue = records.filter((r) => {
      if (!r.paidThrough) return false;
      return new Date(r.paidThrough) < now;
    }).length;

    const upcomingRenewals = records.filter((r) => {
      if (!r.paidThrough) return false;
      const daysUntilRenewal = (new Date(r.paidThrough).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return daysUntilRenewal > 0 && daysUntilRenewal <= 30;
    }).length;

    return NextResponse.json({
      success: true,
      data: {
        records,
        statistics: {
          total: records.length,
          pastDue,
          upcomingRenewals,
        },
      },
    });
  } catch (error: any) {
    console.error('[admin][billing][history] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch billing history',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


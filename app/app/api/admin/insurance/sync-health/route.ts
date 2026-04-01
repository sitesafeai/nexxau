import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/admin/insurance/sync-health
 * Get insurance integration sync health status
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

    // Get companies with insurance coverage
    const where: any = {};
    if (companyId) {
      where.id = companyId;
    } else {
      // where.insuranceCoverageStatus = { not: null }; // Field doesn't exist in schema
    }

    const companies = await prisma.company.findMany({
      where,
      select: {
        id: true,
        name: true,
        // insuranceCoverageStatus: true, // Field doesn't exist in schema
        worksites: {
          select: {
            id: true,
            name: true,
            alerts: {
              where: {
                createdAt: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
              },
              select: {
                id: true,
                severity: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    // Calculate sync health metrics
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const syncHealth = companies.map((company) => {
      const totalAlerts = company.worksites.reduce((sum, ws) => sum + ws.alerts.length, 0);
      const criticalAlerts = company.worksites.reduce(
        (sum, ws) => sum + ws.alerts.filter((a) => a.severity === 'CRITICAL' || a.severity === 'EMERGENCY').length,
        0
      );

      // Mock last sync time (in production, this would come from an integration sync log)
      const lastSync = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
      const syncStatus = lastSync > last7Days ? 'healthy' : 'stale';

      return {
        companyId: company.id,
        companyName: company.name,
        insuranceStatus: null, // company.insuranceCoverageStatus, // Field doesn't exist in schema
        lastSync: lastSync.toISOString(),
        syncStatus,
        dataDelivered: {
          last7Days: totalAlerts,
          criticalAlerts,
        },
        policiesLinked: 1, // Placeholder
      };
    });

    const overallHealth = {
      totalCompanies: companies.length,
      healthySyncs: syncHealth.filter((s) => s.syncStatus === 'healthy').length,
      staleSyncs: syncHealth.filter((s) => s.syncStatus === 'stale').length,
      totalDataDelivered: syncHealth.reduce((sum, s) => sum + s.dataDelivered.last7Days, 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        syncHealth,
        overallHealth,
      },
    });
  } catch (error: any) {
    console.error('[admin][insurance][sync-health] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch insurance sync health',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


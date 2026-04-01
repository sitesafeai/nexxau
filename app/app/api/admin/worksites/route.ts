import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

type DiagnosticsEntry = {
  scope: string;
  message: string;
};

async function safeQuery<T>(
  scope: string,
  fn: () => Promise<T>,
  fallback: T,
  diagnostics: DiagnosticsEntry[]
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const message =
      error?.message ||
      error?.meta?.cause ||
      error?.code ||
      'Unknown query error';
    console.warn(`[admin][worksites][${scope}]`, message);
    diagnostics.push({
      scope,
      message,
    });
    return fallback;
  }
}

/**
 * GET /api/admin/worksites
 * Optional query params:
 *  - companyId: filter worksites by company
 *  - status: filter by worksite status
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('[admin][worksites] No session');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is super admin
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email || '' },
        select: { role: true, email: true }
      });
    } catch (dbError: any) {
      console.error('[admin][worksites] Database connection error:', dbError);
      return NextResponse.json({
        success: false,
        error: 'Database connection failed',
        data: []
      }, { status: 503 });
    }

    if (!user || (user.role?.toUpperCase() !== 'SUPER_ADMIN' && user.role?.toUpperCase() !== 'SUPERADMIN')) {
      console.log('[admin][worksites] Not super admin, user role:', user?.role);
      return NextResponse.json({ success: false, error: 'Forbidden - Super Admin access required' }, { status: 403 });
    }

    console.log('[admin][worksites] Super admin access confirmed:', user.email);

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const status = searchParams.get('status') || undefined;

    console.log('[admin][worksites] Query params - companyId:', companyId, 'status:', status);

    const diagnostics: DiagnosticsEntry[] = [];

    const whereClause: any = {};
    if (companyId) {
      whereClause.companyId = companyId;
      console.log('[admin][worksites] Filtering by companyId:', companyId);
    } else {
      // When "All Companies" is selected, show all worksites including those with NULL companyId
      // Don't filter by companyId at all
    }
    if (status) {
      whereClause.status = status;
    }

    console.log('[admin][worksites] Where clause:', JSON.stringify(whereClause));

    // First, let's check if ANY worksites exist at all
    const totalWorksitesCount = await prisma.worksite.count().catch(() => 0);
    console.log(`[admin][worksites] Total worksites in database: ${totalWorksitesCount}`);
    
    // If no companyId filter and no worksites returned, this is the issue
    if (!companyId) {
      console.log('[admin][worksites] *** ALL COMPANIES selected - should return ALL worksites ***');
      console.log('[admin][worksites] Total worksites that should be returned:', totalWorksitesCount);
    }

    // If filtering by companyId, check how many worksites have that companyId
    if (companyId) {
      const countForCompany = await prisma.worksite.count({
        where: { companyId }
      }).catch(() => 0);
      console.log(`[admin][worksites] Worksites with companyId ${companyId}: ${countForCompany}`);
      
      // Also check what companyIds actually exist in worksites
      const sampleWorksites = await prisma.worksite.findMany({
        take: 10,
        select: { 
          id: true, 
          name: true, 
          companyId: true,
          worksiteName: true
        }
      }).catch(() => []);
      console.log(`[admin][worksites] Sample worksites (first 10) with their companyIds:`, sampleWorksites);
      
      // Get unique companyIds from all worksites
      const allWorksites = await prisma.worksite.findMany({
        select: { companyId: true }
      }).catch(() => []);
      const uniqueCompanyIds = [...new Set(allWorksites.map(w => w.companyId).filter(Boolean))];
      console.log(`[admin][worksites] Unique companyIds in worksites:`, uniqueCompanyIds);
    }

    // Fetch worksites WITHOUT company relation first to avoid orphaned relation errors
    const worksites = await safeQuery(
      'worksite.findMany',
      () =>
        prisma.worksite.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            worksiteName: true,
            location: true,
            address: true,
            companyId: true,
            status: true,
            cameraSystemType: true,
            createdAt: true,
            updatedAt: true,
            cameras: {
              select: {
                id: true,
                status: true,
                mediamtxPath: true,
                metadata: true,
              },
            },
            safetyScores: {
              orderBy: {
                date: 'desc',
              },
              take: 1,
              select: {
                safetyScore: true,
                date: true,
              },
            },
            alerts: {
              orderBy: {
                createdAt: 'desc',
              },
              take: 3,
              select: {
                id: true,
                severity: true,
                status: true,
                createdAt: true,
              },
            },
          },
          orderBy: {
            updatedAt: 'desc',
          },
        }),
      [],
      diagnostics
    );

    // Fetch companies separately to avoid orphaned relation issues
    const companyIds = [...new Set(worksites.map(ws => ws.companyId).filter(Boolean))] as string[];
    const companies = companyIds.length > 0 
      ? await prisma.company.findMany({
          where: { id: { in: companyIds } },
          select: {
            id: true,
            name: true,
            companyUsername: true,
          }
        }).catch(() => [])
      : [];
    
    // Create a map of company data
    const companyMap = new Map(companies.map(c => [c.id, c]));

    console.log(`[admin][worksites] Found ${worksites.length} worksites after query`);
    if (diagnostics.length > 0) {
      console.log('[admin][worksites] Diagnostics:', diagnostics);
    }

    // If filtering by companyId and found 0, let's check if any worksites exist for that company
    if (companyId && worksites.length === 0) {
      try {
        const totalWorksites = await prisma.worksite.count();
        const worksitesForThisCompany = await prisma.worksite.count({
          where: { companyId }
        });
        console.log(`[admin][worksites] Debug - Total worksites: ${totalWorksites}, For company ${companyId}: ${worksitesForThisCompany}`);
        
        // Also check if there are any worksites with this companyId but different status
        const allWorksitesForCompany = await prisma.worksite.findMany({
          where: { companyId },
          select: { 
            id: true, 
            name: true, 
            status: true, 
            companyId: true,
            worksiteName: true
          }
        });
        console.log(`[admin][worksites] All worksites for company:`, allWorksitesForCompany);
      } catch (debugError: any) {
        // If the debug query fails, just log it but don't crash
        console.error('[admin][worksites] Debug query failed:', debugError?.message);
      }
    }

    const enriched = worksites.map((worksite) => {
      const cameraCount = worksite.cameras.length;
      const onlineCameras = worksite.cameras.filter((camera) => {
        const statusValue = (camera.status || 'active').toLowerCase();
        return statusValue === 'online' || statusValue === 'active';
      }).length;
      const latestScore = worksite.safetyScores[0]?.safetyScore ?? null;
      const latestScoreDate = worksite.safetyScores[0]?.date ?? null;
      const latestAlert = worksite.alerts[0]?.createdAt ?? null;

      const activityCandidates = [
        worksite.updatedAt,
        latestAlert,
        latestScoreDate,
      ].filter((value): value is Date => Boolean(value));

      const lastActivity =
        activityCandidates.length > 0
          ? new Date(
              Math.max(
                ...activityCandidates.map((candidate) => candidate.getTime())
              )
            )
          : null;

      // Get company from the map we built
      const company = worksite.companyId ? companyMap.get(worksite.companyId) : null;

      return {
        id: worksite.id,
        name: worksite.name,
        status: worksite.status,
        location: worksite.location,
        address: worksite.address,
        companyId: worksite.companyId,
        company: company
          ? {
              id: company.id,
              name: company.name,
              slug: company.companyUsername,
            }
          : null,
        cameraCount,
        onlineCameraCount: onlineCameras,
        latestScore,
        complianceRate: latestScore !== null ? latestScore / 100 : null,
        lastActivity: lastActivity ? lastActivity.toISOString() : null,
        alerts: worksite.alerts.map((alert) => ({
          id: alert.id,
          severity: alert.severity,
          status: alert.status,
          createdAt: alert.createdAt,
        })),
        metadata: {
          mediamtxPaths: worksite.cameras
            .map((camera) => camera.mediamtxPath)
            .filter(Boolean),
        },
        createdAt: worksite.createdAt,
        updatedAt: worksite.updatedAt,
      };
    });

    console.log(`[admin][worksites] Returning ${enriched.length} worksites to client`);
    if (enriched.length === 0 && totalWorksitesCount > 0) {
      console.warn('[admin][worksites] WARNING: Database has worksites but query returned 0!');
      console.warn('[admin][worksites] This suggests the whereClause is filtering everything out');
      console.warn('[admin][worksites] whereClause:', JSON.stringify(whereClause));
    }

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length,
      diagnostics,
    });
  } catch (error: any) {
    console.error('[admin][worksites] Failed to list worksites', error);
      return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch worksites',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/worksites
 * Update worksite companyId (bulk update for worksites without companyId)
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, worksiteId, companyId } = body;

    if (action === 'assign-company' && worksiteId && companyId) {
      // Update a single worksite's companyId
      const updated = await prisma.worksite.update({
        where: { id: worksiteId },
        data: { companyId },
        select: { id: true, name: true, companyId: true }
      });

      return NextResponse.json({
        success: true,
        data: updated,
        message: `Worksite ${updated.name} assigned to company`
      });
    }

    if (action === 'assign-all-orphaned' && companyId) {
      // This action is not needed since companyId is required in the schema
      // But we can use it to reassign worksites if needed
      return NextResponse.json({
        success: false,
        error: 'All worksites must have a companyId. Use assign-company to update individual worksites.'
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Invalid action or missing parameters'
    }, { status: 400 });

  } catch (error: any) {
    console.error('[admin][worksites] PATCH error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update worksites',
      details: error?.message ?? 'Unknown error'
    }, { status: 500 });
  }
}
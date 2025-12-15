import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { checkRole } from '@/app/lib/api-helpers';

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
    console.warn(`[admin][cameras][${scope}]`, message);
    diagnostics.push({
      scope,
      message,
    });
    return fallback;
  }
}

/**
 * GET /api/admin/cameras
 * Query params:
 *  - companyId (optional)
 *  - worksiteId (optional)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user has required role (SUPER_ADMIN)
    const roleCheck = checkRole(session.user.role, 'SUPER_ADMIN', 'access admin cameras');
    if (roleCheck) {
      return roleCheck;
    }

    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const worksiteId = searchParams.get('worksiteId') || undefined;

    const where: any = {};

    if (worksiteId) {
      where.worksiteId = worksiteId;
      console.log(`[admin][cameras] Filtering by worksiteId: ${worksiteId}`);
      
      // Debug: Check if cameras exist for this worksiteId
      const cameraCount = await prisma.camera.count({
        where: { worksiteId }
      }).catch(() => 0);
      console.log(`[admin][cameras] Total cameras in database for worksiteId ${worksiteId}: ${cameraCount}`);
      
      // Debug: Get a sample of camera worksiteIds to see what's actually in the DB
      const sampleCameras = await prisma.camera.findMany({
        take: 5,
        select: {
          id: true,
          name: true,
          worksiteId: true
        }
      }).catch(() => []);
      console.log(`[admin][cameras] Sample cameras (first 5) with their worksiteIds:`, sampleCameras);
    } else if (companyId) {
      where.worksite = {
        companyId,
      };
      console.log(`[admin][cameras] Filtering by companyId: ${companyId}`);
    } else {
      console.log(`[admin][cameras] No filters - returning all cameras`);
      // When no filters, show all cameras - don't add any where clause
    }
    
    // Debug: Log total camera count in database (only in development)
    if (process.env.NODE_ENV === 'development') {
      const totalCameraCount = await prisma.camera.count().catch(() => 0);
      console.log(`[admin][cameras] Total cameras in database: ${totalCameraCount}`);
    }

    const diagnostics: DiagnosticsEntry[] = [];

    const cameras = await safeQuery(
      'camera.findMany',
      () =>
        prisma.camera.findMany({
          where,
          include: {
            worksite: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true,
                    companyUsername: true,
                  },
                },
              },
            },
            trainingImages: {
              select: {
                id: true,
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

    console.log(`[admin][cameras] Found ${cameras.length} cameras in database with where clause:`, JSON.stringify(where));
    if (worksiteId && cameras.length === 0) {
      console.warn(`[admin][cameras] ⚠️ No cameras found for worksiteId ${worksiteId}, but worksites API shows cameras exist. Possible data mismatch.`);
    }

    const enriched = cameras.map((camera) => {
      const status = (camera.status || 'active').toLowerCase();
      const isOnline = status === 'online' || status === 'active';
      const lastUpdated = camera.updatedAt || camera.createdAt;

      return {
        id: camera.id,
        name: camera.name,
        status: camera.status,
        type: camera.type,
        streamUrl: camera.streamUrl,
        hlsUrl: camera.hlsUrl,
        mediamtxPath: camera.mediamtxPath,
        metadata: camera.metadata,
        ipAddress: camera.ipAddress,
        port: camera.port,
        username: camera.username,
        worksiteId: camera.worksiteId,
        worksite: camera.worksite
          ? {
              id: camera.worksite.id,
              name: camera.worksite.name,
              location: camera.worksite.location,
              status: camera.worksite.status,
              company: camera.worksite.company
                ? {
                    id: camera.worksite.company.id,
                    name: camera.worksite.company.name,
                    slug: camera.worksite.company.companyUsername,
                  }
                : null,
            }
          : null,
        lastHeartbeat: (camera.metadata && typeof camera.metadata === 'object' && 'lastHeartbeat' in camera.metadata)
          ? (camera.metadata as any).lastHeartbeat ?? null
          : null,
        online: isOnline,
        trainingImageCount: camera.trainingImages.length,
        lastUpdated: lastUpdated.toISOString(),
        createdAt: camera.createdAt.toISOString(),
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      count: enriched.length,
      diagnostics,
    });
  } catch (error: any) {
    console.error('[admin][cameras] Failed to list cameras', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cameras',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}



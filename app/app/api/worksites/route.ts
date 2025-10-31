import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/worksites
 * Get all worksites with real-time stats
 */
export async function GET(request: NextRequest) {
  try {
    const worksites = await prisma.worksite.findMany({
      include: {
        _count: {
          select: {
            cameras: true,
            alerts: true,
            workers: true
          }
        },
        cameras: {
          select: {
            id: true,
            status: true
          }
        }
      }
    });

    // Enrich with real-time stats
    const enrichedWorksites = await Promise.all(
      worksites.map(async (worksite) => {
        // Get latest safety score
        const latestScore = await prisma.safetyScore.findFirst({
          where: { worksiteId: worksite.id },
          orderBy: { date: 'desc' },
          select: {
            safetyScore: true,
            grade: true
          }
        });

    // Get active alerts count (using proper ENUM values)
    const activeAlertsCount = await prisma.alert.count({
      where: {
        worksiteId: worksite.id,
        status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
      }
    });

        // Get last activity (most recent camera update or alert)
        const lastCameraUpdate = await prisma.camera.findFirst({
          where: { worksiteId: worksite.id },
          orderBy: { lastHealthCheck: 'desc' },
          select: { lastHealthCheck: true }
        });

        const lastAlert = await prisma.alert.findFirst({
          where: { worksiteId: worksite.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });

        const lastActivityTime = [
          lastCameraUpdate?.lastHealthCheck,
          lastAlert?.createdAt
        ]
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

        const lastActivity = lastActivityTime
          ? getTimeAgo(new Date(lastActivityTime))
          : 'No activity';

        // Determine site status based on camera status
        const onlineCameras = worksite.cameras.filter(c => c.status === 'online').length;
        const totalCameras = worksite.cameras.length;
        
        let status = 'active';
        if (totalCameras === 0) {
          status = 'inactive';
        } else if (onlineCameras === 0) {
          status = 'offline';
        } else if (onlineCameras < totalCameras * 0.5) {
          status = 'maintenance';
        }

        return {
          id: worksite.id,
          name: worksite.name,
          worksiteName: worksite.worksiteName,
          address: worksite.address,
          companyId: worksite.companyId,
          status,
          cameras: worksite._count.cameras,
          alerts: activeAlertsCount,
          workers: worksite._count.workers,
          lastActivity,
          safetyScore: latestScore?.safetyScore || 0,
          grade: latestScore?.grade || 'N/A',
          cameraSystemType: worksite.cameraSystemType,
          createdAt: worksite.createdAt,
          updatedAt: worksite.updatedAt
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedWorksites
    });
  } catch (error: any) {
    console.error('Error fetching worksites:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch worksites', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worksites
 * Create a new worksite
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, worksiteName: providedWorksiteName, location, address, companyId, cameraSystemType } = body;

    if (!name || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, companyId' },
        { status: 400 }
      );
    }

    // Use provided worksiteName or generate from name
    const worksiteName = providedWorksiteName || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const worksite = await prisma.worksite.create({
      data: {
        name,
        worksiteName,
        location,
        address,
        companyId,
        cameraSystemType: cameraSystemType || 'mixed',
        status: 'ACTIVE'
      }
    });

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error creating worksite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create worksite', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

// Initialize Prisma client directly in this route
const prisma = new PrismaClient();

/**
 * GET /api/worksites/:id
 * Get a single worksite with real-time stats
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const worksite = await prisma.worksite.findUnique({
      where: { id },
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
            status: true,
            lastHealthCheck: true
          }
        }
      }
    });

    if (!worksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // Get latest safety score
    const latestScore = await prisma.safetyScore.findFirst({
      where: { worksiteId: worksite.id },
      orderBy: { date: 'desc' },
      select: {
        safetyScore: true,
        grade: true
      }
    });

    // Get active alerts count
    const activeAlertsCount = await prisma.alert.count({
      where: {
        worksiteId: worksite.id,
        status: { in: ['active', 'acknowledged'] }
      }
    });

    // Get last activity
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

    // Determine site status
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

    const enrichedWorksite = {
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
      safetyScore: Math.round(latestScore?.safetyScore || 0),
      grade: latestScore?.grade || 'N/A',
      cameraSystemType: worksite.cameraSystemType,
      createdAt: worksite.createdAt,
      updatedAt: worksite.updatedAt
    };

    return NextResponse.json({
      success: true,
      data: enrichedWorksite
    });
  } catch (error: any) {
    console.error('Error fetching worksite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch worksite', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/worksites/:id
 * Update a worksite
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const worksite = await prisma.worksite.update({
      where: { id },
      data: body
    });

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error updating worksite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update worksite', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worksites/:id
 * Delete a worksite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await prisma.worksite.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Worksite deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting worksite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to delete worksite', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

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


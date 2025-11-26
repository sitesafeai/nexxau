import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { logCreate } from '@/app/lib/audit-logger';
import { createWorksiteSchema } from '@/app/lib/validation/worksites';
import { validateQuery, validateBody } from '@/app/lib/validation/common';

/**
 * GET /api/worksites
 * Get all worksites with real-time stats (filtered by user access)
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build filter based on user role
    let whereClause: any = {};

    if (user.role === 'SUPER_ADMIN') {
      // Super admin sees everything
      whereClause = {};
    } else if (user.role === 'COMPANY_ADMIN') {
      // Company admin sees only their company's worksites
      whereClause = {
        companyId: user.companyId
      };
    } else {
      // SITE_ADMIN, SUPERVISOR, WORKER, VIEWER - only worksites they have access to
      whereClause = {
        worksiteUsers: {
          some: {
            userId: user.id
          }
        }
      };
    }

    const worksites = await prisma.worksite.findMany({
      where: whereClause,
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

        // If no safety score exists, return null (will show "Not calculated" in UI)
        // Safety scores should be calculated via scheduled jobs or manual triggers
        const safetyScore = latestScore?.safetyScore ?? null;
        const grade = latestScore?.grade ?? null;

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
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        });

        const lastAlert = await prisma.alert.findFirst({
          where: { worksiteId: worksite.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });

        const lastActivityTime = [
          lastCameraUpdate?.updatedAt,
          lastAlert?.createdAt
        ]
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

        const lastActivity = lastActivityTime
          ? getTimeAgo(new Date(lastActivityTime))
          : 'No activity';

        // Determine site status based on camera status
        // Check both 'online' and 'active' status (camera.status is a string, not enum)
        const onlineCameras = worksite.cameras.filter(c => 
          c.status?.toLowerCase() === 'online' || 
          c.status?.toLowerCase() === 'active'
        ).length;
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
          safetyScore: safetyScore ?? null,
          grade: grade ?? null,
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
 * Create a new worksite (COMPANY_ADMIN and SUPER_ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN and COMPANY_ADMIN can create worksites
    if (user.role !== 'SUPER_ADMIN' && user.role !== 'COMPANY_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create worksite' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(createWorksiteSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, worksiteName: providedWorksiteName, location, address, companyId, cameraSystemType } = validation.data;

    // Company admins can only create worksites in their own company
    if (user.role === 'COMPANY_ADMIN' && companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, error: 'You can only create worksites in your own company' },
        { status: 403 }
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
        address: address || '', // Default to empty string if not provided
        companyId,
        cameraSystemType: cameraSystemType || 'mixed',
        status: 'ACTIVE'
      }
    });

    // Log audit trail
    await logCreate(user.id, 'Worksite', worksite.id, worksite, request);

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

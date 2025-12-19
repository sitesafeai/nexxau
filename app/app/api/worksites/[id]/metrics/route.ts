import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksiteId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    if (!worksiteId) {
      return NextResponse.json(
        { error: 'Worksite ID is required' },
        { status: 400 }
      );
    }

    // Try to get user by email first (more reliable than id)
    const userEmail = session.user.email;
    let user = null;
    
    if (userEmail) {
      user = await prisma.user.findUnique({
        where: { email: userEmail },
        include: {
          company: {
            include: {
              worksites: {
                where: { id: worksiteId }
              }
            }
          }
        }
      });
    }
    
    // Fallback to id if email lookup failed
    if (!user && (session.user as any).id) {
      user = await prisma.user.findUnique({
        where: { id: (session.user as any).id },
        include: {
          company: {
            include: {
              worksites: {
                where: { id: worksiteId }
              }
            }
          }
        }
      });
    }

    // For SUPER_ADMIN or if user lookup failed (allow for development), check worksite directly
    const userRole = user?.role || (session.user as any)?.role;
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'super_admin';
    
    // If user not found but session exists, allow super admin access
    if (!user && !isSuperAdmin) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const hasAccess = isSuperAdmin || 
      (user?.company?.worksites?.some(ws => ws.id === worksiteId));

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Fetch worksite with cameras and alerts
    let worksite;
    try {
      worksite = await prisma.worksite.findUnique({
        where: { id: worksiteId },
        include: {
          cameras: {
            select: {
              id: true,
              status: true,
              aiEnabled: true,
              lastDetection: true
            }
          },
          alerts: {
            where: {
              status: { in: ['active', 'ACTIVE', 'Active'] }
            },
            select: {
              id: true,
              severity: true,
              createdAt: true
            }
          },
          safetyScores: {
            orderBy: {
              date: 'desc'
            },
            take: 1,
            select: {
              safetyScore: true,
              date: true
            }
          }
        }
      });
    } catch (dbError: any) {
      console.error('Database query error:', dbError.message);
      // Try simpler query without relations
      worksite = await prisma.worksite.findUnique({
        where: { id: worksiteId }
      });
      if (worksite) {
        (worksite as any).cameras = [];
        (worksite as any).alerts = [];
        (worksite as any).safetyScores = [];
      }
    }

    if (!worksite) {
      return NextResponse.json(
        { error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // Calculate metrics with safe defaults
    const cameras = worksite.cameras || [];
    const activeCameras = cameras.filter(c => {
      const status = (c.status || 'active').toLowerCase();
      return status === 'online' || status === 'active';
    }).length;
    const offlineCameras = cameras.length - activeCameras;
    const aiEnabledCameras = cameras.filter(c => c.aiEnabled === true).length;

    const alerts = worksite.alerts || [];
    const highAlerts = alerts.filter(a => a.severity?.toLowerCase() === 'high').length;
    const mediumAlerts = alerts.filter(a => a.severity?.toLowerCase() === 'medium').length;
    const lowAlerts = alerts.filter(a => a.severity?.toLowerCase() === 'low').length;

    const latestScore = worksite.safetyScores?.[0]?.safetyScore ?? null;
    
    // Get last activity (most recent alert or camera detection)
    let lastActivity: number | null = null;
    
    try {
      const timestamps: number[] = [];
      
      // Add alert timestamps
      for (const alert of alerts) {
        if (alert.createdAt) {
          const ts = new Date(alert.createdAt).getTime();
          if (!isNaN(ts)) timestamps.push(ts);
        }
      }
      
      // Add camera detection timestamps
      for (const camera of cameras) {
        if (camera.lastDetection) {
          const ts = new Date(camera.lastDetection).getTime();
          if (!isNaN(ts)) timestamps.push(ts);
        }
      }
      
      // Add worksite updated timestamp
      if (worksite.updatedAt) {
        const ts = new Date(worksite.updatedAt).getTime();
        if (!isNaN(ts)) timestamps.push(ts);
      }
      
      if (timestamps.length > 0) {
        lastActivity = Math.max(...timestamps);
      }
    } catch (e) {
      console.error('Error calculating last activity:', e);
    }

    return NextResponse.json({
      activeCameras,
      offlineCameras,
      aiEnabledCameras,
      totalCameras: cameras.length,
      totalAlerts: alerts.length,
      highAlerts,
      mediumAlerts,
      lowAlerts,
      safetyScore: latestScore,
      lastActivity: lastActivity ? new Date(lastActivity).toISOString() : null
    });
  } catch (error: any) {
    console.error('Error fetching worksite metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}


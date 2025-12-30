import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { Cache, CacheKeys } from '@/app/lib/cache';
import { isCameraOnline, getCameraStatusMetrics } from '@/app/lib/camera-status';

/**
 * GET /api/worksites/[id]/metrics
 * 
 * Returns aggregated metrics for a worksite.
 * 
 * Internal Architecture:
 * - Split into independent functions for clarity and future caching:
 *   - getCameraMetrics(): Camera online/offline counts (derived from health)
 *   - getAlertMetrics(): Alert counts by severity
 *   - getSafetyScoreMetrics(): Latest safety score
 *   - getLastActivity(): Most recent activity timestamp
 * 
 * Camera Status:
 * - Derived from CameraHealth records, NOT from camera.status string
 * - Uses isCameraOnline() helper for consistent logic
 * - Online = latest health check < 60s ago AND status === 'ONLINE'
 * 
 * Each function is independently callable and cacheable for future optimization.
 */

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
          worksiteAccess: {
            where: { worksiteId },
            select: { worksiteId: true, role: true }
          },
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
          worksiteAccess: {
            where: { worksiteId },
            select: { worksiteId: true, role: true }
          },
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

    // Check access: SUPER_ADMIN, company worksite access, or worksiteAccess
    const hasAccess = isSuperAdmin || 
      (user?.company?.worksites?.some(ws => ws.id === worksiteId)) ||
      (user?.worksiteAccess && user.worksiteAccess.length > 0);

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
              // aiEnabled: true, // Field doesn't exist in Camera model
              // lastDetection: true // Field doesn't exist in Camera model
            }
          },
          alerts: {
            where: {
              status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
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

    // ============================================
    // FETCH METRICS WITH CACHING (modular + cacheable)
    // ============================================
    // Each metric is fetched independently and cached with appropriate TTL
    // This allows Overview tab to render metrics as they arrive without blocking
    
    // Camera metrics: 1 min TTL (health-based, moderate updates)
    const cameraMetricsData = await Cache.wrap(
      CacheKeys.cameraMetrics(worksiteId),
      async () => {
        const camerasWithHealth = await prisma.camera.findMany({
          where: { worksiteId },
          include: {
            health: {
              orderBy: { lastCheck: 'desc' },
              take: 1
            }
          },
          select: {
            id: true,
            status: true,
            health: {
              select: {
                status: true,
                lastCheck: true
              }
            },
            metadata: true
          }
        });
        
        let activeCameras = 0;
        let offlineCameras = 0;
        let aiEnabledCameras = 0;
        
        for (const camera of camerasWithHealth) {
          if (isCameraOnline(camera)) {
            activeCameras++;
          } else {
            offlineCameras++;
          }
          
          if (camera.metadata && typeof camera.metadata === 'object') {
            const metadata = camera.metadata as any;
            if (metadata.aiEnabled === true) {
              aiEnabledCameras++;
            }
          }
        }
        
        return {
          activeCameras,
          offlineCameras,
          totalCameras: camerasWithHealth.length,
          aiEnabledCameras
        };
      },
      { ttl: 60 } // 1 min TTL
    );
    
    // Fetch other metrics in parallel with caching
    const [alertMetrics, safetyScoreMetrics, lastActivityTimestamp] = await Promise.all([
      // Alert metrics: 10 sec TTL (frequent updates)
      Cache.wrap(
        CacheKeys.alertMetrics(worksiteId),
        () => Promise.resolve(getAlertMetrics((worksite as any).alerts || [])),
        { ttl: 10 }
      ),
      
      // Safety score metrics: 5 min TTL (matches safety score cache)
      Cache.wrap(
        CacheKeys.safetyScoreMetrics(worksiteId),
        () => Promise.resolve(getSafetyScoreMetrics((worksite as any).safetyScores || [])),
        { ttl: 60 * 5 }
      ),
      
      // Last activity: 30 sec TTL (moderate updates)
      Cache.wrap(
        CacheKeys.lastActivity(worksiteId),
        () => getLastActivity(worksiteId, worksite.updatedAt),
        { ttl: 30 }
      )
    ]);
    
    return NextResponse.json({
      ...cameraMetricsData,
      ...alertMetrics,
      ...safetyScoreMetrics,
      lastActivity: lastActivityTimestamp ? new Date(lastActivityTimestamp).toISOString() : null
    });
  } catch (error: any) {
    console.error('Error fetching worksite metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// INTERNAL METRICS FUNCTIONS (refactored for clarity and future caching)
// ============================================

/**
 * Get camera metrics for a worksite
 * 
 * Returns online/offline counts derived from health data, not status strings.
 * This function is independently callable and cacheable.
 */
async function getCameraMetrics(worksiteId: string): Promise<{
  activeCameras: number;
  offlineCameras: number;
  totalCameras: number;
  aiEnabledCameras: number;
}> {
  const camerasWithHealth = await prisma.camera.findMany({
    where: { worksiteId },
    include: {
      health: {
        orderBy: { lastCheck: 'desc' },
        take: 1
      }
    },
    select: {
      id: true,
      metadata: true
    }
  });
  
  let activeCameras = 0;
  let offlineCameras = 0;
  let aiEnabledCameras = 0;
  
  for (const camera of camerasWithHealth) {
    if (isCameraOnline(camera)) {
      activeCameras++;
    } else {
      offlineCameras++;
    }
    
    if (camera.metadata && typeof camera.metadata === 'object') {
      const metadata = camera.metadata as any;
      if (metadata.aiEnabled === true) {
        aiEnabledCameras++;
      }
    }
  }
  
  return {
    activeCameras,
    offlineCameras,
    totalCameras: camerasWithHealth.length,
    aiEnabledCameras
  };
}

/**
 * Get alert metrics for a worksite
 * 
 * Returns alert counts by severity.
 * This function is independently callable and cacheable.
 */
function getAlertMetrics(alerts: any[]): {
  totalAlerts: number;
  highAlerts: number;
  mediumAlerts: number;
  lowAlerts: number;
} {
  const highAlerts = alerts.filter((a: any) => 
    a.severity?.toLowerCase() === 'high' || 
    a.severity?.toLowerCase() === 'critical'
  ).length;
  
  const mediumAlerts = alerts.filter((a: any) => 
    a.severity?.toLowerCase() === 'medium'
  ).length;
  
  const lowAlerts = alerts.filter((a: any) => 
    a.severity?.toLowerCase() === 'low'
  ).length;
  
  return {
    totalAlerts: alerts.length,
    highAlerts,
    mediumAlerts,
    lowAlerts
  };
}

/**
 * Get safety score metrics for a worksite
 * 
 * Returns latest safety score.
 * This function is independently callable and cacheable.
 */
function getSafetyScoreMetrics(safetyScores: any[]): {
  safetyScore: number | null;
} {
  const latestScore = safetyScores?.[0]?.safetyScore ?? null;
  return {
    safetyScore: latestScore
  };
}

/**
 * Get last activity timestamp for a worksite
 * 
 * Checks most recent timestamp from:
 * - Latest alert
 * - Latest camera detection
 * - Worksite updatedAt
 * 
 * This function is independently callable and cacheable.
 */
async function getLastActivity(
  worksiteId: string,
  worksiteUpdatedAt: Date
): Promise<number | null> {
  try {
    const timestamps: number[] = [];
    
    // Get latest alert timestamp
    const latestAlert = await prisma.alert.findFirst({
      where: { worksiteId },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true }
    });
    if (latestAlert?.createdAt) {
      timestamps.push(new Date(latestAlert.createdAt).getTime());
    }
    
    // Get latest detection timestamp
    const latestDetection = await prisma.detection.findFirst({
      where: {
        camera: { worksiteId }
      },
      orderBy: { timestamp: 'desc' },
      select: { timestamp: true }
    });
    if (latestDetection?.timestamp) {
      timestamps.push(new Date(latestDetection.timestamp).getTime());
    }
    
    // Add worksite updated timestamp
    if (worksiteUpdatedAt) {
      timestamps.push(new Date(worksiteUpdatedAt).getTime());
    }
    
    if (timestamps.length > 0) {
      return Math.max(...timestamps);
    }
    
    return null;
  } catch (e) {
    console.error('Error calculating last activity:', e);
    return null;
  }
}


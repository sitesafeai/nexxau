import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

/**
 * GET /api/admin/global-stats
 * Get global platform statistics for super admin dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all stats in parallel
    const [
      worksiteStats,
      cameraStats,
      alertStats,
      safetyScoreStats,
      lastActivity
    ] = await Promise.all([
      // Worksite stats
      prisma.worksite.groupBy({
        by: ['status'],
        _count: true
      }),
      
      // Camera stats
      Promise.all([
        prisma.camera.count(),
        prisma.camera.count({ where: { status: 'online' } }),
        prisma.camera.count({ where: { status: 'offline' } }),
        prisma.camera.count({ where: { aiDetectionEnabled: true } })
      ]),
      
      // Alert stats
      Promise.all([
        prisma.alert.count({ where: { status: { not: 'resolved' } } }),
        prisma.alert.count({ where: { status: { not: 'resolved' }, severity: 'high' } }),
        prisma.alert.count({ where: { status: { not: 'resolved' }, severity: 'medium' } }),
        prisma.alert.count({ where: { status: { not: 'resolved' }, severity: 'low' } })
      ]),
      
      // Average safety score
      prisma.safetyScore.aggregate({
        _avg: {
          safetyScore: true
        },
        where: {
          date: {
            gte: new Date(new Date().setDate(new Date().getDate() - 7))
          }
        }
      }),
      
      // Last system activity
      prisma.auditLog.findFirst({
        orderBy: {
          createdAt: 'desc'
        },
        select: {
          createdAt: true
        }
      })
    ]);

    // Calculate worksite totals
    const totalSites = worksiteStats.reduce((acc, curr) => acc + curr._count, 0);
    const activeSites = worksiteStats.find(s => s.status === 'active')?._count || 0;
    const inactiveSites = totalSites - activeSites;

    // Extract camera stats
    const [totalCameras, onlineCameras, offlineCameras, aiEnabledCameras] = cameraStats;

    // Extract alert stats
    const [totalAlerts, highAlerts, mediumAlerts, lowAlerts] = alertStats;

    // Calculate average safety score
    const averageSafetyScore = Math.round(safetyScoreStats._avg.safetyScore || 0);

    const stats = {
      totalSites,
      activeSites,
      inactiveSites,
      totalCameras,
      onlineCameras,
      offlineCameras,
      aiEnabledCameras,
      totalAlerts,
      highAlerts,
      mediumAlerts,
      lowAlerts,
      averageSafetyScore,
      lastSystemActivity: lastActivity?.createdAt?.toISOString() || new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching global stats:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch global stats' },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '7d';
    
    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get safety metrics
    const [
      totalIncidents,
      incidentsToday,
      incidentsThisWeek,
      incidentsThisMonth,
      activeAlerts,
      resolvedAlerts,
      totalCameras,
      activeCameras,
      totalUsers,
      activeUsers
    ] = await Promise.all([
      // Total incidents
      prisma.alertResponse.count(),
      
      // Incidents today
      prisma.alertResponse.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      }),
      
      // Incidents this week
      prisma.alertResponse.count({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Incidents this month
      prisma.alertResponse.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      }),
      
      // Active alerts
      prisma.alertRule.count({
        where: {
          isActive: true
        }
      }),
      
      // Resolved alerts
      prisma.alertResponse.count({
        where: {
          status: 'resolved'
        }
      }),
      
      // Total cameras
      prisma.camera.count(),
      
      // Active cameras
      prisma.camera.count({
        where: {
          isActive: true
        }
      }),
      
      // Total users
      prisma.user.count(),
      
      // Active users (logged in within last 24 hours)
      prisma.user.count({
        where: {
          lastActivity: {
            gte: new Date(now.getTime() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ]);

    // Calculate safety score (based on incident rate and resolution time)
    const incidentRate = totalIncidents / Math.max(totalCameras, 1);
    const resolutionRate = resolvedAlerts / Math.max(totalIncidents, 1);
    const safetyScore = Math.round(
      Math.max(0, 100 - (incidentRate * 10) + (resolutionRate * 20))
    );

    // Calculate compliance rate
    const complianceRate = Math.round(
      Math.max(0, 100 - (incidentsToday / Math.max(activeCameras, 1)) * 10)
    );

    // Calculate average response time (mock calculation)
    const averageResponseTime = Math.round(
      (Math.random() * 20 + 5) * 10
    ) / 10;

    const metrics = {
      totalIncidents,
      incidentsToday,
      incidentsThisWeek,
      incidentsThisMonth,
      safetyScore,
      complianceRate,
      activeAlerts,
      resolvedAlerts,
      averageResponseTime,
      totalCameras,
      activeCameras,
      totalUsers,
      activeUsers
    };

    // Get recent incidents
    const incidents = await prisma.alertResponse.findMany({
      where: {
        createdAt: {
          gte: startDate
        }
      },
      include: {
        alertRule: {
          select: {
            name: true,
            severity: true,
            description: true
          }
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20
    });

    // Format incidents for frontend
    const formattedIncidents = incidents.map(incident => ({
      id: incident.id,
      type: incident.alertRule?.name || 'Unknown Alert',
      severity: incident.alertRule?.severity || 'medium',
      location: incident.location || 'Unknown Location',
      timestamp: incident.createdAt.toISOString(),
      status: incident.status,
      description: incident.alertRule?.description || 'No description available',
      assignedTo: incident.user?.name || 'Unassigned',
      resolutionTime: incident.resolvedAt 
        ? Math.round((incident.resolvedAt.getTime() - incident.createdAt.getTime()) / (1000 * 60))
        : null
    }));

    return NextResponse.json({
      metrics,
      incidents: formattedIncidents,
      range,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    
    return NextResponse.json({
      error: 'Failed to fetch analytics data',
      metrics: null,
      incidents: []
    }, { status: 500 });
  }
}

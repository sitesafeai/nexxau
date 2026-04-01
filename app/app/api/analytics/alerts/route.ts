import { NextRequest, NextResponse } from 'next/server';
import { prisma, dbPool } from '@/app/lib/database-pool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const severity = searchParams.get('severity');

    // Calculate time range
    const now = new Date();
    let startTime: Date;
    
    switch (timeRange) {
      case '1h':
        startTime = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    // Build where clause
    const where: any = {
      createdAt: {
        gte: startTime,
        lte: now,
      },
    };

    if (severity) {
      where.severity = severity;
    }

    // Get alert analytics with retry logic
    const [
      totalAlerts,
      alertsBySeverity,
      alertsByType,
      recentAlerts
    ] = await Promise.all([
      // Total alerts
      dbPool.executeWithRetry(
        () => prisma.alert.count({ where })
      ),
      
      // Alerts by severity
      dbPool.executeWithRetry(
        () => prisma.alert.groupBy({
          by: ['severity'],
          where,
          _count: { severity: true },
        })
      ).then(groups => {
        const severityCount: Record<string, number> = {};
        groups.forEach(group => {
          severityCount[group.severity] = group._count.severity;
        });
        return severityCount;
      }),
      
      // Alerts by type (source)
      dbPool.executeWithRetry(
        () => prisma.alert.groupBy({
          by: ['source'],
          where,
          _count: { source: true },
        })
      ).then(groups => {
        const typeCount: Record<string, number> = {};
        groups.forEach(group => {
          typeCount[group.source] = group._count.source;
        });
        return typeCount;
      }),
      
      // Recent alerts
      dbPool.executeWithRetry(
        () => prisma.alert.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            title: true,
            description: true,
            severity: true,
            source: true,
            location: true,
            createdAt: true,
            metadata: true,
          },
        })
      ),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalAlerts,
        alertsBySeverity,
        alertsByType,
        recentAlerts,
        timeRange,
        startTime: startTime.toISOString(),
        endTime: now.toISOString(),
        lastUpdated: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Alert analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch alert analytics',
    }, { status: 500 });
  }
}

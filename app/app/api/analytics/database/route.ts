import { NextRequest, NextResponse } from 'next/server';
import { dbMonitor } from '@/app/lib/database-monitor';
import { dbPool } from '@/app/lib/database-pool';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'overview';

    switch (type) {
      case 'overview':
        return NextResponse.json({
          success: true,
          data: {
            metrics: dbMonitor.getMetrics(),
            health: dbPool.isConnectionHealthy(),
            connectionCount: dbPool.getConnectionCount(),
          },
        });

      case 'stats':
        const stats = await dbMonitor.getDatabaseStats();
        return NextResponse.json({
          success: true,
          data: stats,
        });

      case 'performance':
        const performance = await dbMonitor.getPerformanceMetrics();
        return NextResponse.json({
          success: true,
          data: performance,
        });

      case 'health':
        const isHealthy = await dbPool.healthCheck();
        return NextResponse.json({
          success: true,
          data: {
            healthy: isHealthy,
            timestamp: new Date().toISOString(),
            connectionCount: dbPool.getConnectionCount(),
          },
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid analytics type',
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Database analytics error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch database analytics',
    }, { status: 500 });
  }
}

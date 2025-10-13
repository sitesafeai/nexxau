import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';

    // Calculate date range
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
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
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const [
      total,
      critical,
      high,
      medium,
      low,
      resolved,
      unresolved,
      today,
      thisWeek,
      thisMonth
    ] = await Promise.all([
      // Total errors in range
      prisma.errorLog.count({
        where: { createdAt: { gte: startDate } }
      }),
      
      // Critical errors
      prisma.errorLog.count({
        where: { 
          createdAt: { gte: startDate },
          severity: 'critical'
        }
      }),
      
      // High severity errors
      prisma.errorLog.count({
        where: { 
          createdAt: { gte: startDate },
          severity: 'high'
        }
      }),
      
      // Medium severity errors
      prisma.errorLog.count({
        where: { 
          createdAt: { gte: startDate },
          severity: 'medium'
        }
      }),
      
      // Low severity errors
      prisma.errorLog.count({
        where: { 
          createdAt: { gte: startDate },
          severity: 'low'
        }
      }),
      
      // Resolved errors
      prisma.errorLog.count({
        where: { 
          createdAt: { gte: startDate },
          resolved: true
        }
      }),
      
      // Unresolved errors
      prisma.errorLog.count({
        where: { 
          createdAt: { gte: startDate },
          resolved: false
        }
      }),
      
      // Today's errors
      prisma.errorLog.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          }
        }
      }),
      
      // This week's errors
      prisma.errorLog.count({
        where: {
          createdAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // This month's errors
      prisma.errorLog.count({
        where: {
          createdAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          }
        }
      })
    ]);

    // Get top categories
    const topCategories = await prisma.errorLog.groupBy({
      by: ['category'],
      where: { createdAt: { gte: startDate } },
      _count: { category: true },
      orderBy: { _count: { category: 'desc' } },
      take: 5
    });

    // Get top endpoints
    const topEndpoints = await prisma.errorLog.groupBy({
      by: ['endpoint'],
      where: { 
        createdAt: { gte: startDate },
        endpoint: { not: null }
      },
      _count: { endpoint: true },
      orderBy: { _count: { endpoint: 'desc' } },
      take: 5
    });

    // Get error trend (last 7 days)
    const errorTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const count = await prisma.errorLog.count({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          }
        }
      });
      
      errorTrend.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    // Calculate average resolution time
    const resolvedErrors = await prisma.errorLog.findMany({
      where: {
        createdAt: { gte: startDate },
        resolved: true,
        resolvedAt: { not: null }
      },
      select: {
        createdAt: true,
        resolvedAt: true
      }
    });

    const averageResolutionTime = resolvedErrors.length > 0 
      ? Math.round(
          resolvedErrors.reduce((sum, error) => {
            const resolutionTime = error.resolvedAt!.getTime() - error.createdAt.getTime();
            return sum + (resolutionTime / (1000 * 60)); // Convert to minutes
          }, 0) / resolvedErrors.length
        )
      : 0;

    const stats = {
      total,
      critical,
      high,
      medium,
      low,
      resolved,
      unresolved,
      today,
      thisWeek,
      thisMonth,
      averageResolutionTime,
      topCategories: topCategories.map(item => ({
        category: item.category,
        count: item._count.category
      })),
      topEndpoints: topEndpoints.map(item => ({
        endpoint: item.endpoint,
        count: item._count.endpoint
      })),
      errorTrend
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to fetch error stats:', error);
    return NextResponse.json({ error: 'Failed to fetch error stats' }, { status: 500 });
  }
}

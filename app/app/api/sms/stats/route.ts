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
    const worksiteId = searchParams.get('worksiteId');

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

    const where = {
      sentAt: { gte: startDate },
      ...(worksiteId && { worksiteId })
    };

    const [
      totalSent,
      delivered,
      failed,
      undelivered,
      todaySent,
      thisWeekSent,
      thisMonthSent
    ] = await Promise.all([
      // Total sent in range
      prisma.smsNotification.count({ where }),
      
      // Delivered
      prisma.smsNotification.count({
        where: { ...where, status: 'delivered' }
      }),
      
      // Failed
      prisma.smsNotification.count({
        where: { ...where, status: 'failed' }
      }),
      
      // Undelivered
      prisma.smsNotification.count({
        where: { ...where, status: 'undelivered' }
      }),
      
      // Today's SMS
      prisma.smsNotification.count({
        where: {
          sentAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate())
          },
          ...(worksiteId && { worksiteId })
        }
      }),
      
      // This week's SMS
      prisma.smsNotification.count({
        where: {
          sentAt: {
            gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          },
          ...(worksiteId && { worksiteId })
        }
      }),
      
      // This month's SMS
      prisma.smsNotification.count({
        where: {
          sentAt: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1)
          },
          ...(worksiteId && { worksiteId })
        }
      })
    ]);

    // Get top violation types
    const topViolationTypes = await prisma.smsNotification.groupBy({
      by: ['violationType'],
      where: { 
        ...where,
        violationType: { not: null }
      },
      _count: { violationType: true },
      orderBy: { _count: { violationType: 'desc' } },
      take: 5
    });

    // Get delivery trend (last 7 days)
    const deliveryTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const count = await prisma.smsNotification.count({
        where: {
          sentAt: {
            gte: date,
            lt: nextDate
          },
          ...(worksiteId && { worksiteId })
        }
      });
      
      deliveryTrend.push({
        date: date.toISOString().split('T')[0],
        count
      });
    }

    // Calculate average delivery time
    const deliveredSMS = await prisma.smsNotification.findMany({
      where: {
        ...where,
        status: 'delivered',
        deliveredAt: { not: null }
      },
      select: {
        sentAt: true,
        deliveredAt: true
      }
    });

    const averageDeliveryTime = deliveredSMS.length > 0 
      ? Math.round(
          deliveredSMS.reduce((sum, sms) => {
            const deliveryTime = sms.deliveredAt!.getTime() - sms.sentAt.getTime();
            return sum + (deliveryTime / (1000 * 60)); // Convert to minutes
          }, 0) / deliveredSMS.length
        )
      : 0;

    const stats = {
      totalSent,
      delivered,
      failed,
      undelivered,
      todaySent,
      thisWeekSent,
      thisMonthSent,
      averageDeliveryTime,
      topViolationTypes: topViolationTypes.map(item => ({
        violationType: item.violationType,
        count: item._count.violationType
      })),
      deliveryTrend
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Failed to fetch SMS stats:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS stats' }, { status: 500 });
  }
}

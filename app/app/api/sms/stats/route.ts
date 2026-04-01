import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId') || undefined;
    const range = searchParams.get('range') || '30d';

    const now = new Date();
    let fromDate: Date | undefined;
    switch (range) {
      case '1h':
        fromDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case '24h':
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
      default:
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    const baseWhere: any = {};
    if (worksiteId) baseWhere.worksiteId = worksiteId;
    if (fromDate) baseWhere.sentAt = { gte: fromDate };

    // Total counts by status
    const [totalSent, delivered, failed, undelivered, todaySent, thisWeekSent, thisMonthSent] =
      await Promise.all([
        prisma.sMSNotification.count({ where: baseWhere }),
        prisma.sMSNotification.count({ where: { ...baseWhere, status: 'delivered' } }),
        prisma.sMSNotification.count({ where: { ...baseWhere, status: 'failed' } }),
        prisma.sMSNotification.count({ where: { ...baseWhere, status: 'undelivered' } }),
        prisma.sMSNotification.count({
          where: {
            ...baseWhere,
            sentAt: { gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.sMSNotification.count({
          where: {
            ...baseWhere,
            sentAt: { gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.sMSNotification.count({
          where: {
            ...baseWhere,
            sentAt: { gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    // Average delivery time (minutes) for delivered messages
    const deliveredMessages = await prisma.sMSNotification.findMany({
      where: { ...baseWhere, status: 'delivered', deliveredAt: { not: null } },
      select: { sentAt: true, deliveredAt: true },
      take: 1000,
    });

    let averageDeliveryTime = 0;
    if (deliveredMessages.length > 0) {
      const totalMs = deliveredMessages.reduce((sum, msg) => {
        const sent = msg.sentAt.getTime();
        const deliveredAt = msg.deliveredAt!.getTime();
        return sum + (deliveredAt - sent);
      }, 0);
      averageDeliveryTime = Math.round((totalMs / deliveredMessages.length / (1000 * 60)) * 10) / 10;
    }

    // Top violation types by count
    const violationGroups = await prisma.sMSNotification.groupBy({
      by: ['violationType'],
      where: {
        ...baseWhere,
        violationType: { not: null },
      },
      _count: { _all: true },
      orderBy: {
        _count: {
          violationType: 'desc'
        }
      },
      take: 10,
    });

    const topViolationTypes = violationGroups.map(group => ({
      violationType: group.violationType || 'unknown',
      count: group._count._all,
    }));

    // Simple delivery trend: counts per day in range
    const trendMessages = await prisma.sMSNotification.findMany({
      where: baseWhere,
      select: { sentAt: true },
      orderBy: { sentAt: 'asc' },
    });

    const trendMap = new Map<string, number>();
    trendMessages.forEach(msg => {
      const key = msg.sentAt.toISOString().slice(0, 10); // YYYY-MM-DD
      trendMap.set(key, (trendMap.get(key) || 0) + 1);
    });

    const deliveryTrend = Array.from(trendMap.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    return NextResponse.json({
      success: true,
      data: {
        totalSent,
        delivered,
        failed,
        undelivered,
        todaySent,
        thisWeekSent,
        thisMonthSent,
        averageDeliveryTime,
        topViolationTypes,
        deliveryTrend,
      },
    });
  } catch (error: any) {
    console.error('[SMS Stats API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch SMS statistics',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

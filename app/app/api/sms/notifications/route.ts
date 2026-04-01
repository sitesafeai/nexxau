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
    const status = searchParams.get('status') || undefined;
    const violationType = searchParams.get('violationType') || undefined;
    const range = searchParams.get('range') || '24h';

    // Time range filter on sentAt
    const now = new Date();
    let fromDate: Date | undefined;
    switch (range) {
      case '1h':
        fromDate = new Date(now.getTime() - 1 * 60 * 60 * 1000);
        break;
      case '7d':
        fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        fromDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '24h':
      default:
        fromDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
    }

    const where: any = {};

    if (worksiteId) {
      where.worksiteId = worksiteId;
    }

    if (status && status !== 'all') {
      where.status = status;
    }

    if (violationType && violationType !== 'all') {
      where.violationType = violationType;
    }

    if (fromDate) {
      where.sentAt = { gte: fromDate };
    }

    const notifications = await prisma.sMSNotification.findMany({
      where,
      include: {
        worksite: {
          select: {
            name: true,
            worksiteName: true,
          },
        },
        camera: {
          select: {
            name: true,
            location: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      take: 500,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
      count: notifications.length,
    });
  } catch (error: any) {
    console.error('[SMS Notifications API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch SMS notifications',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

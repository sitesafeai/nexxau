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
    const worksiteId = searchParams.get('worksiteId');
    const status = searchParams.get('status');
    const violationType = searchParams.get('violationType');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (worksiteId) {
      where.worksiteId = worksiteId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (violationType) {
      where.violationType = violationType;
    }

    const [notifications, total] = await Promise.all([
      prisma.smsNotification.findMany({
        where,
        include: {
          worksite: {
            select: {
              name: true,
              worksiteName: true
            }
          },
          camera: {
            select: {
              name: true,
              location: true
            }
          }
        },
        orderBy: {
          sentAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.smsNotification.count({ where })
    ]);

    return NextResponse.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Failed to fetch SMS notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch SMS notifications' }, { status: 500 });
  }
}

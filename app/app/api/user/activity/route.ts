import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

// GET /api/user/activity - Get user activity log
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const action = searchParams.get('action');
    const resource = searchParams.get('resource');

    const skip = (page - 1) * limit;

    const where: any = {
      userId: session.user.id,
    };

    if (action) {
      where.action = action;
    }

    if (resource) {
      where.resource = resource;
    }

    const [activities, total] = await Promise.all([
      prisma.userActivity.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          action: true,
          resource: true,
          resourceId: true,
          metadata: true,
          ipAddress: true,
          location: true,
          createdAt: true,
        },
      }),
      prisma.userActivity.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        activities,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });

  } catch (error) {
    console.error('Error fetching user activity:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user activity' },
      { status: 500 }
    );
  }
}

// POST /api/user/activity - Log user activity
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, resource, resourceId, metadata } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const activity = await prisma.userActivity.create({
      data: {
        userId: session.user.id,
        action,
        resource,
        resourceId,
        metadata,
        ipAddress,
        userAgent,
      },
    });

    return NextResponse.json({
      success: true,
      data: activity,
    });

  } catch (error) {
    console.error('Error logging user activity:', error);
    return NextResponse.json(
      { error: 'Failed to log user activity' },
      { status: 500 }
    );
  }
}

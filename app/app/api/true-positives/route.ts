import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// GET /api/true-positives - Get all true positive reports
export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/true-positives - Request received');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('[API] ❌ Unauthorized - No session');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[API] User authenticated:', session.user.id);

    const { searchParams } = new URL(request.url);
    const reviewed = searchParams.get('reviewed');
    const worksiteId = searchParams.get('worksiteId');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    console.log('[API] Query params:', { reviewed, worksiteId, limit, offset });

    const where: any = {};
    if (reviewed !== null) {
      where.reviewed = reviewed === 'true';
    }
    if (worksiteId) {
      where.worksiteId = worksiteId;
    }

    console.log('[API] Where clause:', JSON.stringify(where, null, 2));

    const [reports, total] = await Promise.all([
      prisma.truePositiveReport.findMany({
        where,
        include: {
          worksite: {
            select: {
              id: true,
              name: true,
              company: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          camera: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.truePositiveReport.count({ where }),
    ]);

    console.log(`[API] ✅ Found ${reports.length} true positive reports (total: ${total})`);

    return NextResponse.json({
      success: true,
      data: reports,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[API] ❌ Error fetching true positives:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to fetch true positives', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/true-positives - Create a true positive report
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      alertId,
      detectionId,
      worksiteId,
      cameraId,
      description,
      incidentType,
      videoUrl,
      imageUrl,
      timestamp,
    } = body;

    const report = await prisma.truePositiveReport.create({
      data: {
        alertId: alertId || null,
        detectionId: detectionId || null,
        worksiteId: worksiteId || null,
        cameraId: cameraId || null,
        reportedBy: session.user.id,
        description: description || null,
        incidentType: incidentType || null,
        videoUrl: videoUrl || null,
        imageUrl: imageUrl || null,
        timestamp: timestamp ? new Date(timestamp) : null,
        reviewed: false,
      },
      include: {
        worksite: {
          select: {
            id: true,
            name: true,
          },
        },
        camera: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error creating true positive report:', error);
    return NextResponse.json(
      { error: 'Failed to create true positive report' },
      { status: 500 }
    );
  }
}

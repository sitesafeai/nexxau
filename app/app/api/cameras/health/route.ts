import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/prisma';

// GET /api/cameras/health - Get camera health status
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
    const cameraId = searchParams.get('camera_id');
    const worksiteId = searchParams.get('worksite_id');

    const where: any = {};

    if (cameraId) {
      where.cameraId = cameraId;
    } else if (worksiteId) {
      where.camera = {
        worksiteId,
      };
    }

    const healthRecords = await prisma.cameraHealth.findMany({
      where,
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            type: true,
            location: true,
            worksiteId: true,
            worksite: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { lastCheck: 'desc' },
    });

    // Get health summary
    const summary = {
      total: healthRecords.length,
      online: healthRecords.filter(h => h.status === 'ONLINE').length,
      offline: healthRecords.filter(h => h.status === 'OFFLINE').length,
      degraded: healthRecords.filter(h => h.status === 'DEGRADED').length,
      error: healthRecords.filter(h => h.status === 'ERROR').length,
      maintenance: healthRecords.filter(h => h.status === 'MAINTENANCE').length,
    };

    return NextResponse.json({
      success: true,
      data: {
        healthRecords,
        summary,
      },
    });

  } catch (error) {
    console.error('Error fetching camera health:', error);
    return NextResponse.json(
      { error: 'Failed to fetch camera health' },
      { status: 500 }
    );
  }
}

// POST /api/cameras/health - Update camera health status
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
    const {
      cameraId,
      status,
      streamQuality,
      frameRate,
      resolution,
      bitrate,
      latency,
      errors,
    } = body;

    if (!cameraId || !status) {
      return NextResponse.json(
        { error: 'Camera ID and status are required' },
        { status: 400 }
      );
    }

    // Check if camera exists and user has access
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: {
        worksite: {
          include: {
            users: {
              where: { id: session.user.id },
            },
          },
        },
      },
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this camera
    if (camera.worksite.users.length === 0 && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    // Create or update health record and update camera heartbeat
    const now = new Date();
    const currentMetadata = (camera.metadata as Record<string, any>) || {};
    
    const healthRecord = await prisma.$transaction(async (tx) => {
      const health = await tx.cameraHealth.upsert({
        where: { cameraId },
        update: {
          status,
          streamQuality,
          frameRate,
          resolution,
          bitrate,
          latency,
          errors,
          lastCheck: now,
        },
        create: {
          cameraId,
          status,
          streamQuality,
          frameRate,
          resolution,
          bitrate,
          latency,
          errors,
          lastCheck: now,
        },
      });

      // Update camera metadata with lastHeartbeat
      await tx.camera.update({
        where: { id: cameraId },
        data: {
          metadata: {
            ...currentMetadata,
            lastHeartbeat: now.toISOString()
          }
        }
      });

      return health;
    });

    return NextResponse.json({
      success: true,
      data: healthRecord,
    });

  } catch (error) {
    console.error('Error updating camera health:', error);
    return NextResponse.json(
      { error: 'Failed to update camera health' },
      { status: 500 }
    );
  }
}

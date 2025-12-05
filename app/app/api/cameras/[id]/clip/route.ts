import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// POST /api/cameras/[id]/clip - Request clip export
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cameraId = params.id;
    const body = await request.json();
    const { startOffset, endOffset, includeOverlay } = body;

    // Validate camera exists
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: {
        worksite: {
          select: { id: true, name: true }
        }
      }
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    // Calculate actual timestamps
    const now = new Date();
    const start = new Date(now.getTime() + (startOffset * 1000)); // startOffset is negative
    const end = new Date(now.getTime() + (endOffset * 1000));

    // Validate time range
    const duration = (end.getTime() - start.getTime()) / 1000;
    if (duration < 3) {
      return NextResponse.json({ 
        error: 'Clip duration must be at least 3 seconds' 
      }, { status: 400 });
    }
    if (duration > 600) {
      return NextResponse.json({ 
        error: 'Clip duration cannot exceed 10 minutes (600 seconds)' 
      }, { status: 400 });
    }

    // In production, this would:
    // 1. Create a job in a queue (Redis/Bull)
    // 2. Worker fetches video segment from storage
    // 3. If includeOverlay, fetch detections and burn in bounding boxes
    // 4. Encode clip and upload to S3
    // 5. Return signed URL

    // For now, create a placeholder job record
    const jobId = `clip_${cameraId}_${Date.now()}`;

    // Log to audit
    await prisma.auditLog.create({
      data: {
        action: 'CLIP_EXPORT_REQUESTED',
        entity: 'CAMERA',
        entityId: cameraId,
        entityName: camera.name,
        worksiteId: camera.worksiteId,
        details: {
          jobId,
          startOffset,
          endOffset,
          duration,
          includeOverlay,
          start: start.toISOString(),
          end: end.toISOString(),
        },
        result: 'PENDING',
        severity: 'INFO',
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'queued',
        camera: {
          id: camera.id,
          name: camera.name,
        },
        clip: {
          start: start.toISOString(),
          end: end.toISOString(),
          duration,
          includeOverlay,
        },
        message: 'Clip export job queued. You will be notified when ready.',
        // In production, this would be a polling endpoint or websocket channel
        statusUrl: `/api/exports/${jobId}/status`,
      }
    });

  } catch (error: any) {
    console.error('Error creating clip export:', error);
    return NextResponse.json(
      { error: 'Failed to create clip export', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/cameras/[id]/clip - Get clip export history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const cameraId = params.id;

    // Get recent clip exports for this camera from audit logs
    const clipExports = await prisma.auditLog.findMany({
      where: {
        entityId: cameraId,
        action: 'CLIP_EXPORT_REQUESTED',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      data: clipExports.map(log => ({
        jobId: (log.details as any)?.jobId,
        status: log.result,
        createdAt: log.createdAt,
        details: log.details,
      })),
    });

  } catch (error: any) {
    console.error('Error fetching clip exports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch clip exports', details: error.message },
      { status: 500 }
    );
  }
}


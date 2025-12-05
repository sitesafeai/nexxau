import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/cameras/[id]
 * Get a single camera
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const camera = await prisma.camera.findFirst({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        streamUrl: true,
        location: true,
        ipAddress: true,
        port: true,
        username: true,
        password: true,
        rtspPath: true,
        hlsUrl: true,
        mediamtxPath: true,
        metadata: true,
        worksiteId: true,
        createdAt: true,
        updatedAt: true,
        worksite: {
          select: {
            id: true,
            name: true,
            worksiteName: true
          }
        },
        health: {
          select: {
            id: true,
            status: true,
            streamQuality: true,
            frameRate: true,
            resolution: true,
            lastCheck: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!camera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: camera
    });
  } catch (error) {
    console.error('[GET /api/cameras/:id] Error fetching camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch camera' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cameras/[id]
 * Update camera settings (partial update)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const cameraId = params.id;

    // Check if camera exists
    const existingCamera = await prisma.camera.findUnique({
      where: { id: cameraId }
    });

    if (!existingCamera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Sanitize to only update fields that exist in the database
    const updateData: any = {};

    // Basic fields that exist in DB
    if (body.name !== undefined) updateData.name = body.name;
    if (body.type !== undefined) updateData.type = body.type;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.worksiteId !== undefined) updateData.worksiteId = body.worksiteId;

    // Fields that DON'T exist in DB yet - SKIP THEM
    // if (body.externalId !== undefined) updateData.externalId = body.externalId; // NOT IN DB
    // if (body.enabled !== undefined) updateData.enabled = body.enabled; // NOT IN DB
    // if (body.retentionDays !== undefined) updateData.retentionDays = body.retentionDays; // NOT IN DB
    // if (body.aiEnabled !== undefined) updateData.aiEnabled = body.aiEnabled; // NOT IN DB
    // if (body.confidenceThreshold !== undefined) updateData.confidenceThreshold = body.confidenceThreshold; // NOT IN DB

    // Connection object - NOT IN DB YET, skip it
    // if (body.connection !== undefined) {
    //   updateData.connection = body.connection;
    // }

    // Handle metadata object (this EXISTS in DB)
    if (body.metadata !== undefined) {
      updateData.metadata = body.metadata;
    }

    // Test connection results - NOT IN DB YET
    // if (body.lastTestAt !== undefined) updateData.lastTestAt = new Date(body.lastTestAt); // NOT IN DB
    // if (body.lastTestOk !== undefined) updateData.lastTestOk = body.lastTestOk; // NOT IN DB
    // if (body.lastTestError !== undefined) updateData.lastTestError = body.lastTestError; // NOT IN DB
    // if (body.lastSnapshot !== undefined) updateData.lastSnapshot = body.lastSnapshot; // NOT IN DB

    // Legacy field updates that DO exist in DB
    if (body.streamUrl !== undefined) updateData.streamUrl = body.streamUrl;
    if (body.hlsUrl !== undefined) updateData.hlsUrl = body.hlsUrl;
    if (body.location !== undefined) updateData.location = body.location;
    if (body.ipAddress !== undefined) updateData.ipAddress = body.ipAddress;
    if (body.port !== undefined) updateData.port = body.port;
    if (body.username !== undefined) updateData.username = body.username;
    if (body.password !== undefined) updateData.password = body.password;
    if (body.rtspPath !== undefined) updateData.rtspPath = body.rtspPath;
    if (body.mediamtxPath !== undefined) updateData.mediamtxPath = body.mediamtxPath;

    console.log('[PATCH /api/cameras/:id] Updating camera:', cameraId, 'with data:', updateData);

    const camera = await prisma.$transaction(async (tx) => {
      const updated = await tx.camera.update({
        where: { id: cameraId },
        data: updateData,
        include: {
          worksite: {
            select: {
              id: true,
              name: true,
              worksiteName: true,
            }
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CAMERA_UPDATED',
          entity: 'CAMERA',
          entityId: updated.id,
          entityName: updated.name,
          worksiteId: updated.worksiteId,
          changes: {
            old: existingCamera,
            new: updateData,
          },
          result: 'SUCCESS',
          severity: 'INFO',
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: camera
    });
  } catch (error: any) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update camera', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cameras/[id]
 * Full camera replacement (new format)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const cameraId = params.id;

    // Check if camera exists
    const existingCamera = await prisma.camera.findUnique({
      where: { id: cameraId }
    });

    if (!existingCamera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    const {
      name,
      externalId,
      worksiteId,
      connection,
      metadata,
      enabled = true,
      retentionDays = 30,
      aiEnabled = true,
      confidenceThreshold = 0.7,
    } = body;

    // Validation
    if (!name || name.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Camera name is required (min 3 characters)'
      }, { status: 400 });
    }

    if (!worksiteId) {
      return NextResponse.json({
        success: false,
        error: 'Worksite ID is required'
      }, { status: 400 });
    }

    const camera = await prisma.$transaction(async (tx) => {
      const updated = await tx.camera.update({
        where: { id: cameraId },
        data: {
          name,
          externalId: externalId || null,
          type: connection?.type || 'RTSP',
          enabled,
          
          // Legacy fields
          streamUrl: connection?.rtspUrl || null,
          hlsUrl: connection?.hlsUrl || null,
          username: connection?.username || null,
          password: connection?.password || null,
          
          // New structured fields
          connection: connection ? {
            type: connection.type || 'RTSP',
            rtspUrl: connection.rtspUrl || '',
            webrtcUrl: connection.webrtcUrl || '',
            hlsUrl: connection.hlsUrl || '',
            snapshotUrl: connection.snapshotUrl || '',
            profile: connection.profile || 'medium',
          } : existingCamera.connection,
          
          metadata: metadata ? {
            lat: metadata.lat || null,
            lon: metadata.lon || null,
            mountHeight: metadata.mountHeight || null,
            orientation: metadata.orientation || null,
            fov: metadata.fov || null,
            tags: metadata.tags || [],
            model: metadata.model || '',
            notes: metadata.notes || '',
            resolution: metadata.resolution || '',
            fps: metadata.fps || null,
            codec: metadata.codec || '',
          } : existingCamera.metadata,
          
          retentionDays,
          aiEnabled,
          confidenceThreshold,
          worksiteId,
        },
        include: {
          worksite: {
            select: {
              id: true,
              name: true,
              worksiteName: true,
            }
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CAMERA_UPDATED',
          entity: 'CAMERA',
          entityId: updated.id,
          entityName: updated.name,
          worksiteId: updated.worksiteId,
          changes: {
            old: { name: existingCamera.name, worksiteId: existingCamera.worksiteId },
            new: { name: updated.name, worksiteId: updated.worksiteId },
          },
          result: 'SUCCESS',
          severity: 'INFO',
        }
      });

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: camera.id,
        name: camera.name,
        externalId: camera.externalId,
        type: camera.type,
        status: camera.status,
        enabled: camera.enabled,
        connection: camera.connection,
        metadata: camera.metadata,
        retentionDays: camera.retentionDays,
        aiEnabled: camera.aiEnabled,
        confidenceThreshold: camera.confidenceThreshold,
        worksiteId: camera.worksiteId,
        worksite: camera.worksite,
        createdAt: camera.createdAt.toISOString(),
        updatedAt: camera.updatedAt.toISOString(),
      },
      message: 'Camera updated successfully'
    });

  } catch (error: any) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update camera', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cameras/[id]
 * Delete a camera
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.camera.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Camera deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete camera' },
      { status: 500 }
    );
  }
}

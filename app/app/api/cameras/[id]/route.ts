import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/cameras/[id]
 * Get a single camera
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const camera = await prisma.camera.findFirst({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;
    const body = await request.json();

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;
    const body = await request.json();

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
          // externalId: externalId || null, // Field doesn't exist in Camera schema
          type: connection?.type || 'RTSP',
          // enabled, // Field doesn't exist in Camera schema - use status instead
          
          // Legacy fields
          streamUrl: connection?.rtspUrl || null,
          hlsUrl: connection?.hlsUrl || null,
          username: connection?.username || null,
          password: connection?.password || null,
          
          // Note: connection field doesn't exist in Camera schema
          // Store connection info in metadata or use individual fields (rtspUrl, etc.)
          
          metadata: metadata ? (() => {
            const meta: any = {};
            if (metadata.lat !== undefined && metadata.lat !== null) meta.lat = metadata.lat;
            if (metadata.lon !== undefined && metadata.lon !== null) meta.lon = metadata.lon;
            if (metadata.mountHeight !== undefined && metadata.mountHeight !== null) meta.mountHeight = metadata.mountHeight;
            if (metadata.orientation !== undefined && metadata.orientation !== null) meta.orientation = metadata.orientation;
            if (metadata.fov !== undefined && metadata.fov !== null) meta.fov = metadata.fov;
            if (metadata.tags) meta.tags = metadata.tags;
            if (metadata.model) meta.model = metadata.model;
            if (metadata.notes) meta.notes = metadata.notes;
            if (metadata.resolution) meta.resolution = metadata.resolution;
            if (metadata.fps !== undefined && metadata.fps !== null) meta.fps = metadata.fps;
            if (metadata.codec) meta.codec = metadata.codec;
            return Object.keys(meta).length > 0 ? meta : undefined;
          })() : (existingCamera.metadata as any) || undefined,
          
          // retentionDays, // Field doesn't exist in Camera schema
          // aiEnabled, // Field doesn't exist in Camera schema
          // confidenceThreshold, // Field doesn't exist in Camera schema
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
        // externalId: camera.externalId, // Field doesn't exist
        type: camera.type,
        status: camera.status,
        // enabled: camera.enabled, // Field doesn't exist
        // connection: camera.connection, // Field doesn't exist
        metadata: camera.metadata,
        // retentionDays: camera.retentionDays, // Field doesn't exist
        // aiEnabled: camera.aiEnabled, // Field doesn't exist
        // confidenceThreshold: camera.confidenceThreshold, // Field doesn't exist
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.camera.delete({
      where: { id }
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

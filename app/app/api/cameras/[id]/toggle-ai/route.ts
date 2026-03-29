/**
 * POST /api/cameras/:id/toggle-ai
 * 
 * Toggle AI detection on/off for a camera
 * 
 * Payload:
 *   { "enabled": true | false }
 * 
 * Updates the camera's metadata.aiEnabled field in the database.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
// Legacy Janus - archived
// import { startRtpForward, stopRtpForward } from '@/app/lib/services/janusRtspService';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    console.log(`[API /cameras/:id/toggle-ai] [${requestId}] POST request received`);
    
    // Step 1: Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log(`[API /cameras/:id/toggle-ai] [${requestId}] ❌ Unauthorized`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Authorization
    const userRole = normalizeRole(session.user.role);
    const canToggleAI = 
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'SITE_ADMIN' ||
      userRole === 'SAFETY_MANAGER';

    if (!canToggleAI) {
      console.log(`[API /cameras/:id/toggle-ai] [${requestId}] ❌ Permission denied: ${userRole}`);
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to toggle AI' },
        { status: 403 }
      );
    }

    // Step 3: Parse parameters and body
    const { id: cameraId } = await params;
    const body = await request.json();
    const { enabled } = body;

    console.log(`[API /cameras/:id/toggle-ai] [${requestId}] Camera ID: ${cameraId}`);
    console.log(`[API /cameras/:id/toggle-ai] [${requestId}] Enabled: ${enabled}`);

    // Step 4: Validate input
    if (typeof enabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'enabled must be a boolean (true or false)' },
        { status: 400 }
      );
    }

    // Step 5: Verify camera exists
    const existingCamera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: { id: true, metadata: true, janusFeedId: true }
    });

    if (!existingCamera) {
      console.log(`[API /cameras/:id/toggle-ai] [${requestId}] ❌ Camera not found: ${cameraId}`);
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    const currentMetadata = (existingCamera.metadata as any) || {};

    // Step 6: Configure YOLO pipeline when enabling/disabling
    if (enabled) {
      if (!existingCamera.janusFeedId) {
        return NextResponse.json(
          { success: false, error: 'Camera is missing janusFeedId for RTP forwarding' },
          { status: 400 }
        );
      }

      const yoloServiceUrl = process.env.YOLO_SERVICE_URL || 'http://localhost:8765';
      const yoloRtpHost = process.env.YOLO_RTP_HOST || '127.0.0.1';
      const yoloBasePort = parseInt(process.env.YOLO_RTP_BASE_PORT || '5004', 10);
      const rtpCodec = process.env.YOLO_RTP_CODEC || 'vp8';

      const rtpPort = currentMetadata.yoloRtpPort || (yoloBasePort + existingCamera.janusFeedId);

      const forwardResult = await startRtpForward({
        mountpointId: existingCamera.janusFeedId,
        host: yoloRtpHost,
        port: rtpPort,
        codec: rtpCodec,
      });

      const startUrl = `${yoloServiceUrl}/rtp/start/${existingCamera.janusFeedId}?rtp_port=${rtpPort}&camera_id=${cameraId}`;
      const yoloResponse = await fetch(startUrl, { method: 'POST' });
      if (!yoloResponse.ok) {
        throw new Error(`YOLO service start failed: ${yoloResponse.status}`);
      }

      currentMetadata.yoloRtpPort = rtpPort;
      if (forwardResult.streamId) {
        currentMetadata.yoloRtpStreamId = forwardResult.streamId;
      }
    } else {
      if (existingCamera.janusFeedId) {
        const yoloServiceUrl = process.env.YOLO_SERVICE_URL || 'http://localhost:8765';
        const stopUrl = `${yoloServiceUrl}/rtp/stop/${existingCamera.janusFeedId}`;
        await fetch(stopUrl, { method: 'POST' }).catch(() => null);

        await stopRtpForward({
          mountpointId: existingCamera.janusFeedId,
          streamId: currentMetadata.yoloRtpStreamId,
        });
      }
    }

    // Step 7: Update camera metadata
    const updatedMetadata = {
      ...currentMetadata,
      aiEnabled: enabled
    };

    const camera = await prisma.camera.update({
      where: { id: cameraId },
      data: {
        metadata: updatedMetadata
      },
      select: {
        id: true,
        name: true,
        status: true,
        janusFeedId: true,
        metadata: true,
        worksiteId: true,
        updatedAt: true
      }
    });

    console.log(`[API /cameras/:id/toggle-ai] [${requestId}] ✅ AI toggled to ${enabled} for camera: ${camera.id}`);

    // Step 8: Format response
    const response = {
      success: true,
      data: {
        id: camera.id,
        name: camera.name,
        janusFeedId: camera.janusFeedId,
        aiEnabled: enabled,
        status: camera.status,
        worksiteId: camera.worksiteId,
        updatedAt: camera.updatedAt.toISOString()
      }
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error(`[API /cameras/:id/toggle-ai] [${requestId}] ❌ Unexpected error:`, error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}


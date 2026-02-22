/**
 * POST /api/worksites/:id/cameras
 * 
 * Add a new camera to a worksite with automatic Janus RTSP mount creation
 * 
 * This endpoint:
 * 1. Validates input (name, rtspUrl)
 * 2. Creates Janus RTSP mount (via janusRtspService)
 * 3. Creates Camera DB record with janusFeedId
 * 4. Returns created camera object
 * 
 * Error handling:
 * - If Janus fails → DO NOT write to DB
 * - If DB fails → CLEAN UP Janus feed (destroyRtspPublisher)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import {
  createRtpMountpoint,
  destroyRtspPublisher,
  generateMountpointId,
  listStreamingStreams,
  startRtpForward,
  stopRtpForward,
} from '@/app/lib/services/janusRtspService';
import { validateRtspStream } from '@/app/lib/rtsp-validation';
import { startRtpPush } from '@/app/lib/services/cameraIngestClient';

export const runtime = 'nodejs';

export const resolveRtpPort = (mountpointId: number): number => {
  const basePort = Number(process.env.JANUS_RTP_BASE_PORT || '20000');
  const portRange = Number(process.env.JANUS_RTP_PORT_RANGE || '10000');
  const safeBase = Number.isFinite(basePort) && basePort > 0 ? basePort : 20000;
  const safeRange = Number.isFinite(portRange) && portRange > 0 ? portRange : 10000;
  const offset = mountpointId % safeRange;
  return safeBase + offset;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  try {
    console.log(`[API /worksites/:id/cameras] [${requestId}] POST request received`);
    
    // Step 1: Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log(`[API /worksites/:id/cameras] [${requestId}] ❌ Unauthorized`);
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Step 2: Authorization - only super-admins can add cameras (backend-first flow)
    const userRole = normalizeRole(session.user.role);
    if (userRole !== 'SUPER_ADMIN') {
      console.log(`[API /worksites/:id/cameras] [${requestId}] ❌ Permission denied: only SUPER_ADMIN can add cameras (${userRole})`);
      return NextResponse.json(
        { success: false, error: 'Only super-admins can add cameras. Contact your administrator.' },
        { status: 403 }
      );
    }

    // Step 3: Parse parameters and body
    const { id: worksiteId } = await params;
    const body = await request.json();
    const { name, rtspUrl, location, enableAi, enableAI, janusFeedId: existingJanusFeedId } = body;

    console.log(`[API /worksites/:id/cameras] [${requestId}] Worksite ID: ${worksiteId}`);
    console.log(`[API /worksites/:id/cameras] [${requestId}] Request body:`, { name, rtspUrl: rtspUrl ? '***' : undefined, janusFeedId: existingJanusFeedId });

    const overlayEnabled = typeof enableAI === 'boolean'
      ? enableAI
      : typeof enableAi === 'boolean'
        ? enableAi
        : true;
    const aiEnabled = true;
    const cameraLocation = typeof location === 'string' && location.trim().length > 0
      ? location.trim()
      : null;

    // Step 4: Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Camera name is required' },
        { status: 400 }
      );
    }

    // --- Path A: Add camera that displays an existing Janus stream (dropdown choice) ---
    if (existingJanusFeedId !== undefined && existingJanusFeedId !== null) {
      const feedId = Number(existingJanusFeedId);
      if (!Number.isInteger(feedId) || feedId <= 0) {
        return NextResponse.json(
          { success: false, error: 'Invalid Janus stream ID' },
          { status: 400 }
        );
      }

      const worksite = await prisma.worksite.findUnique({
        where: { id: worksiteId },
        select: { id: true, name: true },
      });
      if (!worksite) {
        return NextResponse.json(
          { success: false, error: 'Worksite not found' },
          { status: 404 }
        );
      }

      const streams = await listStreamingStreams();
      const stream = streams.find((s) => s.id === feedId);
      if (!stream) {
        return NextResponse.json(
          { success: false, error: `Janus stream ${feedId} not found. Choose a stream from the dropdown.` },
          { status: 400 }
        );
      }

      const camera = await prisma.camera.create({
        data: {
          name: name.trim(),
          type: 'Janus Stream',
          streamUrl: null,
          location: cameraLocation,
          worksiteId,
          janusFeedId: feedId,
          status: 'online',
          metadata: {
            aiEnabled,
            overlayEnabled,
            staticMountpoint: true,
            janusStreamName: stream.name,
            janusStreamDescription: stream.description,
          },
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          streamUrl: true,
          janusFeedId: true,
          worksiteId: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Camera created from Janus stream: ${camera.id} (feed ${feedId})`);
      return NextResponse.json(
        {
          success: true,
          data: {
            id: camera.id,
            name: camera.name,
            janusFeedId: camera.janusFeedId,
            status: camera.status,
            aiEnabled: (camera.metadata as any)?.aiEnabled ?? aiEnabled,
            overlayEnabled: (camera.metadata as any)?.overlayEnabled ?? overlayEnabled,
            worksiteId: camera.worksiteId,
            streamUrl: camera.streamUrl,
            createdAt: camera.createdAt.toISOString(),
            updatedAt: camera.updatedAt.toISOString(),
          },
        },
        { status: 201 }
      );
    }

    // --- Path B: Add camera with RTSP URL (create new mountpoint + RTP worker) ---
    if (!rtspUrl || typeof rtspUrl !== 'string' || !rtspUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'RTSP URL is required, or choose an existing Janus stream.' },
        { status: 400 }
      );
    }

    if (!rtspUrl.toLowerCase().startsWith('rtsp://')) {
      return NextResponse.json(
        { success: false, error: 'RTSP URL must start with rtsp://' },
        { status: 400 }
      );
    }

    // Step 5: Verify worksite exists
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: { id: true, name: true }
    });

    if (!worksite) {
      console.log(`[API /worksites/:id/cameras] [${requestId}] ❌ Worksite not found: ${worksiteId}`);
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Worksite found: ${worksite.name}`);

    // Step 6: Validate RTSP before touching Janus
    const validation = await validateRtspStream(rtspUrl.trim());
    if (!validation.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'RTSP validation failed',
          code: validation.error,
          details: validation.message,
        },
        { status: 400 }
      );
    }

    // Extract detected codec from validation (for codec-aware transcoding)
    const detectedCodec = validation.stream?.codec || 'h264'; // Default to h264 if not detected
    console.log(`[API /worksites/:id/cameras] [${requestId}] Detected codec: ${detectedCodec}`);

    // Step 7: Create Janus RTP mount FIRST (before DB write)
    // If this fails, we don't create the DB record
    let janusFeedId: number | null = null;
    const janusRtpHost = process.env.JANUS_RTP_HOST || '127.0.0.1';
    const janusRtpCodec = (process.env.JANUS_RTP_CODEC || 'h264').toLowerCase();
    const janusPayloadType = Number(process.env.JANUS_RTP_PAYLOAD_TYPE || '96');
    let janusRtpPort: number | null = null;
    try {
      const requestedId = generateMountpointId();
      janusRtpPort = resolveRtpPort(requestedId);
      
      // ============================================================
      // PORT VERIFICATION LOGGING
      // ============================================================
      console.log(`[API /worksites/:id/cameras] [${requestId}] === Port Calculation Verification ===`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Mountpoint ID: ${requestedId}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] JANUS_RTP_BASE_PORT: ${process.env.JANUS_RTP_BASE_PORT || '20000'}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] JANUS_RTP_PORT_RANGE: ${process.env.JANUS_RTP_PORT_RANGE || '10000'}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Calculated Video Port: ${janusRtpPort}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Calculation: ${Number(process.env.JANUS_RTP_BASE_PORT || '20000')} + (${requestedId} % ${Number(process.env.JANUS_RTP_PORT_RANGE || '10000')}) = ${janusRtpPort}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] This port will be passed to Janus mountpoint creation`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] This port will be passed to Camera Ingest Service`);
      
      console.log(`[API /worksites/:id/cameras] [${requestId}] Creating Janus RTP mount...`);
      janusFeedId = await createRtpMountpoint({
        mountpointId: requestedId,
        videoPort: janusRtpPort,
        videoCodec: janusRtpCodec,
        payloadType: janusPayloadType,
      });
      console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Janus mount created with feed ID: ${janusFeedId}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] ⚠️ VERIFY: Janus mountpoint ${janusFeedId} is configured to receive RTP on port ${janusRtpPort}`);
    } catch (janusError: any) {
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Janus mount creation failed:`, janusError.message);
      
      // Provide helpful error message if Janus is not reachable
      let errorMessage = janusError.message;
      let helpfulHint = '';
      
      if (janusError.message?.includes('connect') || 
          janusError.message?.includes('ECONNREFUSED') ||
          janusError.message?.includes('Failed to connect')) {
        helpfulHint = 'Janus Gateway is not running. Please start Janus Gateway on ports 8088 (HTTP) and 7088 (Admin).';
      } else if (janusError.message?.includes('JANUS_HTTP_URL') || 
                 janusError.message?.includes('JANUS_ADMIN_URL')) {
        helpfulHint = 'Janus environment variables are not configured. Please set JANUS_HTTP_URL and JANUS_ADMIN_URL in your .env file.';
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create Janus RTP mount',
          details: errorMessage,
          hint: helpfulHint || undefined
        },
        { status: 500 }
      );
    }

    // Step 8: Create Camera DB record with janusFeedId
    let camera;
    try {
      console.log(`[API /worksites/:id/cameras] [${requestId}] Creating camera DB record...`);
      camera = await prisma.camera.create({
        data: {
          name: name.trim(),
          type: 'RTSP',
          streamUrl: rtspUrl.trim(),
          location: cameraLocation,
          worksiteId,
          janusFeedId,
          status: 'online',
          metadata: {
            aiEnabled,
            overlayEnabled,
            recording: true,
            janusRtpHost,
            janusRtpPort,
            janusRtpPayloadType: janusPayloadType,
            janusRtpCodec,
            inputCodec: detectedCodec, // Store detected codec for FFmpeg transcoding decisions
          }
        },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          streamUrl: true,
          janusFeedId: true,
          worksiteId: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });
      console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Camera created in DB: ${camera.id}`);
    } catch (dbError: any) {
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ DB creation failed, cleaning up Janus mount...`);
      
      // CLEANUP: If DB fails, destroy the Janus mount we just created
      if (janusFeedId !== null) {
        try {
          await destroyRtspPublisher(janusFeedId);
          console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Janus mount cleaned up: ${janusFeedId}`);
        } catch (cleanupError: any) {
          console.error(`[API /worksites/:id/cameras] [${requestId}] ⚠️ Failed to cleanup Janus mount: ${cleanupError.message}`);
          // Log but don't throw - the main error is the DB failure
        }
      }

      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create camera in database',
          details: dbError.message
        },
        { status: 500 }
      );
    }

    // Step 9: Start RTP push (ffmpeg worker) before AI pipeline
    try {
      if (!janusRtpPort || janusFeedId === null) {
        throw new Error('Missing RTP port or Janus mountpoint');
      }
      
      // ============================================================
      // PORT VERIFICATION BEFORE STARTING RTP WORKER
      // ============================================================
      console.log(`[API /worksites/:id/cameras] [${requestId}] === Starting RTP Worker ===`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Camera ID: ${camera.id}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Janus Feed ID: ${janusFeedId}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] RTP Host: ${janusRtpHost}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] RTP Port: ${janusRtpPort} ⚠️ MUST MATCH Janus mountpoint port`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Payload Type: ${janusPayloadType}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Video Codec: ${janusRtpCodec}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] Input Codec: ${detectedCodec}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] ⚠️ CRITICAL: FFmpeg will send RTP to ${janusRtpHost}:${janusRtpPort}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] ⚠️ CRITICAL: Janus mountpoint ${janusFeedId} expects RTP on port ${janusRtpPort}`);
      console.log(`[API /worksites/:id/cameras] [${requestId}] ⚠️ VERIFY: These ports MUST match or video will not work!`);
      
      await startRtpPush({
        cameraId: camera.id,
        rtspUrl: rtspUrl.trim(),
        mountpointId: janusFeedId,
        rtpHost: janusRtpHost,
        rtpPort: janusRtpPort,
        payloadType: janusPayloadType,
        videoCodec: janusRtpCodec,
        inputCodec: detectedCodec, // Pass detected codec for codec-aware transcoding
      });
      
      console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ RTP worker started - FFmpeg should be sending to ${janusRtpHost}:${janusRtpPort}`);
    } catch (workerError: any) {
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Failed to start RTP push:`, workerError.message);
      try {
        await prisma.camera.delete({ where: { id: camera.id } });
      } catch (cleanupError: any) {
        console.error(`[API /worksites/:id/cameras] [${requestId}] ⚠️ Failed to delete camera after worker error: ${cleanupError.message}`);
      }
      if (janusFeedId !== null) {
        try {
          await destroyRtspPublisher(janusFeedId);
        } catch (cleanupError: any) {
          console.error(`[API /worksites/:id/cameras] [${requestId}] ⚠️ Failed to cleanup Janus mount: ${cleanupError.message}`);
        }
      }
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to start streaming worker',
          details: workerError.message,
        },
        { status: 500 }
      );
    }

    // Step 10: Auto-start YOLO pipeline (AI always on)
    let rtpPort: number | null = null;
    let rtpStreamId: number | undefined;
    try {
      const yoloServiceUrl = process.env.YOLO_SERVICE_URL || 'http://localhost:8765';
      const yoloRtpHost = process.env.YOLO_RTP_HOST || '127.0.0.1';
      const yoloBasePort = parseInt(process.env.YOLO_RTP_BASE_PORT || '5004', 10);
      const rtpCodec = process.env.YOLO_RTP_CODEC || 'vp8';

      rtpPort = (camera.metadata as any)?.yoloRtpPort || (yoloBasePort + janusFeedId);

      const forwardResult = await startRtpForward({
        mountpointId: janusFeedId,
        host: yoloRtpHost,
        port: rtpPort,
        codec: rtpCodec,
      });
      rtpStreamId = forwardResult.streamId;

      const startUrl = `${yoloServiceUrl}/rtp/start/${janusFeedId}?rtp_port=${rtpPort}&camera_id=${camera.id}`;
      const yoloResponse = await fetch(startUrl, { method: 'POST' });
      if (!yoloResponse.ok) {
        throw new Error(`YOLO service start failed: ${yoloResponse.status}`);
      }

      const updatedMetadata = {
        ...(camera.metadata as any),
        aiEnabled: true,
        overlayEnabled,
        yoloRtpPort: rtpPort,
        yoloRtpStreamId: rtpStreamId,
      };

      camera = await prisma.camera.update({
        where: { id: camera.id },
        data: { metadata: updatedMetadata },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          streamUrl: true,
          janusFeedId: true,
          worksiteId: true,
          metadata: true,
          createdAt: true,
          updatedAt: true
        }
      });
    } catch (aiError: any) {
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Failed to auto-start AI:`, aiError.message);

      if (janusFeedId !== null) {
        try {
          await stopRtpForward({ mountpointId: janusFeedId, streamId: rtpStreamId });
        } catch (cleanupError: any) {
          console.error(`[API /worksites/:id/cameras] [${requestId}] ⚠️ Failed to stop RTP forward: ${cleanupError.message}`);
        }
      }

      try {
        await prisma.camera.delete({ where: { id: camera.id } });
      } catch (cleanupError: any) {
        console.error(`[API /worksites/:id/cameras] [${requestId}] ⚠️ Failed to delete camera after AI error: ${cleanupError.message}`);
      }

      if (janusFeedId !== null) {
        try {
          await destroyRtspPublisher(janusFeedId);
        } catch (cleanupError: any) {
          console.error(`[API /worksites/:id/cameras] [${requestId}] ⚠️ Failed to cleanup Janus mount: ${cleanupError.message}`);
        }
      }

      return NextResponse.json(
        {
          success: false,
          error: 'Failed to start AI pipeline',
          details: aiError.message
        },
        { status: 500 }
      );
    }

    // Step 11: Format response
    const response = {
      success: true,
      data: {
        id: camera.id,
        name: camera.name,
        janusFeedId: camera.janusFeedId,
        status: camera.status,
        aiEnabled: (camera.metadata as any)?.aiEnabled ?? aiEnabled,
        overlayEnabled: (camera.metadata as any)?.overlayEnabled ?? aiEnabled,
        worksiteId: camera.worksiteId,
        streamUrl: camera.streamUrl,
        createdAt: camera.createdAt.toISOString(),
        updatedAt: camera.updatedAt.toISOString(),
      }
    };

    console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Camera created successfully: ${camera.id}`);
    return NextResponse.json(response, { status: 201 });

  } catch (error: any) {
    console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Unexpected error:`, error);
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


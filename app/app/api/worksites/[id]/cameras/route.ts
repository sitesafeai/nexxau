/**
 * POST /api/worksites/:id/cameras
 *
 * Add a new camera to a worksite with MediaMTX.
 * 1. Validates input (name, rtspUrl)
 * 2. Creates Camera DB record
 * 3. Registers stream in MediaMTX (camera ID as stream name)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { addStreamToMediaMTX } from '@/app/lib/services/mediamtxClient';
import { seedDefaultRules } from '@/app/lib/defaultRules';

export const runtime = 'nodejs';

const SUPPORTED_STREAM_URL_PREFIXES = ['rtsp://', 'rtsps://', 'rtmp://', 'https://', 'http://'];

function isSupportedStreamUrl(streamUrl: string): boolean {
  const lowerUrl = streamUrl.toLowerCase().trim();
  return SUPPORTED_STREAM_URL_PREFIXES.some((prefix) => lowerUrl.startsWith(prefix));
}

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
    const { name, rtspUrl, location, enableAi, enableAI, skipValidation } = body;

    console.log(`[API /worksites/:id/cameras] [${requestId}] Worksite ID: ${worksiteId}`);
    console.log(`[API /worksites/:id/cameras] [${requestId}] Request body:`, { name, rtspUrl: rtspUrl ? '***' : undefined });

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

    // --- Add camera with stream URL (create MediaMTX stream) ---
    if (!rtspUrl || typeof rtspUrl !== 'string' || !rtspUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Stream URL is required' },
        { status: 400 }
      );
    }

    const rtspUrlTrimmed = rtspUrl.trim();
    if (!rtspUrlTrimmed || !isSupportedStreamUrl(rtspUrlTrimmed)) {
      const toLog = rtspUrlTrimmed ? rtspUrlTrimmed.replace(/:[^:@]+@/, ':****@') : '(empty)';
      console.log('[API /worksites/:id/cameras] Stream URL validation failed for URL:', toLog);
      return NextResponse.json(
        { success: false, error: 'Invalid stream URL — must start with rtsp://, rtsps://, rtmp://, https://, or http://' },
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

    // Step 6: Stream URL scheme already validated above. No ffprobe — accepts IP, hostname, test streams.

    // Step 7: Create camera in DB first (to get camera ID)
    const camera = await prisma.camera.create({
      data: {
        name: name.trim(),
        type: 'IP Camera',
        streamProvider: 'rtsp',
        ingestUrl: rtspUrlTrimmed,
        streamUrl: rtspUrlTrimmed,
        location: cameraLocation,
        zone: cameraLocation,
        worksiteId,
        status: 'online',
        metadata: {
          aiEnabled,
          overlayEnabled,
        },
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        streamUrl: true,
        worksiteId: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Camera created in DB: ${camera.id}`);

    // Step 7b: Seed predefined detection rules
    await seedDefaultRules(camera.id, prisma);

    // Step 8: Add stream to MediaMTX (use camera ID as stream name)
    const mediamtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://localhost:9000';
    const streamAdded = await addStreamToMediaMTX(mediamtxApiUrl, camera.id, rtspUrlTrimmed);

    if (!streamAdded) {
      // Rollback: delete camera from DB
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Failed to add stream to MediaMTX, rolling back`);
      await prisma.camera.delete({ where: { id: camera.id } });
      
      return NextResponse.json(
        { success: false, error: 'Failed to add stream to MediaMTX' },
        { status: 500 }
      );
    }

    console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Stream added to MediaMTX: ${camera.id}`);

    // Success!
    return NextResponse.json(
      {
        success: true,
        data: {
          id: camera.id,
          name: camera.name,
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
  } catch (error: any) {
    console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Error:`, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}


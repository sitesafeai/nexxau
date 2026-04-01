/**
 * POST /api/worksites/:id/cameras
 *
 * Add a new camera to a worksite with go2rtc.
 * 1. Validates input (name, rtspUrl)
 * 2. Creates Camera DB record
 * 3. Registers stream in go2rtc (camera ID as stream name)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';
import { addStreamToGo2RTC } from '@/lib/services/go2rtcClient';
import { seedDefaultRules } from '@/lib/defaultRules';

export const runtime = 'nodejs';

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

    // --- Add camera with RTSP URL (create go2rtc stream) ---
    if (!rtspUrl || typeof rtspUrl !== 'string' || !rtspUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'RTSP URL is required' },
        { status: 400 }
      );
    }

    const rtspUrlTrimmed = rtspUrl.trim();
    if (!rtspUrlTrimmed || !rtspUrlTrimmed.startsWith('rtsp://')) {
      const toLog = rtspUrlTrimmed ? rtspUrlTrimmed.replace(/:[^:@]+@/, ':****@') : '(empty)';
      console.log('[API /worksites/:id/cameras] RTSP validation failed for URL:', toLog);
      return NextResponse.json(
        { success: false, error: 'Invalid RTSP URL — must start with rtsp://' },
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

    // Step 6: RTSP format already validated above (must start with rtsp://). No ffprobe — accepts IP, hostname, test streams.

    // Step 7: Create camera in DB first (to get camera ID)
    const camera = await prisma.camera.create({
      data: {
        name: name.trim(),
        type: 'IP Camera',
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

    // Step 8: Add stream to go2rtc (use camera ID as stream name)
    const go2rtcUrl = process.env.GO2RTC_URL || 'http://localhost:1984';
    const streamAdded = await addStreamToGo2RTC(go2rtcUrl, camera.id, rtspUrlTrimmed);

    if (!streamAdded) {
      // Rollback: delete camera from DB
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Failed to add stream to go2rtc, rolling back`);
      await prisma.camera.delete({ where: { id: camera.id } });
      
      return NextResponse.json(
        { success: false, error: 'Failed to add stream to go2rtc' },
        { status: 500 }
      );
    }

    console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Stream added to go2rtc: ${camera.id}`);

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


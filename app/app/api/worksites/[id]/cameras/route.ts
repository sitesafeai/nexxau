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
import { createRtspPublisher, destroyRtspPublisher } from '@/app/lib/services/janusRtspService';

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

    // Step 2: Authorization
    const userRole = normalizeRole(session.user.role);
    const canCreateCamera = 
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'SITE_ADMIN' ||
      userRole === 'SAFETY_MANAGER';

    if (!canCreateCamera) {
      console.log(`[API /worksites/:id/cameras] [${requestId}] ❌ Permission denied: ${userRole}`);
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create cameras' },
        { status: 403 }
      );
    }

    // Step 3: Parse parameters and body
    const { id: worksiteId } = await params;
    const body = await request.json();
    const { name, rtspUrl } = body;

    console.log(`[API /worksites/:id/cameras] [${requestId}] Worksite ID: ${worksiteId}`);
    console.log(`[API /worksites/:id/cameras] [${requestId}] Request body:`, { name, rtspUrl: rtspUrl ? '***' : undefined });

    // Step 4: Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Camera name is required' },
        { status: 400 }
      );
    }

    if (!rtspUrl || typeof rtspUrl !== 'string' || !rtspUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'RTSP URL is required' },
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

    // Step 6: Create Janus RTSP mount FIRST (before DB write)
    // If this fails, we don't create the DB record
    let janusFeedId: number | null = null;
    try {
      console.log(`[API /worksites/:id/cameras] [${requestId}] Creating Janus RTSP mount...`);
      janusFeedId = await createRtspPublisher(rtspUrl.trim());
      console.log(`[API /worksites/:id/cameras] [${requestId}] ✅ Janus mount created with feed ID: ${janusFeedId}`);
    } catch (janusError: any) {
      console.error(`[API /worksites/:id/cameras] [${requestId}] ❌ Janus mount creation failed:`, janusError.message);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create Janus RTSP mount',
          details: janusError.message
        },
        { status: 500 }
      );
    }

    // Step 7: Create Camera DB record with janusFeedId
    let camera;
    try {
      console.log(`[API /worksites/:id/cameras] [${requestId}] Creating camera DB record...`);
      camera = await prisma.camera.create({
        data: {
          name: name.trim(),
          type: 'RTSP',
          streamUrl: rtspUrl.trim(),
          worksiteId,
          janusFeedId,
          status: 'online',
          metadata: {
            aiEnabled: false,
            recording: true,
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

    // Step 8: Format response
    const response = {
      success: true,
      data: {
        id: camera.id,
        name: camera.name,
        janusFeedId: camera.janusFeedId,
        status: camera.status,
        aiEnabled: (camera.metadata as any)?.aiEnabled ?? false,
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


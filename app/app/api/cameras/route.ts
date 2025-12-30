import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import * as path from 'path';
import * as fs from 'fs';

/**
 * GET /api/cameras
 * Get cameras, optionally filtered by worksiteId
 * 
 * Query parameters:
 * - worksiteId: Filter cameras by worksite ID
 * 
 * Returns: Array of cameras or { cameras: [...] }
 */
export async function GET(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const startTime = Date.now();
  
  // Outer try/catch for any unexpected errors
  try {
    console.log(`[API /cameras] [${requestId}] GET request received at:`, new Date().toISOString());
    console.log(`[API /cameras] [${requestId}] Request URL:`, request.url);
    
    // Quick database connectivity check
    try {
      const dbCheckStart = Date.now();
      await Promise.race([
        prisma.$queryRaw`SELECT 1`,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection check timeout after 3s')), 3000)
        )
      ]);
      const dbCheckDuration = Date.now() - dbCheckStart;
      console.log(`[API /cameras] [${requestId}] Database connection check: OK (${dbCheckDuration}ms)`);
    } catch (dbCheckError: any) {
      console.error(`[API /cameras] [${requestId}] ❌ Database connection check failed:`, dbCheckError);
      return NextResponse.json(
        {
          error: 'Database unavailable',
          code: 'DATABASE_ERROR',
          message: 'Unable to connect to database. Please try again later.'
        },
        { status: 503 }
      );
    }
    
    // ============================================================
    // PART A: DEFENSIVE GUARDS (MANDATORY)
    // ============================================================
    
    // 1. Validate authenticated user exists
    console.log(`[API /cameras] [${requestId}] Step 1: Validating session...`);
    let session;
    try {
      const sessionStart = Date.now();
      // Add timeout to session lookup (5 seconds)
      session = await Promise.race([
        getServerSession(authOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Session lookup timeout after 5s')), 5000)
        )
      ]) as any;
      const sessionDuration = Date.now() - sessionStart;
      console.log(`[API /cameras] [${requestId}] Session lookup took ${sessionDuration}ms`);
    } catch (sessionError: any) {
      console.error(`[API /cameras] [${requestId}] ❌ Session lookup failed:`, sessionError);
      console.error(`[API /cameras] [${requestId}] Session error name:`, sessionError.name);
      console.error(`[API /cameras] [${requestId}] Session error message:`, sessionError.message);
      console.error(`[API /cameras] [${requestId}] Session error stack:`, sessionError.stack);
      
      // Check if it's a timeout
      if (sessionError.message?.includes('timeout')) {
        return NextResponse.json(
          { 
            error: 'Request timeout',
            code: 'TIMEOUT',
            message: 'Session lookup timed out'
          },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: 'SESSION_ERROR',
          message: 'Failed to validate session'
        },
        { status: 401 }
      );
    }
    
    if (!session?.user) {
      console.log(`[API /cameras] [${requestId}] ❌ Unauthorized: No session`);
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          code: 'UNAUTHORIZED'
        },
        { status: 401 }
      );
    }

    console.log(`[API /cameras] [${requestId}] Session validated. User:`, session.user.email);

    // 2. Get and validate user from database
    console.log(`[API /cameras] [${requestId}] Step 2: Fetching user from database...`);
    let currentUser;
    try {
      const userQueryStart = Date.now();
      currentUser = await Promise.race([
        prisma.user.findUnique({
          where: { email: session.user.email || undefined },
          select: {
            id: true,
            email: true,
            role: true,
            isActivated: true,
            companyId: true,
            worksiteAccess: {
              select: {
                worksiteId: true,
                role: true
              }
            }
          }
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timeout after 10s')), 10000)
        )
      ]) as any;
      const userQueryDuration = Date.now() - userQueryStart;
      console.log(`[API /cameras] [${requestId}] User query took ${userQueryDuration}ms`);
    } catch (dbError: any) {
      console.error(`[API /cameras] [${requestId}] ❌ Database error fetching user:`, dbError);
      console.error(`[API /cameras] [${requestId}] Error name:`, dbError.name);
      console.error(`[API /cameras] [${requestId}] Error message:`, dbError.message);
      console.error(`[API /cameras] [${requestId}] Error stack:`, dbError.stack);
      
      // Check if it's a timeout
      if (dbError.message?.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Request timeout',
            code: 'TIMEOUT',
            message: 'Database query timed out while fetching user'
          },
          { status: 504 }
        );
      }
      
      return NextResponse.json(
        {
          error: 'Unable to load cameras',
          code: 'CAMERA_FETCH_FAILED',
          message: 'Database error while validating user'
        },
        { status: 500 }
      );
    }

    // 3. Validate user exists and is active
    if (!currentUser) {
      console.log(`[API /cameras] [${requestId}] ❌ User not found in database`);
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'USER_NOT_FOUND'
        },
        { status: 401 }
      );
    }

    if (currentUser.isActivated === false) {
      console.log(`[API /cameras] [${requestId}] ❌ User is not activated`);
      return NextResponse.json(
        {
          error: 'Unauthorized',
          code: 'USER_INACTIVE'
        },
        { status: 401 }
      );
    }

    console.log(`[API /cameras] [${requestId}] User validated. ID:`, currentUser.id);

    // 4. Validate worksiteId if provided
    console.log(`[API /cameras] [${requestId}] Step 3: Parsing query parameters...`);
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    console.log(`[API /cameras] [${requestId}] worksiteId from query:`, worksiteId);

    if (worksiteId) {
      // Validate worksiteId is a valid string (not empty, reasonable length)
      if (typeof worksiteId !== 'string' || worksiteId.trim().length === 0 || worksiteId.length > 100) {
        console.log(`[API /cameras] [${requestId}] ❌ Invalid worksiteId format:`, worksiteId);
        return NextResponse.json(
          {
            error: 'Invalid worksite ID format',
            code: 'INVALID_WORKSITE_ID'
          },
          { status: 400 }
        );
      }

      // 5. Validate user has access to worksite
      console.log(`[API /cameras] [${requestId}] Step 4: Validating worksite access...`);
      const userRole = normalizeRole(currentUser.role);
      const isGlobalAdmin = 
        userRole === 'SUPER_ADMIN' ||
        userRole === 'COMPANY_ADMIN' ||
        userRole === 'ADMIN';

      let hasAccess = false;

      if (isGlobalAdmin) {
        // Global admins can access any worksite
        // Verify worksite exists
        try {
          const worksiteCheckStart = Date.now();
          const worksite = await Promise.race([
            prisma.worksite.findUnique({
              where: { id: worksiteId.trim() },
              select: { id: true }
            }),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Worksite query timeout after 10s')), 10000)
            )
          ]) as any;
          const worksiteCheckDuration = Date.now() - worksiteCheckStart;
          console.log(`[API /cameras] [${requestId}] Worksite check took ${worksiteCheckDuration}ms`);
          
          hasAccess = !!worksite;
          if (!hasAccess) {
            console.log(`[API /cameras] [${requestId}] ❌ Worksite not found:`, worksiteId);
            return NextResponse.json(
              {
                error: 'Worksite not found',
                code: 'WORKSITE_NOT_FOUND'
              },
              { status: 404 }
            );
          }
        } catch (dbError: any) {
          console.error(`[API /cameras] [${requestId}] ❌ Database error checking worksite:`, dbError);
          console.error(`[API /cameras] [${requestId}] Error name:`, dbError.name);
          console.error(`[API /cameras] [${requestId}] Error message:`, dbError.message);
          
          if (dbError.message?.includes('timeout')) {
            return NextResponse.json(
              {
                error: 'Request timeout',
                code: 'TIMEOUT',
                message: 'Database query timed out while checking worksite'
              },
              { status: 504 }
            );
          }
          
          return NextResponse.json(
            {
              error: 'Unable to load cameras',
              code: 'CAMERA_FETCH_FAILED',
              message: 'Database error while validating worksite'
            },
            { status: 500 }
          );
        }
      } else {
        // Regular users: check worksiteAccess
        const userWorksiteAccess = currentUser.worksiteAccess.find(
          (access) => access.worksiteId === worksiteId.trim()
        );

        if (!userWorksiteAccess) {
          // Also check if worksite belongs to user's company
          if (currentUser.companyId) {
            try {
              const worksiteCheckStart = Date.now();
              const worksite = await Promise.race([
                prisma.worksite.findUnique({
                  where: { id: worksiteId.trim() },
                  select: { id: true, companyId: true }
                }),
                new Promise((_, reject) => 
                  setTimeout(() => reject(new Error('Worksite query timeout after 10s')), 10000)
                )
              ]) as any;
              const worksiteCheckDuration = Date.now() - worksiteCheckStart;
              console.log(`[API /cameras] [${requestId}] Worksite company check took ${worksiteCheckDuration}ms`);

              if (worksite && worksite.companyId === currentUser.companyId) {
                hasAccess = true;
              } else {
                console.log(`[API /cameras] [${requestId}] ❌ User does not have access to worksite:`, worksiteId);
                return NextResponse.json(
                  {
                    error: 'Forbidden',
                    code: 'ACCESS_DENIED'
                  },
                  { status: 403 }
                );
              }
            } catch (dbError: any) {
              console.error(`[API /cameras] [${requestId}] ❌ Database error checking worksite access:`, dbError);
              console.error(`[API /cameras] [${requestId}] Error name:`, dbError.name);
              console.error(`[API /cameras] [${requestId}] Error message:`, dbError.message);
              
              if (dbError.message?.includes('timeout')) {
                return NextResponse.json(
                  {
                    error: 'Request timeout',
                    code: 'TIMEOUT',
                    message: 'Database query timed out while checking worksite access'
                  },
                  { status: 504 }
                );
              }
              
              return NextResponse.json(
                {
                  error: 'Unable to load cameras',
                  code: 'CAMERA_FETCH_FAILED',
                  message: 'Database error while validating worksite access'
                },
                { status: 500 }
              );
            }
          } else {
            console.log(`[API /cameras] [${requestId}] ❌ User does not have access to worksite:`, worksiteId);
            return NextResponse.json(
              {
                error: 'Forbidden',
                code: 'ACCESS_DENIED'
              },
              { status: 403 }
            );
          }
        } else {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        console.log(`[API /cameras] [${requestId}] ❌ Access denied to worksite:`, worksiteId);
        return NextResponse.json(
          {
            error: 'Forbidden',
            code: 'ACCESS_DENIED'
          },
          { status: 403 }
        );
      }
    }

    console.log(`[API /cameras] [${requestId}] ✅ All guards passed. Query params - worksiteId:`, worksiteId);

    // ============================================================
    // PART B: DATABASE QUERY (WRAPPED IN TRY/CATCH WITH TIMEOUT)
    // ============================================================

    console.log(`[API /cameras] [${requestId}] Step 5: Querying cameras from database...`);
    let cameras;
    try {
      // Build where clause
      const whereClause: any = {};
      if (worksiteId) {
        whereClause.worksiteId = worksiteId.trim();
        console.log(`[API /cameras] [${requestId}] Filtering by worksiteId:`, worksiteId);
      }

      // Query cameras from database with timeout
      const cameraQueryStart = Date.now();
      cameras = await Promise.race([
        prisma.camera.findMany({
          where: whereClause,
          select: {
            id: true,
            name: true,
            status: true,
            location: true,
            streamUrl: true,
            hlsUrl: true,
            mediamtxPath: true,
            rtspPath: true,
            ipAddress: true,
            port: true,
            metadata: true,
            worksiteId: true,
            type: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Camera query timeout after 15s')), 15000)
        )
      ]) as any;
      
      const cameraQueryDuration = Date.now() - cameraQueryStart;
      console.log(`[API /cameras] [${requestId}] Camera query took ${cameraQueryDuration}ms`);
    } catch (dbError: any) {
      // Log full error server-side
      console.error(`[API /cameras] [${requestId}] ❌ Database error:`, dbError);
      console.error(`[API /cameras] [${requestId}] Error name:`, dbError.name);
      console.error(`[API /cameras] [${requestId}] Error message:`, dbError.message);
      console.error(`[API /cameras] [${requestId}] Error stack:`, dbError.stack);
      if (dbError.code) console.error(`[API /cameras] [${requestId}] Error code:`, dbError.code);
      if (dbError.meta) console.error(`[API /cameras] [${requestId}] Error meta:`, dbError.meta);

      // Check if it's a timeout
      if (dbError.message?.includes('timeout')) {
        return NextResponse.json(
          {
            error: 'Request timeout',
            code: 'TIMEOUT',
            message: 'Database query timed out while fetching cameras'
          },
          { status: 504 }
        );
      }

      return NextResponse.json(
        {
          error: 'Unable to load cameras',
          code: 'CAMERA_FETCH_FAILED',
          message: 'Database query failed'
        },
        { status: 500 }
      );
    }

    // ============================================================
    // PART C: HANDLE EMPTY STATES (NOT AN ERROR)
    // ============================================================

    console.log(`[API /cameras] [${requestId}] Cameras found:`, cameras.length);

    // Empty array is valid - return 200 with []
    if (cameras.length === 0) {
      const totalDuration = Date.now() - startTime;
      console.log(`[API /cameras] [${requestId}] ✅ No cameras found - returning empty array (took ${totalDuration}ms)`);
      return NextResponse.json([], { status: 200 });
    }

    // ============================================================
    // PART D: FORMAT RESPONSE
    // ============================================================

    console.log(`[API /cameras] [${requestId}] Step 6: Formatting camera data...`);
    let formattedCameras;
    try {
      const formatStart = Date.now();
      formattedCameras = cameras.map((c: any) => ({
        id: c.id,
        name: c.name || 'Unnamed Camera',
        status: c.status || 'pending',
        location: c.location || null,
        streamUrl: c.streamUrl || null,
        hlsUrl: c.hlsUrl || null,
        mediamtxPath: c.mediamtxPath || null,
        rtspPath: c.rtspPath || null,
        ipAddress: c.ipAddress || null,
        port: c.port || null,
        type: c.type || 'RTSP',
        worksiteId: c.worksiteId,
        // Extract metadata fields if present
        aiEnabled: (c.metadata as any)?.aiEnabled ?? false,
        recording: (c.metadata as any)?.recording ?? true,
        recentViolations: (c.metadata as any)?.recentViolations ?? 0,
        lastDetection: (c.metadata as any)?.lastDetection || null,
        uptime24h: (c.metadata as any)?.uptime24h ?? 99,
        thumbnailUrl: (c.metadata as any)?.thumbnailUrl || null,
        zone: c.location || (c.metadata as any)?.zone || null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }));
      const formatDuration = Date.now() - formatStart;
      console.log(`[API /cameras] [${requestId}] Formatting took ${formatDuration}ms`);
    } catch (formatError: any) {
      console.error(`[API /cameras] [${requestId}] ❌ Error formatting cameras:`, formatError);
      console.error(`[API /cameras] [${requestId}] Format error stack:`, formatError.stack);
      return NextResponse.json(
        {
          error: 'Unable to load cameras',
          code: 'CAMERA_FETCH_FAILED',
          message: 'Error formatting camera data'
        },
        { status: 500 }
      );
    }

    const totalDuration = Date.now() - startTime;
    console.log(`[API /cameras] [${requestId}] ✅ Successfully returning ${formattedCameras.length} cameras (total: ${totalDuration}ms)`);
    
    // Return JSON array (frontend handles both array and { cameras: [...] } formats)
    return NextResponse.json(formattedCameras, { status: 200 });

  } catch (error: any) {
    // Catch-all for any unexpected errors
    const totalDuration = Date.now() - startTime;
    console.error(`[API /cameras] [${requestId}] ❌ Unexpected error (after ${totalDuration}ms):`, error);
    console.error(`[API /cameras] [${requestId}] Error name:`, error.name);
    console.error(`[API /cameras] [${requestId}] Error message:`, error.message);
    console.error(`[API /cameras] [${requestId}] Error stack:`, error.stack);
    
    // Check if it's a timeout
    if (error.name === 'TimeoutError' || error.message?.includes('timeout') || error.message?.includes('timed out')) {
      return NextResponse.json(
        {
          error: 'Request timeout',
          code: 'TIMEOUT',
          message: 'Request timed out'
        },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Unable to load cameras',
        code: 'CAMERA_FETCH_FAILED',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cameras
 * Create a new camera
 * 
 * Body: {
 *   name: string (required)
 *   type: 'IP Camera (RTSP)' | 'ONVIF Camera' | 'Cloud Stream' (required)
 *   streamUrl: string (required, must start with rtsp://)
 *   worksiteId: string (required)
 *   username?: string (optional)
 *   password?: string (optional)
 *   frameRate?: number (optional)
 *   resolution?: string (optional)
 * }
 * 
 * Permissions: ADMIN, COMPANY_ADMIN, SITE_ADMIN, or SAFETY_MANAGER
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API /cameras] POST request received at:', new Date().toISOString());
    
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions
    const userRole = normalizeRole(session.user.role);
    const canCreateCamera = 
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'SITE_ADMIN' ||
      userRole === 'SAFETY_MANAGER' ||
      userRole === 'SAFETY_ADMIN';

    if (!canCreateCamera) {
      console.log('[API /cameras] Permission denied:', { userRole, email: session.user.email });
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create cameras' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, type, streamUrl, worksiteId, username, password, frameRate, resolution } = body;

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Camera name is required' },
        { status: 400 }
      );
    }

    if (!type || !['IP Camera (RTSP)', 'ONVIF Camera', 'Cloud Stream'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Valid camera type is required' },
        { status: 400 }
      );
    }

    if (!streamUrl || typeof streamUrl !== 'string' || !streamUrl.trim()) {
      return NextResponse.json(
        { success: false, error: 'Stream URL is required' },
        { status: 400 }
      );
    }

    // Validate RTSP URL format
    if (type === 'IP Camera (RTSP)' || type === 'ONVIF Camera') {
      if (!streamUrl.startsWith('rtsp://')) {
        return NextResponse.json(
          { success: false, error: 'RTSP URL must start with rtsp://' },
          { status: 400 }
        );
      }
    }

    if (!worksiteId || typeof worksiteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Worksite ID is required' },
        { status: 400 }
      );
    }

    // Verify worksite exists and user has access
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: { id: true, name: true, companyId: true }
    });

    if (!worksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // Get current user for audit log
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      select: { id: true }
    });

    // Map camera type to database type
    const cameraType = type === 'IP Camera (RTSP)' ? 'RTSP' : type === 'ONVIF Camera' ? 'ONVIF' : 'CLOUD';

    // Create camera
    const camera = await prisma.camera.create({
      data: {
        name: name.trim(),
        type: cameraType,
        streamUrl: streamUrl.trim(),
        worksiteId,
        status: 'pending', // Initial status - will be updated when stream is verified
        username: username?.trim() || null,
        password: password?.trim() || null, // Note: Should be encrypted in production
        metadata: {
          frameRate: frameRate || null,
          resolution: resolution || null,
          aiEnabled: false, // Default to false, can be enabled later
          recording: true, // Default to true
        }
      },
      select: {
        id: true,
        name: true,
        type: true,
        status: true,
        streamUrl: true,
        worksiteId: true,
        createdAt: true,
        updatedAt: true
      }
    });

    console.log('[API /cameras] ✅ Camera created:', camera.id, camera.name);

    // ============================================================
    // AUTOMATIC RTSP → HLS CONVERSION
    // ============================================================
    // CRITICAL: Start HLS conversion immediately for RTSP cameras
    // This runs asynchronously so API response isn't blocked
    if ((cameraType === 'RTSP' || cameraType === 'ONVIF') && streamUrl.trim().startsWith('rtsp://')) {
      console.log(`[API /cameras] 🎬 Starting automatic RTSP → HLS conversion for camera ${camera.id}`);
      
      // Start conversion asynchronously (don't block API response)
      (async () => {
        try {
          const { ensureHlsStream } = await import('@/app/lib/streaming/hlsManager');
          const hlsUrl = ensureHlsStream(camera.id, streamUrl.trim());
          
          if (hlsUrl) {
            // Wait for first segment to be created (up to 15 seconds)
            const maxWaitTime = 15000; // 15 seconds
            const checkInterval = 500; // Check every 500ms
            const startTime = Date.now();
            let playlistReady = false;
            
            // Determine stream directory path
            const cwd = process.cwd();
            let streamDir: string;
            if (fs.existsSync(path.join(cwd, 'public'))) {
              streamDir = path.join(cwd, 'public', 'streams', camera.id);
            } else if (fs.existsSync(path.join(cwd, 'app', 'public'))) {
              streamDir = path.join(cwd, 'app', 'public', 'streams', camera.id);
            } else {
              streamDir = path.join(cwd, 'public', 'streams', camera.id);
            }
            
            const playlistPath = path.join(streamDir, 'index.m3u8');
            
            // Poll for playlist file creation
            while (Date.now() - startTime < maxWaitTime) {
              if (fs.existsSync(playlistPath)) {
                try {
                  const playlistContent = fs.readFileSync(playlistPath, 'utf8');
                  // Check if playlist has at least one segment
                  if (playlistContent.includes('.ts') && !playlistContent.includes('#EXT-X-ENDLIST')) {
                    playlistReady = true;
                    console.log(`[API /cameras] ✅ HLS playlist ready for camera ${camera.id} after ${Date.now() - startTime}ms`);
                    break;
                  }
                } catch (readError) {
                  // Playlist exists but can't read it yet - continue waiting
                }
              }
              await new Promise(resolve => setTimeout(resolve, checkInterval));
            }
            
            if (playlistReady) {
              // Update camera with HLS URL and mark as online
              await prisma.camera.update({
                where: { id: camera.id },
                data: {
                  hlsUrl: hlsUrl,
                  status: 'active', // Mark as active once HLS is ready
                }
              });
              
              console.log(`[API /cameras] ✅ HLS conversion complete for camera ${camera.id}: ${hlsUrl}`);
            } else {
              // Playlist not ready after timeout - mark as pending but don't fail
              console.warn(`[API /cameras] ⚠️ HLS playlist not ready for camera ${camera.id} after ${maxWaitTime}ms - will retry on next access`);
              // Don't update status - keep as 'pending' so frontend knows to retry
            }
          } else {
            // HLS conversion failed to start
            console.error(`[API /cameras] ❌ Failed to start HLS conversion for camera ${camera.id}`);
            await prisma.camera.update({
              where: { id: camera.id },
              data: {
                status: 'offline',
                metadata: {
                  ...((await prisma.camera.findUnique({ where: { id: camera.id }, select: { metadata: true } }))?.metadata as any || {}),
                  hlsConversionError: 'Failed to start FFmpeg process',
                  hlsConversionErrorTime: new Date().toISOString(),
                }
              }
            });
          }
        } catch (conversionError: any) {
          console.error(`[API /cameras] ❌ HLS conversion error for camera ${camera.id}:`, conversionError);
          
          // Update camera with error status
          try {
            await prisma.camera.update({
              where: { id: camera.id },
              data: {
                status: 'offline',
                metadata: {
                  ...((await prisma.camera.findUnique({ where: { id: camera.id }, select: { metadata: true } }))?.metadata as any || {}),
                  hlsConversionError: conversionError.message || 'Unknown error',
                  hlsConversionErrorTime: new Date().toISOString(),
                }
              }
            });
          } catch (updateError) {
            console.error(`[API /cameras] Failed to update camera error status:`, updateError);
          }
        }
      })().catch(err => {
        // Catch any unhandled errors in async conversion
        console.error(`[API /cameras] Unhandled error in HLS conversion for camera ${camera.id}:`, err);
      });
    } else {
      // Non-RTSP camera (Cloud Stream) - set HLS URL directly if provided
      if (streamUrl.trim().includes('.m3u8')) {
        await prisma.camera.update({
          where: { id: camera.id },
          data: {
            hlsUrl: streamUrl.trim(),
            status: 'active',
          }
        });
      }
    }

    // Create audit log
    if (currentUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'CAMERA_CREATED',
          entityType: 'Camera',
          entityId: camera.id,
          metadata: {
            cameraName: camera.name,
            cameraType: camera.type,
            worksiteId,
            worksiteName: worksite.name
          }
        }
      }).catch(err => {
        console.error('[API /cameras] Failed to create audit log:', err);
      });
    }

    // Return response immediately (HLS conversion happens in background)
    return NextResponse.json({
      success: true,
      data: {
        id: camera.id,
        name: camera.name,
        type: camera.type,
        status: camera.status, // Will be 'pending' for RTSP, updated to 'active' when HLS is ready
        streamUrl: camera.streamUrl,
        worksiteId: camera.worksiteId,
        createdAt: camera.createdAt.toISOString(),
        updatedAt: camera.updatedAt.toISOString(),
        // Note: hlsUrl will be set asynchronously for RTSP cameras
        hlsUrl: cameraType === 'CLOUD' && streamUrl.trim().includes('.m3u8') ? streamUrl.trim() : null,
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[API /cameras] ❌ POST Error:', error);
    console.error('[API /cameras] Error stack:', error.stack);
    console.error('[API /cameras] Error name:', error.name);
    
    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Camera with this name already exists for this worksite' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create camera',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

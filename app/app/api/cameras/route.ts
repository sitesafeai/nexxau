import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { createCameraSchema } from '@/app/lib/validation/cameras';
import { validateBody } from '@/app/lib/validation/common';
import { getSession } from '@/app/lib/auth';

// GET /api/cameras - Get cameras (optionally filtered by worksite)
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawWorksiteId = searchParams.get('worksiteId');
    
    // Normalize worksiteId: trim whitespace, handle null/undefined, ensure string type
    const normalizedWorksiteId = rawWorksiteId?.trim() || null;
    
    // Normalize role for comparison
    const userRole = user.role?.toUpperCase?.() || '';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
    const isCompanyAdmin = userRole === 'COMPANY_ADMIN' || userRole === 'COMPANYADMIN';
    
    // Log user and worksiteId details for debugging
    console.log('[cameras API GET] User:', user.email, 'Role:', userRole, 'CompanyId:', user.companyId);
    if (normalizedWorksiteId) {
      console.log('[cameras API GET] Raw worksiteId:', rawWorksiteId);
      console.log('[cameras API GET] Normalized worksiteId:', normalizedWorksiteId);
      console.log('[cameras API GET] WorksiteId type:', typeof normalizedWorksiteId);
      console.log('[cameras API GET] WorksiteId length:', normalizedWorksiteId.length);
    }

    // Build where clause based on user role and worksiteId
    const where: any = {};
    
    if (normalizedWorksiteId) {
      // User requested specific worksite - verify they have access
      if (isSuperAdmin) {
        // Super admin can access any worksite - no additional permission check needed
        where.worksiteId = normalizedWorksiteId;
        console.log('[cameras API GET] SUPER_ADMIN - filtering by worksiteId:', normalizedWorksiteId);
      } else if (isCompanyAdmin && user.companyId) {
        // Company admin can only see cameras from their company's worksites
        // Filter by worksiteId and verify the worksite belongs to their company
        where.worksiteId = normalizedWorksiteId;
        where.worksite = {
          companyId: user.companyId
        };
        console.log('[cameras API GET] COMPANY_ADMIN - filtering by worksiteId:', normalizedWorksiteId, 'and companyId:', user.companyId);
      } else {
        // Regular users can only see cameras from worksites they have access to
        // Filter by worksiteId and verify the user has access to the worksite
        where.worksiteId = normalizedWorksiteId;
        where.worksite = {
          worksiteUsers: {
            some: {
              userId: user.id
            }
          }
        };
        console.log('[cameras API GET] Regular user - filtering by worksiteId:', normalizedWorksiteId, 'for user:', user.id);
      }
    } else {
      // No worksiteId specified - filter by user access
      if (isSuperAdmin) {
        // Super admin sees all cameras
        console.log('[cameras API GET] SUPER_ADMIN - fetching all cameras');
      } else if (isCompanyAdmin && user.companyId) {
        // Company admin sees cameras from their company's worksites
        where.worksite = {
          companyId: user.companyId
        };
        console.log('[cameras API GET] COMPANY_ADMIN - filtering by companyId:', user.companyId);
      } else {
        // Regular users see cameras from worksites they have access to
        where.worksite = {
          worksiteUsers: {
            some: {
              userId: user.id
            }
          }
        };
        console.log('[cameras API GET] Regular user - filtering by accessible worksites for user:', user.id);
      }
    }

    let cameras;
    try {
      console.log('[cameras API GET] Query where clause:', JSON.stringify(where, null, 2));
      
      // First, let's check what cameras exist for debugging (only in development)
      if (normalizedWorksiteId && process.env.NODE_ENV === 'development') {
        // Check if the worksite exists and what company it belongs to
        const worksite = await prisma.worksite.findUnique({
          where: { id: normalizedWorksiteId },
          select: { id: true, name: true, companyId: true }
        });
        if (worksite) {
          console.log('[cameras API GET] Worksite found:', worksite);
          console.log('[cameras API GET] Worksite companyId:', worksite.companyId, 'User companyId:', user.companyId);
          if (worksite.companyId !== user.companyId && !isSuperAdmin) {
            console.log('[cameras API GET] ⚠️ Worksite belongs to different company! User cannot access cameras from this worksite.');
            console.log('[cameras API GET] ⚠️ This is why the query returns 0 cameras - the permission filter is blocking them.');
          } else {
            console.log('[cameras API GET] ✅ Worksite belongs to user\'s company - permission check should pass');
          }
        } else {
          console.log('[cameras API GET] ⚠️ Worksite not found:', normalizedWorksiteId);
        }
        
        // Check cameras directly without permission filter
        const camerasWithoutFilter = await prisma.camera.findMany({
          where: { worksiteId: normalizedWorksiteId },
          select: { id: true, name: true, worksiteId: true, createdAt: true }
        });
        console.log('[cameras API GET] Cameras for worksiteId (no permission filter):', camerasWithoutFilter.length, 'found');
        if (camerasWithoutFilter.length > 0) {
          console.log('[cameras API GET] ✅ Cameras exist:', camerasWithoutFilter.map(c => ({ id: c.id, name: c.name })));
        } else {
          console.log('[cameras API GET] ❌ No cameras exist for worksiteId', normalizedWorksiteId);
        }
        
        const allCameras = await prisma.camera.findMany({
          select: { id: true, name: true, worksiteId: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 20 // Limit to avoid too much logging
        });
        console.log('[cameras API GET] Recent cameras in DB (last 20):', allCameras.map(c => ({
          id: c.id,
          name: c.name,
          worksiteId: c.worksiteId,
          createdAt: c.createdAt
        })));
        const matching = allCameras.filter(c => c.worksiteId === normalizedWorksiteId);
        console.log('[cameras API GET] Cameras matching worksiteId', normalizedWorksiteId, ':', matching.length, 'found');
        if (matching.length > 0) {
          console.log('[cameras API GET] ✅ Matching cameras:', matching.map(c => ({ id: c.id, name: c.name, createdAt: c.createdAt })));
        } else {
          console.log('[cameras API GET] ❌ No cameras match worksiteId', normalizedWorksiteId);
          console.log('[cameras API GET] Available worksiteIds in recent cameras:', [...new Set(allCameras.map(c => c.worksiteId))]);
        }
      }
      
      // Log the exact query we're about to execute
      console.log('[cameras API GET] Executing Prisma query with where:', JSON.stringify(where, null, 2));
      
      // For debugging: if no filters, log a warning
      if (Object.keys(where).length === 0) {
        console.log('[cameras API GET] ⚠️ No where clause - will fetch ALL cameras (super admin)');
      }
      
      cameras = await prisma.camera.findMany({
        where,
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
          // lastHeartbeat: true, // NOT IN DATABASE YET
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
              lastCheck: true,
              createdAt: true
            },
            orderBy: {
              createdAt: 'desc'
            },
            take: 1
          },
          _count: {
            select: {
              detections: true,
              safetyViolations: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      console.log(`[cameras API] Found ${cameras.length} cameras for worksite: ${normalizedWorksiteId || 'all'}`);
    } catch (dbError) {
      console.error('[cameras API] Database error fetching cameras:', dbError);
      // Return empty array if database fails
      return NextResponse.json({
        success: true,
        data: [],
        count: 0,
        error: 'Database error'
      });
    }

    console.log('[cameras API GET] Found', cameras.length, 'cameras matching query');
    
    // Log sample worksiteIds from results for comparison
    if (cameras.length > 0 && normalizedWorksiteId) {
      const sampleWorksiteIds = cameras.slice(0, 3).map(c => ({
        id: c.id,
        name: c.name,
        worksiteId: c.worksiteId,
        worksiteIdType: typeof c.worksiteId,
        worksiteIdLength: c.worksiteId?.length
      }));
      console.log('[cameras API GET] Sample worksiteIds from results:', sampleWorksiteIds);
    }
    
    if (normalizedWorksiteId) {
      if (cameras.length > 0) {
        console.log('[cameras API GET] ✅ Cameras found for worksiteId', normalizedWorksiteId, ':', cameras.map(c => ({ id: c.id, name: c.name, worksiteId: c.worksiteId })));
      } else {
        console.log('[cameras API GET] ⚠️ No cameras found for worksiteId:', normalizedWorksiteId);
        // Try a direct query to see if the camera exists at all
        try {
          const directCheck = await prisma.camera.findFirst({
            where: { worksiteId: normalizedWorksiteId },
            select: { id: true, name: true, worksiteId: true }
          });
          if (directCheck) {
            console.log('[cameras API GET] ⚠️ Direct query found camera:', directCheck);
            console.log('[cameras API GET] ⚠️ But findMany returned 0. This suggests a query issue.');
            console.log('[cameras API GET] Direct check worksiteId:', {
              value: directCheck.worksiteId,
              type: typeof directCheck.worksiteId,
              length: directCheck.worksiteId?.length,
              matchesQuery: directCheck.worksiteId === normalizedWorksiteId
            });
          } else {
            console.log('[cameras API GET] ⚠️ Direct query also returned null - camera truly does not exist for this worksiteId');
          }
        } catch (checkError) {
          console.error('[cameras API GET] Error checking for camera:', checkError);
        }
      }
    }
    
    // Format cameras with computed fields
    const formattedCameras = cameras.map(camera => {
      try {
        const latestHealth = camera.health?.[0];
        const lastActivity = latestHealth?.lastCheck || camera.updatedAt;
        const minutesSinceActivity = lastActivity 
          ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000 / 60)
          : 0;
        
        // Determine status based on database status or health record
        let status: 'online' | 'offline' | 'error' = 'online'; // Default to online for new cameras
        
        if (latestHealth) {
          // Use health record status if available
          if (latestHealth.status === 'OFFLINE') {
            status = 'offline';
          } else if (latestHealth.status === 'ERROR') {
            status = 'error';
          } else {
            status = 'online';
          }
        } else if (camera.status === 'active') {
          // No health record but camera is active
          status = 'online';
        } else {
          status = 'offline';
        }

        return {
          id: camera.id,
          name: camera.name,
          streamUrl: camera.streamUrl || camera.hlsUrl,
          streamType: camera.hlsUrl ? 'hls' : camera.streamUrl?.startsWith('rtsp') ? 'rtsp' : 'http',
          location: camera.location || 'Unknown',
          status,
          resolution: latestHealth?.resolution || '1920x1080',
          fps: latestHealth?.frameRate || 30,
          lastActivity: lastActivity?.toISOString() || new Date().toISOString(),
          minutesSinceActivity,
          detectionCount: camera._count?.detections || 0,
          violationCount: camera._count?.safetyViolations || 0,
          features: {
            aiDetection: true,
            nightVision: false,
            ptz: false,
            audio: false
          },
          worksiteId: camera.worksiteId,
          worksite: camera.worksite,
          createdAt: camera.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: camera.updatedAt?.toISOString() || new Date().toISOString()
        };
      } catch (formatError: any) {
        console.error('[cameras API GET] Error formatting camera:', camera.id, formatError);
        // Return a basic formatted camera if formatting fails
        return {
          id: camera.id,
          name: camera.name || 'Unknown',
          streamUrl: camera.streamUrl || camera.hlsUrl || null,
          streamType: camera.hlsUrl ? 'hls' : 'rtsp',
          location: camera.location || 'Unknown',
          status: camera.status || 'offline',
          resolution: '1920x1080',
          fps: 30,
          lastActivity: camera.updatedAt?.toISOString() || new Date().toISOString(),
          minutesSinceActivity: 0,
          detectionCount: 0,
          violationCount: 0,
          features: { aiDetection: true, nightVision: false, ptz: false, audio: false },
          worksiteId: camera.worksiteId,
          worksite: camera.worksite,
          createdAt: camera.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: camera.updatedAt?.toISOString() || new Date().toISOString()
        };
      }
    });

    return NextResponse.json({
      success: true,
      data: formattedCameras,
      count: formattedCameras.length
    });

  } catch (error: any) {
    console.error('[cameras API GET] Failed to fetch cameras:', error);
    console.error('[cameras API GET] Error details:', {
      message: error?.message,
      code: error?.code,
      name: error?.name,
      meta: error?.meta,
      stack: error?.stack
    });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch cameras',
        details: error instanceof Error ? error.message : 'Unknown error',
        ...(process.env.NODE_ENV === 'development' && {
          debug: {
            name: error?.name,
            code: error?.code,
            meta: error?.meta
          }
        })
      },
      { status: 500 }
    );
  }
}

// POST /api/cameras - Create a new camera
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Support both legacy and new format
    const isNewFormat = body.connection !== undefined;
    
    if (isNewFormat) {
      // New format with connection/metadata objects
      return handleNewFormatCreate(body);
    }
    
    // Legacy format handling
    const validation = validateBody(createCameraSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const { 
      name, 
      streamUrl, 
      hlsUrl,
      location, 
      worksiteId,
      type = 'IP Camera',
      ipAddress,
      port,
      username,
      password,
      rtspPath,
      mediamtxPath,
      metadata
    } = data;

    // Ensure we have either streamUrl or hlsUrl
    if (!streamUrl && !hlsUrl) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Either streamUrl or hlsUrl is required' 
        }, 
        { status: 400 }
      );
    }

    // Get default worksite if not provided
    let targetWorksiteId = worksiteId;
    if (!targetWorksiteId) {
      const defaultWorksite = await prisma.worksite.findFirst({
        orderBy: { createdAt: 'asc' }
      });
      
      if (!defaultWorksite) {
        // Cannot create worksite without companyId - return error
        return NextResponse.json(
          { 
            success: false,
            error: 'worksiteId is required when no default worksite exists. Worksite must be created with a company first.' 
          }, 
          { status: 400 }
        );
      } else {
        targetWorksiteId = defaultWorksite.id;
      }
    }

    // Determine stream type and URLs
    const finalStreamUrl = streamUrl || hlsUrl;
    const isHLS = finalStreamUrl?.includes('.m3u8') || finalStreamUrl?.includes('hls') || !!hlsUrl;
    const isRTSP = finalStreamUrl?.startsWith('rtsp://');

    // Create camera with transaction
    const camera = await prisma.$transaction(async (tx) => {
      // Create camera
      const newCamera = await tx.camera.create({
        data: {
          name,
          type: type || 'IP Camera',
          status: 'active',
          streamUrl: isRTSP ? finalStreamUrl : undefined,
          hlsUrl: isHLS ? (hlsUrl || finalStreamUrl) : undefined,
          location: location || 'Unspecified',
          ipAddress,
          port,
          username,
          password,
          rtspPath,
          mediamtxPath,
          metadata: metadata || undefined,
          worksiteId: targetWorksiteId
        },
        include: {
          worksite: {
            select: {
              id: true,
              name: true,
              worksiteName: true
            }
          }
        }
      });

      // Create initial health record
      await tx.cameraHealth.create({
        data: {
          cameraId: newCamera.id,
          status: 'ONLINE',
          streamQuality: 100,
          frameRate: 30,
          resolution: '1920x1080',
          lastCheck: new Date()
        }
      });

      return newCamera;
    });

    // Format response
    const formattedCamera = {
      id: camera.id,
      name: camera.name,
      streamUrl: camera.streamUrl || camera.hlsUrl,
      streamType: isHLS ? 'hls' : isRTSP ? 'rtsp' : 'http',
      location: camera.location,
      status: 'online' as const,
      resolution: '1920x1080',
      fps: 30,
      lastActivity: camera.createdAt.toISOString(),
      minutesSinceActivity: 0,
      detectionCount: 0,
      violationCount: 0,
      features: {
        aiDetection: true,
        nightVision: false,
        ptz: false,
        audio: false
      },
      worksiteId: camera.worksiteId,
      worksite: camera.worksite,
      createdAt: camera.createdAt.toISOString(),
      updatedAt: camera.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: formattedCamera,
      message: 'Camera created successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('Failed to create camera:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create camera',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Handle new format camera creation with connection/metadata objects
async function handleNewFormatCreate(body: any) {
  try {
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

    // Check for stream URL in appropriate field based on connection type
    const hasStreamUrl = 
      connection?.rtspUrl || 
      connection?.hlsUrl || 
      connection?.webrtcUrl;
    
    if (!hasStreamUrl) {
      console.error('[cameras API] Missing stream URL:', { connection });
      return NextResponse.json({
        success: false,
        error: 'Stream URL is required (rtspUrl, hlsUrl, or webrtcUrl)'
      }, { status: 400 });
    }
    
    console.log('[cameras API] Creating camera with:', {
      name,
      worksiteId,
      connectionType: connection.type,
      hasStreamUrl: !!hasStreamUrl
    });

    // Verify worksite exists before creating camera
    try {
      const worksiteExists = await prisma.worksite.findUnique({
        where: { id: worksiteId },
        select: { id: true, name: true }
      });
      
      if (!worksiteExists) {
        console.error('[cameras API] Worksite not found:', worksiteId);
        return NextResponse.json({
          success: false,
          error: `Worksite with ID ${worksiteId} not found`
        }, { status: 404 });
      }
      
      console.log('[cameras API] Worksite verified:', worksiteExists.name);
    } catch (worksiteError: any) {
      console.error('[cameras API] Error checking worksite:', worksiteError);
      return NextResponse.json({
        success: false,
        error: 'Failed to verify worksite',
        details: worksiteError?.message
      }, { status: 500 });
    }

    // Create camera with transaction
    let camera;
    try {
      camera = await prisma.$transaction(async (tx) => {
        console.log('[cameras API] Starting camera creation transaction');
      
      // Determine which URL field to use based on connection type
      const streamUrl = connection.type === 'RTSP' || connection.type === 'RTMP' || connection.type === 'MJPEG'
        ? (connection.rtspUrl || null)
        : null;
      const hlsUrl = connection.type === 'HLS' || connection.type === 'PreSignedURL'
        ? (connection.hlsUrl || null)
        : null;
      
      console.log('[cameras API] Camera data:', {
        name,
        type: connection.type || 'RTSP',
        worksiteId,
        hasStreamUrl: !!streamUrl,
        hasHlsUrl: !!hlsUrl
      });
      
      // Build metadata object
      const cameraMetadata: any = {};
      if (metadata) {
        if (metadata.lat !== undefined && metadata.lat !== null) cameraMetadata.lat = metadata.lat;
        if (metadata.lon !== undefined && metadata.lon !== null) cameraMetadata.lon = metadata.lon;
        if (metadata.mountHeight !== undefined && metadata.mountHeight !== null) cameraMetadata.mountHeight = metadata.mountHeight;
        if (metadata.orientation !== undefined && metadata.orientation !== null) cameraMetadata.orientation = metadata.orientation;
        if (metadata.fov !== undefined && metadata.fov !== null) cameraMetadata.fov = metadata.fov;
        if (metadata.tags && Array.isArray(metadata.tags)) cameraMetadata.tags = metadata.tags;
        if (metadata.model) cameraMetadata.model = metadata.model;
        if (metadata.notes) cameraMetadata.notes = metadata.notes;
        if (metadata.resolution) cameraMetadata.resolution = metadata.resolution;
        if (metadata.fps !== undefined && metadata.fps !== null) cameraMetadata.fps = metadata.fps;
        if (metadata.codec) cameraMetadata.codec = metadata.codec;
      }
      
      // Determine location - prefer metadata.notes, fallback to 'Unspecified'
      const cameraLocation = metadata?.notes || 'Unspecified';
      
      // Determine stream URL - ensure we have at least one
      const finalStreamUrl = streamUrl || hlsUrl;
      if (!finalStreamUrl) {
        throw new Error('Stream URL is required (rtspUrl, hlsUrl, or webrtcUrl)');
      }
      
      console.log('[cameras API] Creating camera with data:', {
        name: name.trim(),
        type: connection.type || 'RTSP',
        status: 'pending',
        streamUrl: streamUrl || undefined,
        hlsUrl: hlsUrl || undefined,
        location: cameraLocation,
        worksiteId: worksiteId,
        worksiteIdType: typeof worksiteId,
        hasMetadata: Object.keys(cameraMetadata).length > 0
      });
      
      if (!worksiteId) {
        console.error('[cameras API] ❌ ERROR: worksiteId is missing or null!');
        throw new Error('worksiteId is required');
      }
      
      // Verify worksite exists before creating camera
      const worksiteExists = await tx.worksite.findUnique({
        where: { id: worksiteId },
        select: { id: true, name: true, companyId: true }
      });
      
      if (!worksiteExists) {
        console.error('[cameras API] ❌ ERROR: Worksite does not exist:', worksiteId);
        throw new Error(`Worksite ${worksiteId} does not exist`);
      }
      
      console.log('[cameras API] ✅ Worksite verified:', {
        id: worksiteExists.id,
        name: worksiteExists.name,
        companyId: worksiteExists.companyId
      });
      
      const newCamera = await tx.camera.create({
        data: {
          name: name.trim(),
          type: connection.type || 'RTSP',
          status: 'pending', // Set to pending until first successful test
          
          // Legacy fields for backward compatibility
          streamUrl: streamUrl || undefined,
          hlsUrl: hlsUrl || undefined,
          username: connection.username || undefined,
          password: connection.password || undefined, // TODO: Encrypt in production
          
          rtspPath: connection.type === 'RTSP' ? (connection.rtspUrl || undefined) : undefined,
          location: cameraLocation,
          metadata: Object.keys(cameraMetadata).length > 0 ? cameraMetadata : undefined,
          
          worksiteId: worksiteId, // Explicitly set worksiteId
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

      // Create initial health record
      try {
        await tx.cameraHealth.create({
          data: {
            cameraId: newCamera.id,
            status: 'ONLINE',
            streamQuality: 100,
            frameRate: metadata?.fps || 30,
            resolution: metadata?.resolution || '1920x1080',
            lastCheck: new Date(),
          }
        });
        console.log('[cameras API] Health record created successfully');
      } catch (healthError: any) {
        // Log but don't fail camera creation if health record fails
        console.warn('[cameras API] Failed to create health record:', healthError?.message || healthError);
        console.warn('[cameras API] Health error code:', healthError?.code);
        console.warn('[cameras API] Health error meta:', healthError?.meta);
      }

      // Create audit log (optional - don't fail if it errors)
      // Note: entityName column may not exist in database, so we skip it
      try {
        await tx.auditLog.create({
          data: {
            action: 'CAMERA_CREATED',
            entity: 'CAMERA',
            entityId: newCamera.id,
            // entityName: newCamera.name, // Column doesn't exist in database yet
            worksiteId: newCamera.worksiteId,
            details: {
              name: newCamera.name,
              type: connection.type,
              worksiteName: newCamera.worksite?.name,
            },
            result: 'SUCCESS',
            severity: 'INFO',
          }
        });
        console.log('[cameras API] Audit log created successfully');
      } catch (auditError: any) {
        // Log but don't fail camera creation if audit log fails
        console.warn('[cameras API] Failed to create audit log:', auditError?.message || auditError);
        console.warn('[cameras API] Audit error code:', auditError?.code);
      }

        console.log('[cameras API] Camera created successfully in transaction:', {
          id: newCamera.id,
          name: newCamera.name,
          worksiteId: newCamera.worksiteId,
          worksiteName: newCamera.worksite?.name
        });
        return newCamera;
      }, {
        timeout: 10000, // 10 second timeout
        isolationLevel: 'ReadCommitted' // Explicit isolation level
      });
      
      console.log('[cameras API] ✅ Transaction completed successfully, camera object:', {
        id: camera.id,
        name: camera.name,
        worksiteId: camera.worksiteId
      });
    } catch (transactionError: any) {
      console.error('[cameras API] ❌ Transaction failed:', transactionError?.message);
      console.error('[cameras API] Transaction error stack:', transactionError?.stack);
      console.error('[cameras API] Transaction error code:', transactionError?.code);
      throw transactionError;
    }

    console.log('[cameras API] Camera transaction completed, verifying camera exists:', {
      id: camera.id,
      name: camera.name,
      worksiteId: camera.worksiteId,
      worksiteIdType: typeof camera.worksiteId,
      worksiteIdLength: camera.worksiteId?.length,
      worksiteName: camera.worksite?.name
    });
    
    // Immediately check if camera exists using raw SQL to bypass any Prisma caching
    try {
      const rawCheck = await prisma.$queryRaw<Array<{ id: string; name: string; worksiteId: string }>>`
        SELECT id, name, "worksiteId" FROM "Camera" WHERE id = ${camera.id}
      `;
      console.log('[cameras API] Raw SQL check result:', rawCheck.length > 0 ? 'Camera found' : 'Camera NOT found', rawCheck);
    } catch (rawError: any) {
      console.error('[cameras API] Raw SQL check failed:', rawError?.message);
    }
    
    // Verify the camera was actually saved by querying it back
    // Use retry logic to handle potential transaction isolation delays
    const maxRetries = 3;
    const retryDelay = 100; // ms
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`[cameras API] Verification attempt ${attempt}/${maxRetries}, waiting ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
        
        const verifyCamera = await prisma.camera.findUnique({
          where: { id: camera.id },
          select: {
            id: true,
            name: true,
            worksiteId: true,
            worksite: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });
        
        if (verifyCamera) {
          console.log(`[cameras API] ✅ Camera verified in database (attempt ${attempt}):`, {
            id: verifyCamera.id,
            name: verifyCamera.name,
            worksiteId: verifyCamera.worksiteId,
            worksiteIdType: typeof verifyCamera.worksiteId,
            worksiteIdLength: verifyCamera.worksiteId?.length,
            worksiteName: verifyCamera.worksite?.name
          });
          
          // Also verify we can find it by worksiteId
          if (verifyCamera.worksiteId) {
            const normalizedWorksiteId = String(verifyCamera.worksiteId).trim();
            console.log('[cameras API] Verifying camera can be found by worksiteId:', normalizedWorksiteId);
            
            const camerasByWorksite = await prisma.camera.findMany({
              where: { worksiteId: normalizedWorksiteId },
              select: { id: true, name: true, worksiteId: true }
            });
            
            console.log('[cameras API] ✅ Found', camerasByWorksite.length, 'cameras for worksiteId', normalizedWorksiteId);
            console.log('[cameras API] Camera IDs in result:', camerasByWorksite.map(c => c.id));
            
            const foundCamera = camerasByWorksite.find(c => c.id === verifyCamera.id);
            if (foundCamera) {
              console.log('[cameras API] ✅ New camera IS included in worksite query - it should appear in GET requests');
              break; // Success, exit retry loop
            } else {
              console.error('[cameras API] ❌ New camera NOT found in worksite query!');
              console.error('[cameras API] This means the camera exists but the query filter is not working');
              console.error('[cameras API] Detailed comparison:');
              console.error('[cameras API]   Camera worksiteId:', {
                value: verifyCamera.worksiteId,
                type: typeof verifyCamera.worksiteId,
                length: verifyCamera.worksiteId?.length,
                stringified: String(verifyCamera.worksiteId)
              });
              console.error('[cameras API]   Query worksiteId:', {
                value: normalizedWorksiteId,
                type: typeof normalizedWorksiteId,
                length: normalizedWorksiteId.length
              });
              console.error('[cameras API]   Strict equal:', verifyCamera.worksiteId === normalizedWorksiteId);
              console.error('[cameras API]   String equal:', String(verifyCamera.worksiteId) === String(normalizedWorksiteId));
              
              // Log sample worksiteIds from the query result for comparison
              if (camerasByWorksite.length > 0) {
                console.error('[cameras API]   Sample worksiteIds from query result:', camerasByWorksite.slice(0, 3).map(c => ({
                  id: c.id,
                  name: c.name,
                  worksiteId: c.worksiteId,
                  worksiteIdType: typeof c.worksiteId,
                  worksiteIdLength: c.worksiteId?.length
                })));
              }
              
              // If this is the last attempt, log error but don't fail
              if (attempt === maxRetries) {
                console.error('[cameras API] ⚠️ Camera created but may not be immediately queryable by worksiteId');
              }
            }
          }
          break; // Exit retry loop if camera found
        } else {
          if (attempt === maxRetries) {
            console.error('[cameras API] ❌ Camera NOT found in database after creation (all retries exhausted)!', camera.id);
          } else {
            console.warn(`[cameras API] ⚠️ Camera not found on attempt ${attempt}, will retry...`);
          }
        }
      } catch (verifyError: any) {
        console.error(`[cameras API] Error verifying camera (attempt ${attempt}):`, verifyError?.message);
        if (attempt === maxRetries) {
          console.error('[cameras API] Verification failed after all retries');
        }
      }
    }

    // Format response
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
      message: 'Camera created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('[cameras API] Failed to create camera (new format):', error);
    console.error('[cameras API] Error details:', {
      message: error.message,
      code: error.code,
      name: error.name,
      meta: error.meta,
      stack: error.stack
    });
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create camera';
    if (error.code === 'P2002') {
      errorMessage = 'Camera with this name already exists';
    } else if (error.code === 'P2003') {
      errorMessage = 'Invalid worksite ID';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: error.message,
      code: error.code
    }, { status: 500 });
  }
}

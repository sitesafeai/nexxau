import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { createCameraSchema, validateBody } from '@/app/lib/validation/cameras';

// GET /api/cameras - Get cameras (optionally filtered by worksite)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');

    const where: any = {};
    if (worksiteId) {
      where.worksiteId = worksiteId;
    }

    let cameras;
    try {
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
      
      console.log(`[cameras API] Found ${cameras.length} cameras for worksite: ${worksiteId || 'all'}`);
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

    // Format cameras with computed fields
    const formattedCameras = cameras.map(camera => {
      const latestHealth = camera.health[0];
      const lastActivity = latestHealth?.lastCheck || camera.updatedAt;
      const minutesSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000 / 60);
      
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
        lastActivity: lastActivity.toISOString(),
        minutesSinceActivity,
        detectionCount: camera._count.detections,
        violationCount: camera._count.safetyViolations,
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
    });

    return NextResponse.json({
      success: true,
      data: formattedCameras,
      count: formattedCameras.length
    });

  } catch (error) {
    console.error('Failed to fetch cameras:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch cameras',
        details: error instanceof Error ? error.message : 'Unknown error'
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
        // Create a default worksite if none exists
        const newWorksite = await prisma.worksite.create({
          data: {
            name: 'Default Site',
            worksiteName: 'Main Construction Site',
            location: 'Primary Location',
            address: 'To be configured',
            status: 'active',
            startDate: new Date(),
            isActive: true
          }
        });
        targetWorksiteId = newWorksite.id;
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

    if (!connection?.rtspUrl && !connection?.hlsUrl) {
      return NextResponse.json({
        success: false,
        error: 'Stream URL is required'
      }, { status: 400 });
    }

    // Create camera with transaction
    const camera = await prisma.$transaction(async (tx) => {
      const newCamera = await tx.camera.create({
        data: {
          name,
          externalId: externalId || null,
          type: connection.type || 'RTSP',
          status: 'pending', // Set to pending until first successful test
          enabled,
          
          // Legacy fields for backward compatibility
          streamUrl: connection.rtspUrl || null,
          hlsUrl: connection.hlsUrl || null,
          username: connection.username || null,
          password: connection.password || null, // TODO: Encrypt in production
          
          // New structured fields
          connection: {
            type: connection.type || 'RTSP',
            rtspUrl: connection.rtspUrl || '',
            webrtcUrl: connection.webrtcUrl || '',
            hlsUrl: connection.hlsUrl || '',
            snapshotUrl: connection.snapshotUrl || '',
            profile: connection.profile || 'medium',
          },
          metadata: {
            lat: metadata?.lat || null,
            lon: metadata?.lon || null,
            mountHeight: metadata?.mountHeight || null,
            orientation: metadata?.orientation || null,
            fov: metadata?.fov || null,
            tags: metadata?.tags || [],
            model: metadata?.model || '',
            notes: metadata?.notes || '',
            resolution: metadata?.resolution || '',
            fps: metadata?.fps || null,
            codec: metadata?.codec || '',
          },
          
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

      // Create initial health record
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

      // Create audit log
      await tx.auditLog.create({
        data: {
          action: 'CAMERA_CREATED',
          entity: 'CAMERA',
          entityId: newCamera.id,
          entityName: newCamera.name,
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

      return newCamera;
    });

    // Format response
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
      message: 'Camera created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Failed to create camera (new format):', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create camera',
      details: error.message
    }, { status: 500 });
  }
}

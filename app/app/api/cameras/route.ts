import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/cameras - Get all cameras
export async function GET(request: NextRequest) {
  try {
    const cameras = await prisma.camera.findMany({
      include: {
        worksite: {
          select: {
            id: true,
            name: true,
            worksiteName: true
          }
        },
        health: {
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

    // Format cameras with computed fields
    const formattedCameras = cameras.map(camera => {
      const latestHealth = camera.health[0];
      const lastActivity = latestHealth?.lastCheck || camera.updatedAt;
      const minutesSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000 / 60);
      
      // Determine status based on last activity
      let status: 'online' | 'offline' | 'error' = 'offline';
      if (minutesSinceActivity < 5) {
        status = latestHealth?.status === 'ERROR' ? 'error' : 'online';
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
    const { 
      name, 
      streamUrl, 
      location, 
      worksiteId,
      type = 'IP Camera',
      ipAddress,
      port,
      username,
      password,
      rtspPath
    } = body;

    // Validate required fields
    if (!name || !streamUrl) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, streamUrl' 
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
    const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('hls');
    const isRTSP = streamUrl.startsWith('rtsp://');

    // Create camera with transaction
    const camera = await prisma.$transaction(async (tx) => {
      // Create camera
      const newCamera = await tx.camera.create({
        data: {
          name,
          type,
          status: 'active',
          streamUrl: isRTSP ? streamUrl : undefined,
          hlsUrl: isHLS ? streamUrl : undefined,
          location: location || 'Unspecified',
          ipAddress,
          port,
          username,
          password,
          rtspPath,
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

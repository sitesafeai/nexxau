import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// GET /api/cameras/[id] - Get a specific camera
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const camera = await prisma.camera.findUnique({
      where: { id },
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
      }
    });

    if (!camera) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Camera not found' 
        }, 
        { status: 404 }
      );
    }

    const latestHealth = camera.health[0];
    const lastActivity = latestHealth?.lastCheck || camera.updatedAt;
    const minutesSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000 / 60);
    
    let status: 'online' | 'offline' | 'error' = 'offline';
    if (minutesSinceActivity < 5) {
      status = latestHealth?.status === 'ERROR' ? 'error' : 'online';
    }

    const formattedCamera = {
      id: camera.id,
      name: camera.name,
      streamUrl: camera.streamUrl || camera.hlsUrl,
      streamType: camera.hlsUrl ? 'hls' : camera.streamUrl?.startsWith('rtsp') ? 'rtsp' : 'http',
      location: camera.location,
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

    return NextResponse.json({
      success: true,
      data: formattedCamera
    });

  } catch (error) {
    console.error('Failed to fetch camera:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch camera',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// PATCH /api/cameras/[id] - Update a camera
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const { 
      name, 
      streamUrl, 
      location,
      type,
      ipAddress,
      port,
      username,
      password,
      rtspPath,
      status
    } = body;

    // Check if camera exists
    const existingCamera = await prisma.camera.findUnique({
      where: { id }
    });

    if (!existingCamera) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Camera not found' 
        }, 
        { status: 404 }
      );
    }

    // Determine stream type if streamUrl is being updated
    let updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (location !== undefined) updateData.location = location;
    if (type !== undefined) updateData.type = type;
    if (ipAddress !== undefined) updateData.ipAddress = ipAddress;
    if (port !== undefined) updateData.port = port;
    if (username !== undefined) updateData.username = username;
    if (password !== undefined) updateData.password = password;
    if (rtspPath !== undefined) updateData.rtspPath = rtspPath;
    if (status !== undefined) updateData.status = status;

    if (streamUrl !== undefined) {
      const isHLS = streamUrl.includes('.m3u8') || streamUrl.includes('hls');
      const isRTSP = streamUrl.startsWith('rtsp://');
      
      if (isHLS) {
        updateData.hlsUrl = streamUrl;
        updateData.streamUrl = null;
      } else if (isRTSP) {
        updateData.streamUrl = streamUrl;
        updateData.hlsUrl = null;
      } else {
        updateData.streamUrl = streamUrl;
      }
    }

    // Update camera
    const camera = await prisma.camera.update({
      where: { id },
      data: updateData,
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
        }
      }
    });

    const latestHealth = camera.health[0];
    const lastActivity = latestHealth?.lastCheck || camera.updatedAt;
    const minutesSinceActivity = Math.floor((Date.now() - new Date(lastActivity).getTime()) / 1000 / 60);
    
    let cameraStatus: 'online' | 'offline' | 'error' = 'offline';
    if (minutesSinceActivity < 5) {
      cameraStatus = latestHealth?.status === 'ERROR' ? 'error' : 'online';
    }

    const formattedCamera = {
      id: camera.id,
      name: camera.name,
      streamUrl: camera.streamUrl || camera.hlsUrl,
      streamType: camera.hlsUrl ? 'hls' : camera.streamUrl?.startsWith('rtsp') ? 'rtsp' : 'http',
      location: camera.location,
      status: cameraStatus,
      resolution: latestHealth?.resolution || '1920x1080',
      fps: latestHealth?.frameRate || 30,
      lastActivity: lastActivity.toISOString(),
      minutesSinceActivity,
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
      message: 'Camera updated successfully'
    });

  } catch (error) {
    console.error('Failed to update camera:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update camera',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// DELETE /api/cameras/[id] - Delete a camera
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Check if camera exists
    const existingCamera = await prisma.camera.findUnique({
      where: { id }
    });

    if (!existingCamera) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Camera not found' 
        }, 
        { status: 404 }
      );
    }

    // Delete camera (cascade will delete related records)
    await prisma.camera.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: 'Camera deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete camera:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete camera',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

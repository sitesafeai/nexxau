import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

// POST /api/cameras/[id]/health - Update camera health status
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const {
      status = 'ONLINE',
      streamQuality,
      frameRate,
      resolution,
      bitrate,
      latency,
      errors
    } = body;

    // Check if camera exists
    const camera = await prisma.camera.findUnique({
      where: { id }
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

    // Create health record with transaction
    const health = await prisma.$transaction(async (tx) => {
      // Create new health record
      const newHealth = await tx.cameraHealth.create({
        data: {
          cameraId: id,
          status: status as any,
          streamQuality: streamQuality || 100,
          frameRate: frameRate || 30,
          resolution: resolution || '1920x1080',
          bitrate,
          latency,
          errors: errors || null,
          lastCheck: new Date()
        }
      });

      // Update camera's updatedAt timestamp to reflect activity
      await tx.camera.update({
        where: { id },
        data: { updatedAt: new Date() }
      });

      return newHealth;
    });

    return NextResponse.json({
      success: true,
      data: {
        id: health.id,
        cameraId: health.cameraId,
        status: health.status,
        streamQuality: health.streamQuality,
        frameRate: health.frameRate,
        resolution: health.resolution,
        bitrate: health.bitrate,
        latency: health.latency,
        errors: health.errors,
        lastCheck: health.lastCheck.toISOString(),
        createdAt: health.createdAt.toISOString()
      },
      message: 'Camera health updated successfully'
    });

  } catch (error) {
    console.error('Failed to update camera health:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update camera health',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// GET /api/cameras/[id]/health - Get camera health history
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');

    // Check if camera exists
    const camera = await prisma.camera.findUnique({
      where: { id }
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

    // Get health history
    const healthRecords = await prisma.cameraHealth.findMany({
      where: { cameraId: id },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const formattedRecords = healthRecords.map(record => ({
      id: record.id,
      cameraId: record.cameraId,
      status: record.status,
      streamQuality: record.streamQuality,
      frameRate: record.frameRate,
      resolution: record.resolution,
      bitrate: record.bitrate,
      latency: record.latency,
      errors: record.errors,
      lastCheck: record.lastCheck.toISOString(),
      createdAt: record.createdAt.toISOString()
    }));

    return NextResponse.json({
      success: true,
      data: formattedRecords,
      count: formattedRecords.length
    });

  } catch (error) {
    console.error('Failed to fetch camera health:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch camera health',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}


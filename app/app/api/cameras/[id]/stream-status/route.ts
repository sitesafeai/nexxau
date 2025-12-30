import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * GET /api/cameras/[id]/stream-status
 * 
 * Returns the stream status for a camera.
 * 
 * Response: {
 *   status: 'ready' | 'initializing' | 'offline',
 *   hlsUrl: string | null,
 *   streamBaseUrl: string
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;

    // Validate authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate cameraId
    if (!cameraId || typeof cameraId !== 'string' || cameraId.trim().length === 0) {
      return NextResponse.json(
        { error: 'Invalid camera ID' },
        { status: 400 }
      );
    }

    // Get camera from database
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId.trim() },
      select: {
        id: true,
        status: true,
        hlsUrl: true,
        mediamtxPath: true,
        streamUrl: true
      }
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Get stream base URL from environment
    const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL || 'http://localhost:8888';

    // Determine HLS URL
    let hlsUrl: string | null = null;
    if (camera.hlsUrl) {
      hlsUrl = camera.hlsUrl;
    } else if (camera.mediamtxPath) {
      hlsUrl = `${streamBaseUrl}/live/${camera.mediamtxPath}/index.m3u8`;
    }

    // Determine status based on camera status and HLS URL availability
    let streamStatus: 'ready' | 'initializing' | 'offline' = 'offline';

    if (camera.status === 'active' && hlsUrl) {
      // Check if stream is actually available by performing HEAD request
      try {
        const response = await fetch(hlsUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });

        if (response.ok) {
          streamStatus = 'ready';
        } else {
          streamStatus = 'offline';
        }
      } catch (fetchError: any) {
        // Connection refused, timeout, or other network error
        console.log(`[Stream Status] Stream check failed for ${cameraId}:`, fetchError.message);
        streamStatus = 'offline';
      }
    } else if (camera.status === 'pending') {
      streamStatus = 'initializing';
    } else {
      streamStatus = 'offline';
    }

    // Get camera metadata for error information
    const cameraFull = await prisma.camera.findUnique({
      where: { id: cameraId.trim() },
      select: {
        status: true,
        metadata: true,
      }
    });

    const errorLog = (cameraFull?.metadata as any)?.hlsConversionError || null;
    const errorTime = (cameraFull?.metadata as any)?.hlsConversionErrorTime || null;

    return NextResponse.json({
      camera_id: cameraId.trim(),
      status: streamStatus,
      hls_url: hlsUrl,
      last_error: errorLog,
      error_time: errorTime,
      streamBaseUrl
    }, { status: 200 });

  } catch (error: any) {
    console.error('[Stream Status] Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check stream status',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}


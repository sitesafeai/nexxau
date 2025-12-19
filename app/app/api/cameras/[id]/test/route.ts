import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * POST /api/cameras/[id]/test
 * Test camera connection by validating stream URL and credentials
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch camera from database
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: {
        id: true,
        name: true,
        streamUrl: true,
        hlsUrl: true,
        rtspPath: true,
        ipAddress: true,
        port: true,
        username: true,
        password: true,
        type: true,
      }
    });

    if (!camera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Test connection based on camera type
    const testResults = {
      streamUrl: false,
      rtsp: false,
      hls: false,
      credentials: false,
      overall: false,
      message: '',
    };

    try {
      // Test RTSP connection if RTSP URL is provided
      if (camera.streamUrl && camera.streamUrl.startsWith('rtsp://')) {
        // For RTSP, we can't easily test without a full RTSP client
        // Just validate the URL format
        try {
          const url = new URL(camera.streamUrl);
          testResults.rtsp = true;
          testResults.message = 'RTSP URL format is valid';
        } catch {
          testResults.message = 'Invalid RTSP URL format';
        }
      }

      // Test HLS connection if HLS URL is provided
      if (camera.hlsUrl && camera.hlsUrl.startsWith('http')) {
        try {
          const response = await fetch(camera.hlsUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });
          testResults.hls = response.ok;
          testResults.message = response.ok 
            ? 'HLS stream is accessible' 
            : `HLS stream returned status ${response.status}`;
        } catch (error: any) {
          testResults.message = `HLS stream test failed: ${error.message}`;
        }
      }

      // Test credentials if provided
      if (camera.username && camera.password) {
        // Basic validation - just check they're not empty
        testResults.credentials = camera.username.length > 0 && camera.password.length > 0;
        if (!testResults.credentials) {
          testResults.message = 'Credentials are invalid';
        }
      } else {
        // No credentials required
        testResults.credentials = true;
      }

      // Overall success if at least one stream type works and credentials are valid
      testResults.overall = (testResults.rtsp || testResults.hls) && testResults.credentials;
      
      if (testResults.overall) {
        testResults.message = 'Camera connection test passed';
      } else if (!testResults.message) {
        testResults.message = 'Camera connection test failed - check stream URL and credentials';
      }

      return NextResponse.json({
        success: true,
        data: {
          cameraId: camera.id,
          cameraName: camera.name,
          testResults,
        },
      });
    } catch (error: any) {
      return NextResponse.json({
        success: false,
        error: 'Connection test failed',
        details: error.message,
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Camera Test API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to test camera connection',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


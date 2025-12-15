import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * GET /api/cameras/test
 * Test camera connection with provided configuration before adding
 * Query params: streamUrl, hlsUrl, or rtspUrl
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const streamUrl = searchParams.get('streamUrl');
    const hlsUrl = searchParams.get('hlsUrl');
    const rtspUrl = searchParams.get('rtspUrl');

    const testUrl = hlsUrl || streamUrl || rtspUrl;

    if (!testUrl) {
      return NextResponse.json(
        { success: false, error: 'No stream URL provided' },
        { status: 400 }
      );
    }

    const testResults = {
      url: testUrl,
      accessible: false,
      message: '',
    };

    try {
      if (testUrl.startsWith('http')) {
        // Test HTTP/HTTPS URL (HLS)
        const response = await fetch(testUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000),
        });
        testResults.accessible = response.ok;
        testResults.message = response.ok 
          ? 'Stream URL is accessible' 
          : `Stream returned status ${response.status}`;
      } else if (testUrl.startsWith('rtsp://')) {
        // For RTSP, validate URL format
        try {
          new URL(testUrl);
          testResults.accessible = true;
          testResults.message = 'RTSP URL format is valid (connection not tested)';
        } catch {
          testResults.message = 'Invalid RTSP URL format';
        }
      } else {
        testResults.message = 'Unsupported URL format';
      }

      return NextResponse.json({
        success: true,
        data: testResults,
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

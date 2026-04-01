/**
 * STEP 5: Stream API Route
 * 
 * API endpoint to start HLS streams from RTSP sources.
 * 
 * Responsibilities:
 * - Resolve camera RTSP URL (placeholder for now)
 * - Call ensureHlsStream
 * - Respond with HLS URL
 * 
 * Constraints:
 * - No streaming through Node
 * - No proxying video
 * - Browser must fetch HLS directly from /public
 * - RTSP must never reach frontend
 */

import { NextRequest, NextResponse } from 'next/server';
import { ensureHlsStream, getHlsUrl, isStreamActive, stopHlsStream } from '@/app/lib/streaming/hlsManager';
import { prisma } from '@/app/lib/prisma';
import { ffmpegManager } from '@/app/lib/streaming/ffmpeg';
import { kill } from 'process';

/**
 * Resolve camera RTSP URL from query parameter or database
 */
async function resolveCameraRtspUrl(cameraId: string, request: NextRequest): Promise<string | null> {
  // Option 1: RTSP URL in query parameter (takes precedence)
  const rtspUrlParam = request.nextUrl.searchParams.get('rtspUrl');
  if (rtspUrlParam) {
    console.log(`[Stream API] Using RTSP URL from query parameter for camera ${cameraId}`);
    return rtspUrlParam;
  }

  // Option 2: Database lookup
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: { streamUrl: true },
    });

    if (camera?.streamUrl) {
      console.log(`[Stream API] Found RTSP URL in database for camera ${cameraId}`);
      return camera.streamUrl;
    }

    console.warn(`[Stream API] No RTSP URL found in database for camera ${cameraId}`);
    return null;
  } catch (error: any) {
    console.error(`[Stream API] Error querying database for camera ${cameraId}:`, error);
    return null;
  }
}

/**
 * GET /api/streams/[cameraId]
 * 
 * Get or start HLS stream for a camera.
 * 
 * Query parameters:
 * - rtspUrl: RTSP source URL (required for now, until database integration)
 * 
 * Response:
 * {
 *   "hlsUrl": "/streams/{cameraId}/index.m3u8",
 *   "active": true
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
): Promise<NextResponse> {
  try {
    const { cameraId } = await params;

    // Hard failure: cameraId is required
    if (!cameraId || !cameraId.trim()) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Check if stream is already active
    // CRITICAL: Verify FFmpeg process is actually alive, not just registered
    const ffmpegAlive = ffmpegManager.hasProcess(cameraId);
    let processIsActuallyAlive = false;
    
    if (ffmpegAlive) {
      const processInfo = ffmpegManager.getProcess(cameraId);
      if (processInfo && !processInfo.process.killed && processInfo.process.pid) {
        // Double-check process is actually alive
        try {
          kill(processInfo.process.pid, 0); // Signal 0 checks if process exists
          processIsActuallyAlive = true;
        } catch (e) {
          // Process doesn't exist
          console.warn(`[Stream API] ⚠️ FFmpeg process ${processInfo.process.pid} for ${cameraId} is dead (kill check failed)`);
        }
      }
    }
    
    // CRITICAL: Only consider stream active if FFmpeg process exists AND is actually alive
    if (processIsActuallyAlive) {
      // Process is alive - reuse existing stream
      const hlsUrl = getHlsUrl(cameraId);
      if (hlsUrl) {
        console.log(`[Streaming] Reusing existing active stream for camera ${cameraId}`);
        
        // Persist HLS URL to database if not already stored
        try {
          const camera = await prisma.camera.findUnique({
            where: { id: cameraId },
            select: { hlsUrl: true },
          });
          
          if (!camera?.hlsUrl) {
            await prisma.camera.update({
              where: { id: cameraId },
              data: { hlsUrl },
            });
            console.log(`[Stream API] ✅ Persisted existing HLS URL to database for camera ${cameraId}`);
          }
        } catch (dbError: any) {
          // Log error but don't fail the request - stream is still working
          console.warn(`[Stream API] ⚠️ Failed to persist HLS URL to database for camera ${cameraId}:`, dbError.message);
        }
        
        // Mark as viewed for background streaming policy
        const { streamRegistry } = await import('@/app/lib/streaming/streamRegistry');
        streamRegistry.markAsViewed(cameraId);
        return NextResponse.json({
          hlsUrl,
          active: true,
        });
      }
    }
    
    // If we get here, FFmpeg is NOT running - clean up and restart
    // This handles all cases: dead process, registry mismatch, or no stream at all
    const { streamRegistry } = await import('@/app/lib/streaming/streamRegistry');
    if (ffmpegAlive || streamRegistry.hasStream(cameraId)) {
      console.warn(`[Stream API] ⚠️ Stream state inconsistent for ${cameraId} (FFmpeg dead or registry mismatch), cleaning up...`);
      const { stopHlsStream } = await import('@/app/lib/streaming/hlsManager');
      await stopHlsStream(cameraId);
    }

    // Resolve RTSP URL
    const rtspUrl = await resolveCameraRtspUrl(cameraId, request);

    // Hard failure: RTSP URL must be provided
    if (!rtspUrl) {
      return NextResponse.json(
        {
          error: 'RTSP URL is required',
          note: 'Camera not found in database or has no streamUrl. Provide rtspUrl as query parameter: ?rtspUrl=rtsp://...',
        },
        { status: 400 }
      );
    }

    // Hard failure: RTSP URL must be valid format
    if (!rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        {
          error: 'Invalid RTSP URL format',
          note: 'RTSP URL must start with rtsp://',
        },
        { status: 400 }
      );
    }

    // 🔥 HARD LOGGING - API route is about to start FFmpeg
    console.log(`[Streaming] Starting stream for camera ${cameraId}`);
    console.log(`[Stream API] RTSP URL: ${rtspUrl}`);
    console.log(`[Stream API] Calling ensureHlsStream...`);

    // Start HLS stream (this MUST spawn FFmpeg)
    const hlsUrl = ensureHlsStream(cameraId, rtspUrl);

    if (!hlsUrl) {
      console.error(`[Stream API] ❌ ensureHlsStream returned null for camera ${cameraId}`);
      return NextResponse.json(
        { error: 'Failed to start HLS stream' },
        { status: 500 }
      );
    }

    console.log(`[Streaming] Starting stream for camera ${cameraId}`);
    console.log(`[Stream API] ✅ HLS stream started successfully: ${hlsUrl}`);

    // Persist HLS URL to database for future reference
    try {
      await prisma.camera.update({
        where: { id: cameraId },
        data: { hlsUrl },
      });
      console.log(`[Stream API] ✅ Persisted HLS URL to database for camera ${cameraId}`);
    } catch (dbError: any) {
      // Log error but don't fail the request - stream is still working
      console.warn(`[Stream API] ⚠️ Failed to persist HLS URL to database for camera ${cameraId}:`, dbError.message);
    }

    return NextResponse.json({
      hlsUrl,
      active: true,
    });

  } catch (error: any) {
    console.error('[Stream API] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to start stream',
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/streams/[cameraId]
 * 
 * Stop HLS stream for a camera.
 * 
 * Response:
 * {
 *   "stopped": true
 * }
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ cameraId: string }> }
): Promise<NextResponse> {
  try {
    const { cameraId } = await params;

    if (!cameraId || !cameraId.trim()) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    const { stopHlsStream } = await import('@/app/lib/streaming/hlsManager');
    const stopped = await stopHlsStream(cameraId);

    return NextResponse.json({
      stopped,
    });

  } catch (error: any) {
    console.error('[Stream API] Error stopping stream:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to stop stream',
      },
      { status: 500 }
    );
  }
}


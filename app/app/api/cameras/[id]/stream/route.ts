/**
 * PHASE 2: Backend Streaming Service - API Endpoint
 * 
 * This endpoint provides live video streaming for a camera.
 * It is completely separate from the testing endpoint (Phase 1).
 * 
 * Responsibilities:
 * - Accept a camera ID
 * - Resolve the camera's stream URL
 * - Return stream information or proxy the stream
 * 
 * Constraints:
 * - No UI logic
 * - No test logic
 * - No snapshots
 * - No frontend assumptions
 * - Must be separate from testing
 */

import { NextRequest, NextResponse } from 'next/server';
import { resolveCameraStream, validateStreamUrl } from '@/app/lib/camera/streaming-service';
import { Camera } from '@/app/lib/camera/types';

/**
 * GET /api/cameras/:id/stream
 * 
 * Returns stream information for a camera.
 * 
 * In a real implementation, this might:
 * - Look up camera from database (not in this phase)
 * - Proxy the stream through the server
 * - Return stream metadata
 * 
 * For now, it accepts a camera object in the request body
 * (in Phase 5, this will be resolved from database/state)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  try {
    const cameraId = params.id;
    
    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }
    
    // In Phase 5, this will fetch from database/state
    // For now, we require camera data in query params or body
    // This is a temporary approach until state management is added
    
    const searchParams = request.nextUrl.searchParams;
    const streamUrl = searchParams.get('streamUrl');
    const protocol = searchParams.get('protocol') as Camera['protocol'] | null;
    
    if (!streamUrl || !protocol) {
      return NextResponse.json(
        { 
          error: 'Camera streamUrl and protocol must be provided',
          note: 'In Phase 5, camera will be resolved from database/state'
        },
        { status: 400 }
      );
    }
    
    // Validate protocol
    if (!['rtsp', 'webrtc', 'hls'].includes(protocol)) {
      return NextResponse.json(
        { error: 'Invalid protocol. Must be: rtsp, webrtc, or hls' },
        { status: 400 }
      );
    }
    
    // Create temporary camera object for resolution
    const camera: Camera = {
      id: cameraId,
      name: 'Temporary', // Will come from database in Phase 5
      protocol,
      streamUrl,
      status: 'live' // Will come from database in Phase 5
    };
    
    // Validate stream URL format
    if (!validateStreamUrl(streamUrl, protocol)) {
      return NextResponse.json(
        { error: `Invalid ${protocol} stream URL format` },
        { status: 400 }
      );
    }
    
    // Resolve the stream
    const streamResolution = resolveCameraStream(camera);
    
    return NextResponse.json({
      cameraId,
      streamUrl: streamResolution.streamUrl,
      protocol: streamResolution.protocol,
      directUrl: streamResolution.directUrl,
      proxyUrl: streamResolution.proxyUrl,
      // In a full implementation, might include:
      // - Stream health status
      // - Available resolutions
      // - Authentication requirements
    });
    
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to resolve camera stream' },
      { status: 500 }
    );
  }
}


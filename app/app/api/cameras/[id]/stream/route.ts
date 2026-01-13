/**
 * Backend Streaming Service - API Endpoint
 * 
 * This endpoint provides live video streaming metadata for a camera.
 * 
 * Responsibilities:
 * - Fetch camera from database
 * - Return stream metadata (WebRTC or HLS)
 * - Support Janus WebRTC streaming
 * 
 * Response format:
 * - WebRTC: { streamType: "webrtc", janusServerUrl, mountpointId, cameraId }
 * - HLS: { streamType: "hls", hlsUrl, cameraId }
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * GET /api/cameras/:id/stream
 * 
 * Returns stream metadata for a camera.
 * 
 * Required response format for WebRTC:
 * {
 *   "cameraId": "...",
 *   "streamType": "webrtc",
 *   "janusServerUrl": "ws://192.168.64.4:8188",
 *   "mountpointId": 10
 * }
 * 
 * Required response format for HLS:
 * {
 *   "cameraId": "...",
 *   "streamType": "hls",
 *   "hlsUrl": "http://..."
 * }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: cameraId } = await params;
    
    if (!cameraId) {
      return NextResponse.json(
        { error: 'Camera ID is required' },
        { status: 400 }
      );
    }

    // Authentication check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch camera from database
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: {
        id: true,
        name: true,
        status: true,
        streamUrl: true,
        hlsUrl: true,
        mediamtxPath: true,
        janusFeedId: true, // NEW: Support new Janus system
        metadata: true,
        worksiteId: true,
      },
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Authorization: Check if user has access to camera's worksite
    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin = 
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'ADMIN';

    if (!isGlobalAdmin) {
      // For non-admins, verify worksite access via company
      const userCompany = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { companyId: true },
      });

      if (userCompany?.companyId) {
        const worksite = await prisma.worksite.findFirst({
          where: {
            id: camera.worksiteId,
            companyId: userCompany.companyId,
          },
          select: { id: true },
        });

        if (!worksite) {
          return NextResponse.json(
            { error: 'Access denied to camera' },
            { status: 403 }
          );
        }
      } else {
        // User has no company - deny access
        return NextResponse.json(
          { error: 'Access denied to camera' },
          { status: 403 }
        );
      }
    }

    // Determine stream type: WebRTC (preferred) or HLS (fallback)
    // NEW SYSTEM: Check janusFeedId first (new Janus RTSP integration)
    // OLD SYSTEM: Fall back to metadata.mountpointId for backward compatibility
    const metadata = camera.metadata as any || {};
    const janusServerUrl = metadata.janusServerUrl || process.env.NEXT_PUBLIC_JANUS_SERVER_URL || process.env.JANUS_SERVER_URL || 'ws://localhost:8088/janus';
    
    // NEW: Check janusFeedId first (preferred - new system)
    // OLD: Fall back to metadata.mountpointId (backward compatibility)
    const feedId = camera.janusFeedId ?? metadata.mountpointId ?? metadata.mountpoint_id;

    // If feedId exists (either janusFeedId or mountpointId), validate and return WebRTC
    if (feedId !== undefined && feedId !== null) {
      // Parse feedId to number
      const parsedFeedId = typeof feedId === 'number' ? feedId : parseInt(feedId, 10);
      
      // Validate feedId is a valid number > 0
      if (isNaN(parsedFeedId) || parsedFeedId <= 0) {
        console.error(`[API /cameras/[id]/stream] Invalid feedId for camera ${camera.id}: ${feedId}`);
        return NextResponse.json(
          { 
            error: 'Camera is not configured for WebRTC (invalid feedId)',
            cameraId: camera.id,
          },
          { status: 503 }
        );
      }

      // Return WebRTC response with feedId (maps to mountpointId in Janus VideoRoom)
      return NextResponse.json({
        cameraId: camera.id,
        streamType: 'webrtc',
        janusServerUrl,
        mountpointId: parsedFeedId, // Use feedId as mountpointId for Janus VideoRoom
      });
    }

    // No feedId (neither janusFeedId nor mountpointId) - camera is not configured for WebRTC
    console.warn(`[API /cameras/[id]/stream] Camera ${camera.id} is not configured for WebRTC (missing janusFeedId or mountpointId)`);
    
    // Fallback to HLS if available
    if (camera.hlsUrl) {
      return NextResponse.json({
        cameraId: camera.id,
        streamType: 'hls',
        hlsUrl: camera.hlsUrl,
      });
    }

    // If no stream available, return explicit error
    return NextResponse.json(
      { 
        error: 'Camera is not configured for WebRTC (missing janusFeedId or mountpointId)',
        cameraId: camera.id,
      },
      { status: 503 }
    );
    
  } catch (error: any) {
    console.error('[API /cameras/[id]/stream] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resolve camera stream' },
      { status: 500 }
    );
  }
}


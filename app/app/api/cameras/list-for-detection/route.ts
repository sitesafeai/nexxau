/**
 * GET /api/cameras/list-for-detection
 * 
 * Internal endpoint for YOLO detection service to fetch camera list.
 * Requires internal service token for authentication.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Check for internal service auth
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;
    
    if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized - internal service token required' },
        { status: 401 }
      );
    }
    
    // Fetch all active cameras (online or active status)
    const cameras = await prisma.camera.findMany({
      where: {
        status: { in: ['online', 'active'] },
      },
      select: {
        id: true,
        name: true,
        ingestUrl: true,
        streamUrl: true,
        hlsUrl: true,
        streamProvider: true,
        status: true,
        metadata: true,
      },
    });

    const metadata = (cam: { metadata: unknown }) =>
      (typeof cam.metadata === 'object' && cam.metadata !== null ? cam.metadata : {}) as Record<string, unknown>;

    return NextResponse.json({
      cameras: cameras.map((cam) => ({
        id: cam.id,
        name: cam.name,
        ingestUrl:
          cam.ingestUrl ||
          cam.hlsUrl ||
          cam.streamUrl ||
          ((metadata(cam).ingestUrl as string | undefined) ?? null),
        // Backward compatibility for current worker field name.
        rtspUrl:
          cam.ingestUrl ||
          cam.hlsUrl ||
          cam.streamUrl ||
          ((metadata(cam).ingestUrl as string | undefined) ?? null),
        streamProvider:
          cam.streamProvider ||
          ((metadata(cam).streamProvider as string | undefined) ??
            (cam.hlsUrl ? 'hls' : 'rtsp')),
        status: cam.status,
        personAlertsEnabled: Boolean(metadata(cam).personAlertsEnabled),
      })),
    });
    
  } catch (error: any) {
    console.error('[API /cameras/list-for-detection] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}

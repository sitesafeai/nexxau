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
    
    // Fetch all active cameras (online/active) plus push cameras (they may be 'pending' status
    // but actively streaming — detection service reads from MediaMTX internal RTSP directly)
    const cameras = await prisma.camera.findMany({
      where: {
        OR: [
          { status: { in: ['online', 'active'] } },
          // Push cameras pushed from Pi — include regardless of status so YOLO can read them
          { metadata: { path: ['ingestMode'], equals: 'push' } },
        ],
      },
      select: {
        id: true,
        name: true,
        ingestUrl: true,
        streamUrl: true,
        hlsUrl: true,
        mediamtxPath: true,
        streamProvider: true,
        status: true,
        metadata: true,
      },
    });

    const metadata = (cam: { metadata: unknown }) =>
      (typeof cam.metadata === 'object' && cam.metadata !== null ? cam.metadata : {}) as Record<string, unknown>;

    // MediaMTX internal RTSP base — detection service reads live streams from here.
    // Uses same credentials as the rest of the Next.js ↔ MediaMTX integration.
    const mediamtxUser = process.env.MEDIAMTX_API_USERNAME || 'admin';
    const mediamtxPass = process.env.MEDIAMTX_API_PASSWORD || 'nexxau';
    const mediamtxRtspHost = process.env.MEDIAMTX_RTSP_INTERNAL_HOST || 'mediamtx:8554';

    // Extract the MediaMTX stream path from hlsUrl or mediamtxPath.
    // hlsUrl looks like https://mediamtx-host/cmpp0jiuu0001qm0cbvaei1y9/index.m3u8
    const getMediaMTXPath = (cam: typeof cameras[0]): string | null => {
      if (cam.mediamtxPath) return cam.mediamtxPath;
      if (cam.hlsUrl) {
        try {
          const segments = new URL(cam.hlsUrl).pathname.split('/').filter(Boolean);
          return segments[0] || null;
        } catch {}
      }
      return null;
    };

    const resolveIngestUrl = (cam: typeof cameras[0]): string | null => {
      const meta = metadata(cam);
      const isPush = meta.ingestMode === 'push';
      const mtxPath = getMediaMTXPath(cam);

      if (isPush || mtxPath) {
        // Camera streams via MediaMTX — read via internal RTSP using the correct path.
        // Use the MediaMTX path from hlsUrl/mediamtxPath; fall back to cam.id only if nothing else.
        const streamPath = mtxPath || cam.id;
        return `rtsp://${mediamtxUser}:${mediamtxPass}@${mediamtxRtspHost}/${streamPath}`;
      }
      return (
        cam.ingestUrl ||
        cam.streamUrl ||
        ((meta.ingestUrl as string | undefined) ?? null)
      );
    };

    return NextResponse.json({
      cameras: cameras.map((cam) => {
        const meta = metadata(cam);
        const ingestUrl = resolveIngestUrl(cam);
        const isPush = meta.ingestMode === 'push';
        return {
          id: cam.id,
          name: cam.name,
          ingestUrl,
          // Backward compatibility for current worker field name.
          rtspUrl: ingestUrl,
          streamProvider: isPush
            ? 'rtsp'
            : cam.streamProvider ||
              ((meta.streamProvider as string | undefined) ?? (cam.hlsUrl ? 'hls' : 'rtsp')),
          status: cam.status,
          personAlertsEnabled: Boolean(meta.personAlertsEnabled),
        };
      }),
    });
    
  } catch (error: any) {
    console.error('[API /cameras/list-for-detection] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}

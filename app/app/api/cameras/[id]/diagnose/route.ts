/**
 * GET /api/cameras/[id]/diagnose
 * 
 * Diagnostic endpoint to check camera streaming status
 * Returns detailed information about mountpoint, RTP stream, and FFmpeg process
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getRtpStreamStatus } from '@/app/lib/services/cameraIngestClient';

export const runtime = 'nodejs';

const resolveRtpPort = (mountpointId: number): number => {
  const basePort = Number(process.env.JANUS_RTP_BASE_PORT || '20000');
  const portRange = Number(process.env.JANUS_RTP_PORT_RANGE || '10000');
  const safeBase = Number.isFinite(basePort) && basePort > 0 ? basePort : 20000;
  const safeRange = Number.isFinite(portRange) && portRange > 0 ? portRange : 10000;
  const offset = mountpointId % safeRange;
  return safeBase + offset;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: cameraId } = params;

    // Fetch camera
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: {
        id: true,
        name: true,
        streamUrl: true,
        janusFeedId: true,
        metadata: true,
        status: true,
      },
    });

    if (!camera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    const metadata = camera.metadata as any;
    const expectedRtpPort = metadata?.janusRtpPort || resolveRtpPort(Number(camera.janusFeedId || 0));

    // Check RTP stream status from camera-ingest-service (via shared client)
    const rtpStatus = await getRtpStreamStatus(cameraId);
    const rtpStreamStatus = rtpStatus.success ? rtpStatus.data : null;

    // Check if FFmpeg process is running (by checking if RTP worker reports a running process)
    const ffmpegRunning = !!rtpStreamStatus?.isProcessRunning;

    return NextResponse.json({
      success: true,
      data: {
        camera: {
          id: camera.id,
          name: camera.name,
          status: camera.status,
          streamUrl: camera.streamUrl,
          janusFeedId: camera.janusFeedId,
        },
        mountpoint: {
          id: camera.janusFeedId,
          expectedRtpPort: expectedRtpPort,
          actualRtpPort: rtpStreamStatus?.rtpPort || null,
          portMatch: rtpStreamStatus?.rtpPort === expectedRtpPort,
        },
        rtpStream: rtpStreamStatus ? {
          status: rtpStreamStatus.status,
          isProcessRunning: rtpStreamStatus.isProcessRunning,
          rtpHost: rtpStreamStatus.rtpHost,
          rtpPort: rtpStreamStatus.rtpPort,
          videoCodec: rtpStreamStatus.videoCodec,
          payloadType: rtpStreamStatus.payloadType,
          failureCount: rtpStreamStatus.failureCount,
          lastFailureAt: rtpStreamStatus.lastFailureAt,
          startedAt: rtpStreamStatus.startedAt,
        } : null,
        diagnostics: {
          ffmpegRunning,
          rtpPortMatch: rtpStreamStatus?.rtpPort === expectedRtpPort,
          mountpointExists: camera.janusFeedId !== null,
          streamUrlValid: camera.streamUrl !== null && camera.streamUrl.startsWith('rtsp://'),
        },
      },
    });
  } catch (error: any) {
    console.error(`[API /cameras/:id/diagnose] ❌ Error:`, error.message);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to diagnose camera',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cameras/[id]/health
 * Returns camera health data (from CameraHealth) and go2rtc stream presence.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { listGo2RTCStreams, healthCheckGo2RTC } from '@/app/lib/services/go2rtcClient';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: cameraId } = await params;
    if (!cameraId?.trim()) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId.trim() },
      select: {
        id: true,
        name: true,
        streamUrl: true,
        status: true,
      },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const latestHealth = await prisma.cameraHealth.findFirst({
      where: { cameraId: cameraId.trim() },
      orderBy: { lastCheck: 'desc' },
      select: {
        status: true,
        streamQuality: true,
        frameRate: true,
        resolution: true,
        bitrate: true,
        latency: true,
        lastCheck: true,
      },
    });

    const go2rtcUrl = process.env.GO2RTC_URL || 'http://localhost:1984';
    const go2rtcHealthy = await healthCheckGo2RTC(go2rtcUrl);
    const streams = go2rtcHealthy ? await listGo2RTCStreams(go2rtcUrl) : null;
    const inGo2RTC = streams && cameraId.trim() in streams;

    const isOnline =
      latestHealth?.status === 'ONLINE' &&
      latestHealth.lastCheck &&
      (Date.now() - new Date(latestHealth.lastCheck).getTime()) < 60_000;

    return NextResponse.json({
      cameraId: camera.id,
      health: latestHealth
        ? {
            status: latestHealth.status,
            streamQuality: latestHealth.streamQuality,
            frameRate: latestHealth.frameRate,
            resolution: latestHealth.resolution,
            bitrate: latestHealth.bitrate,
            latency: latestHealth.latency,
            lastCheck: latestHealth.lastCheck,
          }
        : null,
      go2rtc: {
        healthy: go2rtcHealthy,
        streamRegistered: inGo2RTC,
      },
      derived: {
        isOnline,
        hasStreamUrl: !!(camera.streamUrl?.trim().startsWith('rtsp://')),
      },
    });
  } catch (error: any) {
    console.error('[API /cameras/[id]/health] Error:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch health' },
      { status: 500 }
    );
  }
}

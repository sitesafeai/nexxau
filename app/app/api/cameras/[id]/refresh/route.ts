/**
 * POST /api/cameras/[id]/refresh
 * Re-registers the camera stream with go2rtc (remove + re-add).
 * Use when stream is disconnected or not playing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import {
  removeStreamFromGo2RTC,
  addStreamToGo2RTC,
  healthCheckGo2RTC,
  listGo2RTCStreams,
} from '@/app/lib/services/go2rtcClient';
import { normalizeRole } from '@/app/lib/roles';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = normalizeRole(session.user.role);
    const allowedRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: cameraId } = await params;
    if (!cameraId?.trim()) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId.trim() },
      select: { id: true, name: true, streamUrl: true },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const rtspUrl = camera.streamUrl?.trim();
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        { error: 'No RTSP URL configured for this camera' },
        { status: 400 }
      );
    }

    const go2rtcUrl = process.env.GO2RTC_URL || 'http://localhost:1984';
    if (!(await healthCheckGo2RTC(go2rtcUrl))) {
      return NextResponse.json(
        { error: 'Stream gateway (go2rtc) is not reachable. Start it with ./start-nexxau.sh' },
        { status: 503 }
      );
    }

    removeStreamFromGo2RTC(go2rtcUrl, camera.id);
    await new Promise((r) => setTimeout(r, 500));

    const added = await addStreamToGo2RTC(go2rtcUrl, camera.id, rtspUrl);
    if (!added) {
      return NextResponse.json(
        { error: 'Failed to re-register stream. Check RTSP URL and go2rtc logs.' },
        { status: 502 }
      );
    }

    await new Promise((r) => setTimeout(r, 800));
    const streams = await listGo2RTCStreams(go2rtcUrl);
    const streamExists = streams && camera.id in streams;

    if (!streamExists) {
      return NextResponse.json(
        { error: 'Stream failed to register in go2rtc' },
        { status: 502 }
      );
    }

    await prisma.camera.update({
      where: { id: camera.id },
      data: { status: 'active' },
    });

    return NextResponse.json({
      success: true,
      message: 'Stream reconnected successfully.',
    });
  } catch (error: any) {
    console.error('[API /cameras/[id]/refresh] Error:', error?.message);
    return NextResponse.json(
      { error: error?.message || 'Failed to refresh stream' },
      { status: 500 }
    );
  }
}

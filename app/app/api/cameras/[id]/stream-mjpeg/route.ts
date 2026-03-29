/**
 * GET /api/cameras/:id/stream-mjpeg
 *
 * Streams camera RTSP as MJPEG via FFmpeg (simple fallback when go2rtc fails).
 * One FFmpeg process per viewer; no WebRTC.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';
import { spawn } from 'child_process';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

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

    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: {
        id: true,
        name: true,
        worksiteId: true,
        streamUrl: true,
      },
    });

    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin =
      userRole === 'SUPER_ADMIN' ||
      userRole === 'COMPANY_ADMIN' ||
      userRole === 'ADMIN';

    if (!isGlobalAdmin) {
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
        return NextResponse.json(
          { error: 'Access denied to camera' },
          { status: 403 }
        );
      }
    }

    const rtspUrl = camera.streamUrl?.trim();
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        {
          error: 'No RTSP stream configured',
          hint: 'Add an RTSP URL for this camera.',
        },
        { status: 503 }
      );
    }

    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const ffmpeg = spawn(
      ffmpegPath,
      [
        '-rtsp_transport',
        'tcp',
        '-fflags',
        'nobuffer',
        '-flags',
        'low_delay',
        '-analyzeduration',
        '1000000',
        '-probesize',
        '1000000',
        '-i',
        rtspUrl,
        '-r',
        '10',
        '-c:v',
        'mjpeg',
        '-q:v',
        '6',
        '-f',
        'mpjpeg',
        '-an',
        '-',
      ],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let errored = false;

    request.signal?.addEventListener('abort', () => {
      if (!errored) {
        ffmpeg.kill('SIGKILL');
      }
    });

    ffmpeg.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString().trim();
      if (msg.toLowerCase().includes('error')) {
        console.error('[stream-mjpeg] FFmpeg:', msg);
      }
    });

    ffmpeg.on('error', (err) => {
      errored = true;
      console.error('[stream-mjpeg] FFmpeg spawn error:', err);
    });

    ffmpeg.on('close', (code) => {
      if (code !== 0 && code !== null && !errored) {
        console.log('[stream-mjpeg] FFmpeg exited with code', code);
      }
    });

    const webStream = Readable.toWeb(ffmpeg.stdout!) as ReadableStream;

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': 'multipart/x-mixed-replace; boundary=ffmpeg',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('[stream-mjpeg] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start stream' },
      { status: 500 }
    );
  }
}

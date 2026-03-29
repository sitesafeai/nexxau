/**
 * GET /api/stream/mjpeg
 * Stream current RTSP as MJPEG (FFmpeg fallback).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getCurrentRtspUrl } from '@/app/lib/stream-state';
import { spawn } from 'child_process';
import { Readable } from 'stream';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rtspUrl = getCurrentRtspUrl();

    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        { error: 'No RTSP URL set. Enter a URL and click Start Stream first.' },
        { status: 400 }
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
        '-c:v',
        'mjpeg',
        '-q:v',
        '6',
        '-f',
        'mpjpeg',
        '-an',
        '-',
      ],
      { stdio: ['ignore', 'pipe', 'pipe'] }
    );

    request.signal?.addEventListener('abort', () => {
      ffmpeg.kill('SIGKILL');
    });

    ffmpeg.stderr?.on('data', () => {});

    ffmpeg.on('error', (err) => {
      console.error('[stream/mjpeg] FFmpeg error:', err);
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
    console.error('[stream/mjpeg] Error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to start stream. Is FFmpeg installed?',
      },
      { status: 500 }
    );
  }
}

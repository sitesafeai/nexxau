/**
 * POST /api/stream
 * Set the current RTSP URL for the simple stream viewer (MJPEG).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { setCurrentRtspUrl } from '@/lib/stream-state';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const url = (body?.url || body?.rtspUrl || '').trim();

    if (!url) {
      return NextResponse.json(
        { error: 'Please provide a valid RTSP URL (must start with rtsp://)' },
        { status: 400 }
      );
    }

    if (!url.startsWith('rtsp://')) {
      return NextResponse.json(
        { error: 'URL must start with rtsp://' },
        { status: 400 }
      );
    }

    setCurrentRtspUrl(url);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[api/stream] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to set stream' },
      { status: 500 }
    );
  }
}

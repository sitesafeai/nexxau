import { NextRequest, NextResponse } from 'next/server';
import { addStreamToMediaMTX, getMediaMTXHLSUrl } from '@/app/lib/services/mediamtxClient';
import { requireCameraAccess } from '@/app/lib/api-route-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: cameraId } = await params;

    if (!cameraId) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const auth = await requireCameraAccess(cameraId);
    if (!auth.ok) {
      return auth.response;
    }
    const { camera } = auth;

    const rtspUrl = camera.streamUrl?.trim();
    if (!rtspUrl || !rtspUrl.startsWith('rtsp://')) {
      return NextResponse.json(
        { error: 'No RTSP stream configured', cameraId: camera.id, hint: 'Add an RTSP URL for this camera.' },
        { status: 503 }
      );
    }

    // MediaMTX internal URL (server-side, for registering the stream)
    const mediamtxApiUrl = process.env.MEDIAMTX_API_URL || 'http://localhost:9000';
    const added = await addStreamToMediaMTX(mediamtxApiUrl, camera.id, rtspUrl);
    if (!added) {
      return NextResponse.json(
        { error: 'Stream gateway unavailable', hint: 'Is MediaMTX running?' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      cameraId: camera.id,
      streamType: 'hls',
      hlsUrl: getMediaMTXHLSUrl(camera.id),
    });

  } catch (error: any) {
    console.error('[API /cameras/[id]/stream] Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to resolve camera stream' }, { status: 500 });
  }
}

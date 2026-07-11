/**
 * POST /api/cameras/stream-event
 *
 * Called by MediaMTX runOnReady / runOnNotReady hooks when a stream
 * connects or disconnects. Logs CAMERA_ONLINE / CAMERA_OFFLINE to the
 * audit log so Camera Activity stays up to date.
 *
 * Body: { path: string, event: "connected" | "disconnected" }
 *
 * MediaMTX config (add to mediamtx.yml under pathDefaults or individual paths):
 *   runOnReady: >
 *     curl -s -X POST https://<your-app-url>/api/cameras/stream-event
 *     -H "Content-Type: application/json"
 *     -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN"
 *     -d '{"path":"$MTX_PATH","event":"connected"}'
 *   runOnNotReady: >
 *     curl -s -X POST https://<your-app-url>/api/cameras/stream-event
 *     -H "Content-Type: application/json"
 *     -H "Authorization: Bearer $INTERNAL_SERVICE_TOKEN"
 *     -d '{"path":"$MTX_PATH","event":"disconnected"}'
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { writeAuditLog } from '@/app/lib/audit';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

export async function POST(req: NextRequest) {
  // Auth — same token used by heartbeat and YOLO ingest
  const auth = req.headers.get('authorization');
  if (!INTERNAL_TOKEN || auth !== `Bearer ${INTERNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { path?: string; event?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { path: streamPath, event } = body;

  if (!streamPath || !['connected', 'disconnected'].includes(event ?? '')) {
    return NextResponse.json(
      { error: 'Required: path (string), event ("connected" | "disconnected")' },
      { status: 400 }
    );
  }

  // Look up the camera by mediamtxPath or id (the stream path is usually the camera ID)
  const camera = await prisma.camera.findFirst({
    where: {
      OR: [
        { mediamtxPath: streamPath },
        { id: streamPath },
      ],
    },
    select: { id: true, name: true, worksiteId: true, status: true },
  });

  if (!camera) {
    // Unknown stream path — log it anyway as a SYSTEM event so it's visible
    console.warn(`[stream-event] Unknown stream path: ${streamPath}`);
    return NextResponse.json({ ok: true, matched: false });
  }

  const isConnected = event === 'connected';
  const newStatus = isConnected ? 'online' : 'offline';

  // Update camera status
  await prisma.camera.update({
    where: { id: camera.id },
    data: { status: newStatus },
  }).catch((e) => console.warn('[stream-event] status update failed:', e?.message));

  // Write CameraHealth row
  await prisma.cameraHealth.create({
    data: {
      cameraId: camera.id,
      status: isConnected ? 'ONLINE' : 'OFFLINE',
      lastCheck: new Date(),
    },
  }).catch((e) => console.warn('[stream-event] health write failed:', e?.message));

  // Write audit log
  await writeAuditLog({
    action: isConnected ? 'CAMERA_ONLINE' : 'CAMERA_OFFLINE',
    entity: 'CAMERA',
    entityId: camera.id,
    entityName: camera.name || camera.id,
    worksiteId: camera.worksiteId,
    severity: isConnected ? 'INFO' : 'WARNING',
    result: 'SUCCESS',
    details: {
      streamPath,
      previousStatus: camera.status || 'unknown',
      source: 'mediamtx_hook',
    },
  });

  console.log(`[stream-event] ${camera.name} (${camera.id}) → ${newStatus}`);

  return NextResponse.json({ ok: true, matched: true, cameraId: camera.id, status: newStatus });
}

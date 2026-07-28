/**
 * POST /api/cameras/heartbeat
 * Lightweight "I'm alive" ping from the YOLO detection service.
 * Called on a regular interval (e.g. every 30 s) even when there are no detections,
 * so cameras don't go offline just because the scene is clean.
 *
 * Auth: Bearer INTERNAL_SERVICE_TOKEN (same token as /api/yolo/ingest)
 *
 * Body: { camera_ids: string[] }   — batch ping multiple cameras at once
 *  OR   { camera_id: string }      — single camera
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { writeAuditLog } from '@/app/lib/audit';
import { workflowEngine } from '@/app/lib/workflows/workflow-engine';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!INTERNAL_TOKEN || auth !== `Bearer ${INTERNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { camera_ids?: string[]; camera_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Normalise to an array
  const ids: string[] = body.camera_ids?.length
    ? body.camera_ids
    : body.camera_id
    ? [body.camera_id]
    : [];

  if (!ids.length) {
    return NextResponse.json({ error: 'No camera IDs provided' }, { status: 400 });
  }

  const now = new Date();

  // Only act on camera IDs that actually exist in the DB — grab current status for transition detection
  const existingCameras = await prisma.camera.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, status: true, worksiteId: true },
  });
  const validIds = existingCameras.map((c) => c.id);

  if (!validIds.length) {
    return NextResponse.json({ ok: false, error: 'No matching cameras found', updated: 0 }, { status: 404 });
  }

  // Cameras that are transitioning from offline → online
  const comingOnline = existingCameras.filter((c) => c.status !== 'online');

  // Update camera.status for all valid IDs in one query
  await prisma.camera.updateMany({
    where: { id: { in: validIds } },
    data: { status: 'online' },
  });

  // Log CAMERA_ONLINE transitions (fire-and-forget)
  for (const cam of comingOnline) {
    writeAuditLog({
      action: 'CAMERA_ONLINE',
      entity: 'CAMERA',
      entityId: cam.id,
      entityName: cam.name || cam.id,
      worksiteId: cam.worksiteId,
      severity: 'INFO',
      result: 'SUCCESS',
      details: { previousStatus: cam.status || 'unknown' },
    }).catch(() => {});
  }

  // Detect cameras that have gone offline — any camera in the same worksites
  // whose last CameraHealth entry is ONLINE but older than 90 s (3 missed heartbeats).
  const worksiteIds = [...new Set(existingCameras.map((c) => c.worksiteId).filter(Boolean))] as string[];
  if (worksiteIds.length) {
    const staleThreshold = new Date(now.getTime() - 90_000);
    const staleCameras = await prisma.camera.findMany({
      where: {
        worksiteId: { in: worksiteIds },
        id: { notIn: validIds },
        status: 'online',
      },
      select: { id: true, name: true, worksiteId: true },
    });

    if (staleCameras.length) {
      // Verify they actually have no recent heartbeat before marking offline
      for (const cam of staleCameras) {
        const latestHealth = await prisma.cameraHealth.findFirst({
          where: { cameraId: cam.id },
          orderBy: { lastCheck: 'desc' },
          select: { lastCheck: true },
        });
        if (!latestHealth || latestHealth.lastCheck < staleThreshold) {
          // Mark offline
          await prisma.camera.update({
            where: { id: cam.id },
            data: { status: 'offline' },
          }).catch(() => {});
          await prisma.cameraHealth.create({
            data: { cameraId: cam.id, status: 'OFFLINE', lastCheck: now },
          }).catch(() => {});
          writeAuditLog({
            action: 'CAMERA_OFFLINE',
            entity: 'CAMERA',
            entityId: cam.id,
            entityName: cam.name || cam.id,
            worksiteId: cam.worksiteId,
            severity: 'WARNING',
            result: 'SUCCESS',
            details: { lastSeen: latestHealth?.lastCheck?.toISOString() || null },
          }).catch(() => {});

          // Fire camera_offline workflows (fire-and-forget)
          workflowEngine.processAlert({
            id: `camera-offline-${cam.id}-${now.getTime()}`,
            worksiteId: cam.worksiteId,
            cameraId: cam.id,
            title: `Camera Offline: ${cam.name || cam.id}`,
            violationType: 'camera_offline',
            severity: 'HIGH',
            source: 'camera',
            status: 'offline',
            location: cam.name || cam.id,
            createdAt: now,
            metadata: { lastSeen: latestHealth?.lastCheck?.toISOString() || null },
          }).catch((e: any) => console.error('[heartbeat] workflow trigger failed:', e?.message));
        }
      }
    }
  }

  // Write a CameraHealth row per camera — one round-trip per camera, but typically
  // the YOLO service only manages a handful of cameras so this is fine.
  const healthWrites = validIds.map((cameraId) =>
    prisma.cameraHealth
      .create({ data: { cameraId, status: 'ONLINE', lastCheck: now } })
      .catch((e) => console.warn(`[heartbeat] health write failed for ${cameraId}:`, e?.message))
  );

  // Stamp lastSeenAt on each camera's metadata — do it one-by-one so we can
  // merge the existing JSON rather than replacing it.
  const metaWrites = validIds.map(async (cameraId) => {
    try {
      const cam = await prisma.camera.findUnique({
        where: { id: cameraId },
        select: { metadata: true },
      });
      await prisma.camera.update({
        where: { id: cameraId },
        data: {
          metadata: {
            ...((cam?.metadata as Record<string, unknown>) ?? {}),
            lastSeenAt: now.toISOString(),
          },
        },
      });
    } catch (e: any) {
      console.warn(`[heartbeat] metadata stamp failed for ${cameraId}:`, e?.message);
    }
  });

  await Promise.all([...healthWrites, ...metaWrites]);

  // Prune CameraHealth rows older than 7 days — fire-and-forget, runs ~1% of requests
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    prisma.cameraHealth
      .deleteMany({ where: { lastCheck: { lt: cutoff } } })
      .catch((e) => console.warn('[heartbeat] prune failed:', e?.message));
  }

  return NextResponse.json({ ok: true, updated: validIds.length, at: now.toISOString() });
}

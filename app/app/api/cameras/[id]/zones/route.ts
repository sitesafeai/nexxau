/**
 * GET  /api/cameras/:id/zones  → { zones: CameraZone[] }
 * PUT  /api/cameras/:id/zones  ← { zones: CameraZone[] }  → { zones }
 *
 * Zones are restricted/monitored areas drawn on a camera's view. They live in
 * Camera.metadata.zones rather than their own table — metadata is already Json? so this
 * needs no migration, and zones are small, per-camera, and only ever read alongside the
 * camera itself.
 *
 * Points are NORMALISED (0..1 of frame width/height). See app/lib/zones.ts for why that
 * matters — the drawing canvas, the original frame and the stored snapshot are three
 * different pixel spaces, and storing raw pixels would silently match the wrong region.
 * PUT re-parses through parseZones() so nothing malformed can reach the ingest path.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { parseZones, zonesFromCameraMetadata } from '@/app/lib/zones';

export const dynamic = 'force-dynamic';

/** Roles allowed to change what counts as a restricted area. */
const EDIT_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'COMPANY_ADMIN', 'SAFETY_MANAGER']);

async function loadCamera(cameraId: string) {
  return prisma.camera.findUnique({
    where: { id: cameraId },
    select: { id: true, name: true, worksiteId: true, metadata: true },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const camera = await loadCamera(cameraId);
    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    return NextResponse.json({
      cameraId: camera.id,
      zones: zonesFromCameraMetadata(camera.metadata),
    });
  } catch (error) {
    console.error('[API /cameras/:id/zones GET]', error);
    return NextResponse.json({ error: 'Failed to load zones' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = normalizeRole((session.user as { role?: string }).role);
    if (!EDIT_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let body: { zones?: unknown };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const camera = await loadCamera(cameraId);
    if (!camera) {
      return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
    }

    // Validate here, not just on the client. A zone with 2 points or pixel coordinates
    // would reach the ingest route and silently never match — the failure mode this
    // whole feature exists to avoid.
    const incoming = Array.isArray(body.zones) ? body.zones : [];
    const zones = parseZones(incoming);
    const dropped = incoming.length - zones.length;
    if (dropped > 0) {
      console.warn(
        `[zones] camera=${cameraId} dropped ${dropped} malformed zone(s) on save — ` +
        `needs an id and 3+ normalised points`
      );
    }

    // Merge, don't replace: metadata holds other things and this route owns only `zones`.
    const existingMeta =
      camera.metadata && typeof camera.metadata === 'object' && !Array.isArray(camera.metadata)
        ? (camera.metadata as Record<string, unknown>)
        : {};

    await prisma.camera.update({
      where: { id: cameraId },
      data: { metadata: { ...existingMeta, zones } as object },
    });

    console.log(`[zones] camera=${cameraId} saved ${zones.length} zone(s)`);
    return NextResponse.json({ cameraId, zones, dropped });
  } catch (error) {
    console.error('[API /cameras/:id/zones PUT]', error);
    return NextResponse.json({ error: 'Failed to save zones' }, { status: 500 });
  }
}

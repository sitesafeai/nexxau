/**
 * GET /api/cameras/:id/live-detections
 *
 * Super-admin diagnostic endpoint. Returns the most recent DetectionLog rows for a
 * camera *including their bounding boxes*, so the AI Vision tab can draw what the
 * YOLO service actually saw on top of the live stream.
 *
 * Deliberately separate from /api/cameras/:id/detections (which is a mock) and from
 * /api/detections/recent (which strips bbox and is worksite-scoped + cached).
 *
 * Coordinate space: bbox is [x1, y1, x2, y2] in the ORIGINAL frame pixels that YOLO
 * read off the MediaMTX stream. The browser plays that same MediaMTX stream, so
 * video.videoWidth / video.videoHeight is the correct denominator client-side.
 *
 * Query params:
 *   windowMs  — how far back to look (default 4000, max 60000)
 *   limit     — max rows (default 40, max 200)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: cameraId } = await params;
    if (!cameraId) {
      return NextResponse.json({ error: 'Camera ID is required' }, { status: 400 });
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Raw bounding-box data is a debugging surface, not a customer-facing one.
    // Gate it to SUPER_ADMIN only — same bar as the tab that consumes it.
    if (normalizeRole((session.user as { role?: string }).role) !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const url = request.nextUrl;
    const windowMs = Math.min(
      Math.max(Number(url.searchParams.get('windowMs')) || 4000, 500),
      60_000
    );
    const limit = Math.min(
      Math.max(Number(url.searchParams.get('limit')) || 40, 1),
      200
    );

    const since = new Date(Date.now() - windowMs);

    const rows = await prisma.detectionLog.findMany({
      where: { cameraId, timestamp: { gte: since } },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        confidence: true,
        bbox: true,
        timestamp: true,
      },
    });

    // Normalize bbox into a predictable [x1,y1,x2,y2] tuple. Historic rows may hold
    // an empty array (older ingests posted `bbox: []` when the box was missing) — drop
    // those rather than shipping NaNs to the canvas.
    const detections = rows
      .map((row) => {
        const raw = Array.isArray(row.bbox) ? (row.bbox as unknown[]).map(Number) : [];
        if (raw.length !== 4 || raw.some((n) => !Number.isFinite(n))) return null;
        const [x1, y1, x2, y2] = raw as [number, number, number, number];
        return {
          id: row.id,
          type: row.type,
          confidence: row.confidence,
          bbox: { x1, y1, x2, y2 },
          timestamp: row.timestamp.toISOString(),
        };
      })
      .filter(Boolean);

    return NextResponse.json({
      cameraId,
      windowMs,
      detections,
      // Count of rows we had to discard for a malformed/absent bbox — surfaced in the
      // UI so "nothing is drawing" is distinguishable from "nothing was detected".
      droppedNoBbox: rows.length - detections.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API /cameras/:id/live-detections]', error);
    return NextResponse.json({ error: 'Failed to fetch detections' }, { status: 500 });
  }
}

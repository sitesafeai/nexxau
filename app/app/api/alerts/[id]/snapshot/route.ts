/**
 * GET /api/alerts/[id]/snapshot
 * Serves the detection snapshot JPEG for an alert, with the triggering detection
 * annotated — a labelled bounding box around the one object that tripped the rule.
 *
 * Public endpoint — alert IDs are cryptographically random (cuid), unguessable.
 * The image bytes live in alert.metadata.snapshotData (base64 data URI).
 *
 * This is the image alert emails embed via <img src>, so annotating here means the
 * email template needs no changes and previously-sent alerts render boxes too
 * (provided their metadata carries bbox + frameW/frameH).
 *
 * Coordinate spaces — the subtle part:
 *   metadata.bbox is [x1,y1,x2,y2] in ORIGINAL frame pixels, as YOLO read them off the
 *   MediaMTX stream. But railway_service.encode_frame() downscales the stored JPEG to
 *   <=640px on its longest side. So the box must be scaled by (storedWidth / frameW).
 *   Without frameW we cannot know that ratio, so we serve the image unannotated rather
 *   than draw a box in the wrong place.
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import sharp from 'sharp';

// Mirrors TYPE_META in components/dashboard/DetectionPanel.tsx and VIOLATION_LABELS
// in ai-detection/railway_service.py. Keys are the `type` values the YOLO service posts.
const LABELS: Record<string, { label: string; color: string }> = {
  fall_detected: { label: 'Fall Detected', color: '#ef4444' },
  no_helmet: { label: 'No Hardhat', color: '#ef4444' },
  no_vest: { label: 'No Safety Vest', color: '#ef4444' },
  no_gloves: { label: 'No Gloves', color: '#f59e0b' },
  no_goggles: { label: 'No Goggles', color: '#f59e0b' },
  no_mask: { label: 'No Mask', color: '#f59e0b' },
  no_boots: { label: 'No Safety Boots', color: '#f59e0b' },
  helmet: { label: 'Hardhat', color: '#10b981' },
  vest: { label: 'Safety Vest', color: '#10b981' },
  gloves: { label: 'Gloves', color: '#10b981' },
  goggles: { label: 'Goggles', color: '#10b981' },
  mask: { label: 'Mask', color: '#10b981' },
  person_detected: { label: 'Person', color: '#3b82f6' },
  ladder: { label: 'Ladder', color: '#94a3b8' },
  safety_cone: { label: 'Safety Cone', color: '#94a3b8' },
};

function labelFor(type: string | null | undefined) {
  if (!type) return { label: 'Detection', color: '#ef4444' };
  return (
    LABELS[type] ?? {
      label: type
        .split('_')
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' '),
      color: '#ef4444',
    }
  );
}

// SVG is XML — an unescaped & or < in a label would produce a malformed overlay that
// librsvg rejects, taking the whole snapshot down with it.
function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const alert = await prisma.alert.findUnique({
    where: { id },
    select: { metadata: true, violationType: true },
  });

  if (!alert) {
    return new NextResponse('Not found', { status: 404 });
  }

  const meta = alert.metadata as Record<string, any> | null;
  const dataUri: string | null | undefined = meta?.snapshotData;

  if (!dataUri) {
    return new NextResponse('No snapshot available', { status: 404 });
  }

  // dataUri = "data:image/jpeg;base64,<bytes>"
  const commaIdx = dataUri.indexOf(',');
  if (commaIdx === -1) {
    return new NextResponse('Invalid snapshot data', { status: 500 });
  }

  const originalBuffer = Buffer.from(dataUri.slice(commaIdx + 1), 'base64');

  const respond = (buf: Buffer) =>
    new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(buf.byteLength),
        // Cache for 1 hour — an alert's snapshot never changes once written.
        'Cache-Control': 'public, max-age=3600, immutable',
      },
    });

  const bbox = meta?.bbox;
  const frameW = Number(meta?.frameW);
  const frameH = Number(meta?.frameH);

  // Any of these missing means we cannot place the box correctly. Older alerts
  // (pre-annotation) land here, as do alerts from a YOLO service that hasn't been
  // redeployed with frame_size yet. Serving the plain snapshot is the honest fallback.
  const canAnnotate =
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((n: unknown) => Number.isFinite(Number(n))) &&
    Number.isFinite(frameW) &&
    Number.isFinite(frameH) &&
    frameW > 0 &&
    frameH > 0;

  if (!canAnnotate) {
    return respond(originalBuffer);
  }

  try {
    const image = sharp(originalBuffer);
    const { width: storedW, height: storedH } = await image.metadata();
    if (!storedW || !storedH) return respond(originalBuffer);

    // encode_frame() preserves aspect ratio, so one scalar covers both axes.
    const scale = storedW / frameW;

    const [rx1, ry1, rx2, ry2] = (bbox as unknown[]).map(Number);
    // Clamp into the image. YOLO boxes can sit a pixel or two outside the frame, and a
    // rect with negative origin renders as a stroke pinned to the edge.
    const x1 = Math.max(0, Math.min(storedW, rx1 * scale));
    const y1 = Math.max(0, Math.min(storedH, ry1 * scale));
    const x2 = Math.max(0, Math.min(storedW, rx2 * scale));
    const y2 = Math.max(0, Math.min(storedH, ry2 * scale));
    const w = x2 - x1;
    const h = y2 - y1;
    if (w <= 1 || h <= 1) return respond(originalBuffer);

    const { label, color } = labelFor(alert.violationType ?? meta?.violationType);
    const confidence = Number(meta?.confidence);
    const text = (
      Number.isFinite(confidence) ? `${label} ${Math.round(confidence * 100)}%` : label
    ).toUpperCase();

    // Scale the chrome with image size so a 1080p-sourced snapshot doesn't get a
    // hairline box, and a small one doesn't get a label wider than the subject.
    const stroke = Math.max(2, Math.round(storedW / 220));
    const fontSize = Math.max(10, Math.round(storedW / 40));
    const dash = stroke * 3;
    const padX = Math.round(fontSize * 0.7);
    const labelH = Math.round(fontSize * 1.9);
    // Monospace advance width is a reliable ~0.6em per glyph, so unlike a proportional
    // font this plate width is exact rather than estimated.
    const labelW = Math.round(text.length * fontSize * 0.6) + padX * 2;

    // Label sits centred beneath the box. Clamp horizontally so it never runs off the
    // edge, and flip it above the bottom edge when the detection touches the frame floor.
    const gap = Math.round(fontSize * 0.5);
    const labelX = Math.max(0, Math.min(storedW - labelW, x1 + w / 2 - labelW / 2));
    const labelY =
      y2 + gap + labelH > storedH ? Math.max(0, y2 - labelH - gap) : y2 + gap;

    const radius = Math.round(fontSize * 0.35);

    const svg = `<svg width="${storedW}" height="${storedH}" xmlns="http://www.w3.org/2000/svg">
  <rect x="${x1}" y="${y1}" width="${w}" height="${h}"
        fill="none" stroke="${color}" stroke-width="${stroke}"
        stroke-dasharray="${dash} ${dash}" stroke-linecap="round" rx="${radius}" />
  <rect x="${labelX}" y="${labelY}" width="${labelW}" height="${labelH}"
        fill="#0f1720" fill-opacity="0.85"
        stroke="${color}" stroke-width="${Math.max(1, Math.round(stroke / 2))}"
        rx="${radius}" />
  <text x="${labelX + labelW / 2}" y="${labelY + labelH - Math.round(fontSize * 0.55)}"
        text-anchor="middle"
        font-family="DejaVu Sans Mono, Menlo, Consolas, Liberation Mono, monospace"
        font-size="${fontSize}" font-weight="bold"
        letter-spacing="${(fontSize * 0.06).toFixed(2)}"
        fill="${color}">${escapeXml(text)}</text>
</svg>`;

    const annotated = await image
      .composite([{ input: Buffer.from(svg), top: 0, left: 0 }])
      .jpeg({ quality: 85 })
      .toBuffer();

    return respond(annotated);
  } catch (err) {
    // A failed annotation must never cost the user their evidence photo — the email
    // has already been sent pointing at this URL.
    console.error(`[snapshot] annotation failed for alert ${id}:`, err);
    return respond(originalBuffer);
  }
}

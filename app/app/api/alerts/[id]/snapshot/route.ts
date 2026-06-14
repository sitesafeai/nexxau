/**
 * GET /api/alerts/[id]/snapshot
 * Serves the detection snapshot JPEG for an alert.
 * Public endpoint — alert IDs are cryptographically random (cuid), unguessable.
 * The actual image bytes live in alert.metadata.snapshotData (base64 data URI).
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const alert = await prisma.alert.findUnique({
    where: { id },
    select: { metadata: true },
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

  const base64Data = dataUri.slice(commaIdx + 1);
  const imageBuffer = Buffer.from(base64Data, 'base64');

  return new NextResponse(imageBuffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(imageBuffer.byteLength),
      // Cache for 1 hour — snapshot never changes
      'Cache-Control': 'public, max-age=3600, immutable',
    },
  });
}

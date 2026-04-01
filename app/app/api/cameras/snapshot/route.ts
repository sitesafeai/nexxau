import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { uploadViolationSnapshot } from '@/lib/storage';
import { sendAlerts } from '@/lib/notifications';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { camera_id, snapshot } = await req.json();

    if (!camera_id || typeof camera_id !== 'string' || !snapshot || typeof snapshot !== 'string') {
      return NextResponse.json({ ok: true, skipped: 'missing camera_id or snapshot' });
    }

    // Wait for the detections route to create the alert (up to ~30s).
    let recentAlert: any = null;
    const attempts = 20;
    for (let i = 0; i < attempts; i++) {
      recentAlert = await prisma.alert.findFirst({
        where: {
          cameraId: camera_id,
          createdAt: { gte: new Date(Date.now() - 30_000) },
          detectionSnapshot: null,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentAlert) break;
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (!recentAlert) {
      return NextResponse.json({ ok: true, skipped: 'no recent alert' });
    }

    const snapshotUrl = await uploadViolationSnapshot(snapshot, camera_id, recentAlert.id);
    if (!snapshotUrl) return NextResponse.json({ ok: true, skipped: 'upload failed' });

    await prisma.alert.update({
      where: { id: recentAlert.id },
      data: { detectionSnapshot: snapshotUrl },
    });

    console.log('[Snapshot API] Saved snapshot for alert:', recentAlert.id);

    // Send email with snapshot (non-blocking) — isolated try/catch so snapshot success is not affected
    try {
      const camera = await prisma.camera.findUnique({
        where: { id: camera_id },
        include: { worksite: true },
      });
      if (camera) {
        const contacts = await prisma.alertContact.findMany({
          where: { worksiteId: camera.worksiteId, active: true },
        });
        if (contacts.length > 0) {
          const metadata = (recentAlert.metadata as Record<string, unknown>) || {};
          const confidence = (metadata.confidence as number) ?? 0.8;
          void Promise.allSettled(
            contacts
              .filter((c) => c.email)
              .map((c) =>
                sendAlerts(c.email!, {
                  cameraName: camera.name,
                  worksiteName: camera.worksite?.name ?? 'Unknown',
                  type: 'Person Detected',
                  confidence: Number(confidence) || 0.8,
                  timestamp:
                    recentAlert.createdAt?.toISOString?.() ?? new Date().toISOString(),
                  snapshotUrl,
                })
              )
          ).catch(() => {});
        }
      }
    } catch (emailErr) {
      // Email sending failed — snapshot was already saved, don't crash
      console.warn('[Snapshot API] Email send failed (non-fatal):', emailErr);
    }

    return NextResponse.json({ ok: true, snapshotUrl });
  } catch (err) {
    console.error('[Snapshot API] Error:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}


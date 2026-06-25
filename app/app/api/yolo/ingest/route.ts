/**
 * POST /api/yolo/ingest
 * Rule-based detection ingest from YOLO detection service.
 * Expects: { camera_id, violations: [{type, confidence, bbox}], frame_data }
 * Auth: Bearer INTERNAL_SERVICE_TOKEN
 *
 * Flow:
 *   1. Log every detection to DetectionLog (always)
 *   2. Load active CustomRules for this camera/worksite
 *   3. For each rule whose objectClass matches a detected violation:
 *      - Create SafetyViolation (always logged)
 *      - Create Alert record
 *      - Emit alertCreated event (in-app notifications)
 *      - Send Resend email to rule.emailRecipients if emailEnabled
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { isOnCooldown, setCooldown } from '@/app/lib/cooldown';
import { emitAlertCreated } from '@/app/lib/alert-events';
import { sendEmailAlert } from '@/lib/notifications';

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? '';

// Map custom-rule severity strings → AlertSeverity enum values
const SEVERITY_MAP: Record<string, 'HIGH' | 'MEDIUM' | 'LOW'> = {
  critical: 'HIGH',
  high:     'HIGH',
  medium:   'MEDIUM',
  low:      'LOW',
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (auth !== `Bearer ${INTERNAL_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { camera_id, violations, frame_data } = body as {
    camera_id: string;
    violations: { type?: string; confidence?: number; bbox?: number[] }[];
    frame_data?: string | null; // base64 JPEG data URI from YOLO service
  };

  if (!camera_id || !Array.isArray(violations) || violations.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const camera = await prisma.camera.findUnique({
    where: { id: camera_id },
    include: { worksite: true },
  });

  if (!camera) {
    return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
  }

  const now = new Date();

  // 0. Stamp lastSeenAt on the camera AND write a CameraHealth record so the
  //    health system knows this camera is online even when YOLO slows down.
  //    Both are fire-and-forget — never block detection logging.
  prisma.camera.update({
    where: { id: camera_id },
    data: {
      status: 'online',
      metadata: {
        ...((camera.metadata as Record<string, unknown>) ?? {}),
        lastSeenAt: now.toISOString(),
      },
    },
  }).catch((e) => console.warn('[ingest] camera status update failed:', e?.message));

  // Write a CameraHealth row — the CAMERA report picks the latest via
  // `orderBy: { lastCheck: 'desc' }, take: 1`.
  prisma.cameraHealth.create({
    data: {
      cameraId:  camera_id,
      status:    'ONLINE',
      lastCheck: now,
    },
  }).catch((e) => console.warn('[ingest] cameraHealth write failed:', e?.message));

  // Prune old CameraHealth rows (~1% of requests) to prevent table bloat
  if (Math.random() < 0.01) {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    prisma.cameraHealth
      .deleteMany({ where: { lastCheck: { lt: cutoff } } })
      .catch(() => {});
  }

  // 1. Log every detection to DetectionLog
  for (const v of violations) {
    await prisma.detectionLog.create({
      data: {
        cameraId:    camera_id,
        worksiteId:  camera.worksiteId,
        type:        v.type ?? 'unknown',
        confidence:  Number(v.confidence) || 0,
        bbox:        v.bbox ?? [],
        frameData:   frame_data ?? null,
        timestamp:   now,
      },
    });
  }

  // 2. Load active CustomRules scoped to this camera or its worksite
  const customRules = await prisma.customRule.findMany({
    where: {
      isActive: true,
      OR: [
        // New: rule explicitly lists this camera in cameraIds array
        { cameraIds: { has: camera_id } },
        // Backward compat: old single-camera rules
        { cameraId: camera_id },
        // Global rules: scoped to this worksite with no specific cameras set
        { worksiteId: camera.worksiteId, cameraId: null, cameraIds: { isEmpty: true } },
      ],
    },
  });

  // 3. Evaluate each rule against the incoming violations
  for (const rule of customRules) {
    const criteria      = rule.detectionCriteria as Record<string, any>;
    const targetClass   = criteria?.objectClass as string | undefined;
    const minConf       = rule.confidenceThreshold ?? 0.5;

    if (!targetClass) continue;

    // Find a matching detection with sufficient confidence
    const match = violations.find(
      (v: { type?: string; confidence?: number }) =>
        v.type === targetClass && (v.confidence ?? 0) >= minConf
    );
    if (!match) continue;

    // Per-rule cooldown so we don't flood notifications
    const cooldownKey = `${camera_id}:rule:${rule.id}`;
    if (isOnCooldown(camera_id, cooldownKey)) continue;
    setCooldown(camera_id, cooldownKey);

    const conf     = match.confidence as number;
    const severity = SEVERITY_MAP[(rule.severity ?? 'medium').toLowerCase()] ?? 'MEDIUM';

    // Always log a SafetyViolation record
    await prisma.safetyViolation.create({
      data: {
        cameraId:      camera_id,
        worksiteId:    camera.worksiteId,
        violationType: targetClass,
        severity:      rule.severity?.toLowerCase() ?? 'medium',
        location:      camera.zone ?? camera.name,
        description:   rule.name,
        confidence:    conf,
        detectedAt:    now,
      },
    });

    // Always create an Alert record
    const alert = await prisma.alert.create({
      data: {
        title:        rule.name,
        description:  `${rule.name} detected on ${camera.name} (${Math.round(conf * 100)}% confidence)`,
        severity,
        status:       'ACTIVE',
        source:       'yolo_detection',
        location:     camera.zone ?? camera.name,
        worksiteId:   camera.worksiteId,
        cameraId:     camera_id,
        violationType: targetClass,
        metadata: {
          cameraId:    camera_id,
          cameraName:  camera.name,
          confidence:  conf,
          ruleId:      rule.id,
          ruleName:    rule.name,
          // store raw base64 here so snapshot endpoint can serve it
          snapshotData: frame_data ?? null,
        },
      },
    });

    // Back-fill detectionSnapshot with the URL to serve it (we now have the alert id)
    if (frame_data) {
      await prisma.alert.update({
        where: { id: alert.id },
        data: { detectionSnapshot: `/api/alerts/${alert.id}/snapshot` },
      });
    }

    // Emit for in-app notifications
    emitAlertCreated({
      id:          alert.id,
      title:       alert.title,
      description: alert.description,
      severity:    alert.severity,
      source:      alert.source,
      location:    alert.location ?? null,
      worksiteId:  alert.worksiteId ?? camera.worksiteId,
      status:      alert.status,
      metadata:    (alert.metadata as Record<string, any>) ?? {},
      createdAt:   alert.createdAt.toISOString(),
    });

    // Send email to rule's recipients + ALERT_EMAIL fallback.
    // ALERT_EMAIL env var is the catch-all for when no recipients are set on the rule
    // (also works around Resend's single-verified-address restriction in test mode).
    const ruleRecipients = Array.isArray(rule.emailRecipients)
      ? (rule.emailRecipients as string[]).filter(Boolean)
      : [];
    const fallbackEmail = process.env.ALERT_EMAIL?.trim();
    const allRecipients = fallbackEmail
      ? [...new Set([...ruleRecipients, fallbackEmail])]
      : ruleRecipients;

    console.log(`[ingest] rule ${rule.id} matched — allRecipients: [${allRecipients.join(', ')}], ALERT_EMAIL env: ${process.env.ALERT_EMAIL ?? '(not set)'}`);

    if (allRecipients.length > 0) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
      const snapshotUrl = frame_data ? `${appUrl}/api/alerts/${alert.id}/snapshot` : undefined;
      sendEmailAlert(allRecipients, {
        cameraName:   camera.name,
        worksiteName: camera.worksite?.name ?? 'Unknown Worksite',
        type:         targetClass,
        confidence:   conf,
        timestamp:    now.toISOString(),
        snapshotUrl,
      }).then((ok) => {
        if (ok) {
          console.log(`[ingest] ✅ Alert email sent for rule ${rule.id} to: ${allRecipients.join(', ')}`);
        } else {
          console.error(`[ingest] ❌ Alert email FAILED for rule ${rule.id}`);
        }
      }).catch((err) =>
        console.error(`[ingest] ❌ Alert email exception for rule ${rule.id}:`, err)
      );
    } else {
      console.log(`[ingest] ⚠️  No email recipients for rule ${rule.id} — ALERT_EMAIL not set in Railway env vars, and rule has no emailRecipients. Skipping email.`);
    }
  }

  return NextResponse.json({ ok: true });
}

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
import { sendAlertNotificationEmail } from '@/app/lib/email-service';

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
  const { camera_id, violations, frame_data } = body;

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
        { cameraId: camera_id },
        { worksiteId: camera.worksiteId, cameraId: null },
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
          cameraId:   camera_id,
          cameraName: camera.name,
          confidence: conf,
          ruleId:     rule.id,
          ruleName:   rule.name,
        },
      },
    });

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
      const alertUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/dashboard/alerts?worksite=${camera.worksiteId}`;
      sendAlertNotificationEmail(
        allRecipients,
        alert.title,
        alert.location ?? camera.name,
        alert.severity,
        now,
        alertUrl
      ).then((result) => {
        if (result.success) {
          console.log(`[ingest] ✅ Alert email sent for rule ${rule.id} to: ${allRecipients.join(', ')}`);
        } else {
          console.error(`[ingest] ❌ Alert email FAILED for rule ${rule.id}: ${result.error}`);
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

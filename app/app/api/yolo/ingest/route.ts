/**
 * POST /api/yolo/ingest
 * Rule-based detection ingest from YOLO detection service.
 * Expects: { camera_id, violations: [{type, confidence, bbox}], frame_data }
 * Auth: Bearer INTERNAL_SERVICE_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { isOnCooldown, setCooldown } from '@/app/lib/cooldown';
import {
  sendBothAlerts,
  sendSMSAlert,
  sendWhatsAppAlert,
  type AlertPayload,
} from '@/app/lib/twilio';

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const internalToken = process.env.INTERNAL_SERVICE_TOKEN;
  if (!internalToken || auth !== `Bearer ${internalToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { camera_id, violations, frame_data } = body;

  if (!camera_id || !Array.isArray(violations) || violations.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const camera = await prisma.camera.findUnique({
    where: { id: camera_id },
    include: {
      worksite: {
        include: { alertContacts: { where: { active: true } } },
      },
      rules: { where: { enabled: true } },
    },
  });

  if (!camera) {
    return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
  }

  const now = new Date();
  const detectedTypes = new Set(
    violations.map((v: { type?: string }) => v.type as string)
  );

  // Log every detection to DetectionLog
  for (const v of violations) {
    await prisma.detectionLog.create({
      data: {
        cameraId: camera_id,
        worksiteId: camera.worksiteId,
        type: v.type ?? 'unknown',
        confidence: Number(v.confidence) || 0,
        bbox: v.bbox ?? [],
        frameData: frame_data ?? null,
        timestamp: now,
      },
    });
  }

  // Evaluate each enabled rule
  for (const rule of camera.rules) {
    const ifMet = detectedTypes.has(rule.ifCondition);
    const andMet = rule.andCondition
      ? detectedTypes.has(rule.andCondition)
      : true;

    if (!ifMet || !andMet) continue;

    const cooldownKey = `${camera_id}:${rule.id}`;
    if (isOnCooldown(camera_id, cooldownKey)) continue;
    setCooldown(camera_id, cooldownKey);

    const relevantViolation = violations.find(
      (v: { type?: string }) =>
        v.type === rule.ifCondition || v.type === rule.andCondition
    );
    const conf = relevantViolation?.confidence ?? 1;

    await prisma.safetyViolation.create({
      data: {
        cameraId: camera_id,
        worksiteId: camera.worksiteId,
        ruleId: rule.id,
        violationType: rule.andCondition ?? rule.ifCondition ?? rule.name,
        severity: 'high',
        location: camera.zone ?? camera.name,
        description: rule.name,
        confidence: conf,
        detectedAt: now,
      },
    });

    if (rule.thenAction === 'log_only') continue;

    const payload: AlertPayload = {
      cameraName: camera.name,
      worksiteName: camera.worksite.name,
      violationType: rule.name,
      confidence: conf,
      timestamp: now.toISOString(),
    };

    for (const contact of camera.worksite.alertContacts) {
      if (rule.thenAction === 'sms') {
        sendSMSAlert(contact.phone, payload).catch(console.error);
      } else if (rule.thenAction === 'whatsapp') {
        sendWhatsAppAlert(contact.phone, payload).catch(console.error);
      } else {
        sendBothAlerts(contact.phone, payload).catch(console.error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}

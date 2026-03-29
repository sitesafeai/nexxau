import { emitAlertCreated, type AlertEventPayload } from './alert-events';

export interface NexxauPpeViolation {
  // Optional externally supplied ID (used for deduplication if provided).
  id?: string;
  worksiteId: string;
  cameraId: string;
  details: string;
  userId?: string;
  timestamp?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location?: string | null;
  confidence?: number;
  detectedObjects?: Array<{ class: string; confidence?: number }>;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const toIsoTimestamp = (value?: string): string => {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    console.warn('[Nexxau] Invalid timestamp received, using now:', value);
    return new Date().toISOString();
  }
  return parsed.toISOString();
};

const normalizeDetectedObjects = (
  detectedObjects?: NexxauPpeViolation['detectedObjects']
): Array<{ class: string; confidence?: number }> | undefined => {
  if (!Array.isArray(detectedObjects)) return undefined;
  const normalized = detectedObjects
    .filter((item) => item && isNonEmptyString(item.class))
    .map((item) => ({
      class: item.class.trim(),
      confidence: typeof item.confidence === 'number' ? item.confidence : undefined,
    }));
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeSeverity = (
  severity?: NexxauPpeViolation['severity']
): AlertEventPayload['severity'] => {
  const value = (severity || 'HIGH').toUpperCase();
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH' || value === 'CRITICAL') {
    return value;
  }
  return 'HIGH';
};

export function publishNexxauPpeAlert(violation: NexxauPpeViolation): AlertEventPayload | null {
  // Step 1: Validate critical identifiers and normalize fields.
  const worksiteId = isNonEmptyString(violation.worksiteId)
    ? violation.worksiteId.trim()
    : null;
  const cameraId = isNonEmptyString(violation.cameraId)
    ? violation.cameraId.trim()
    : null;

  if (!worksiteId || !cameraId) {
    console.warn('[Nexxau] Missing worksiteId or cameraId, skipping alert:', {
      worksiteId: violation.worksiteId,
      cameraId: violation.cameraId,
    });
    return null;
  }

  const description = isNonEmptyString(violation.details)
    ? violation.details.trim()
    : 'PPE violation detected';

  const metadata: Record<string, any> = {
    cameraId,
  };

  if (isNonEmptyString(violation.userId)) metadata.userId = violation.userId.trim();
  if (typeof violation.confidence === 'number') metadata.confidence = violation.confidence;

  const normalizedObjects = normalizeDetectedObjects(violation.detectedObjects);
  if (normalizedObjects) metadata.detectedObjects = normalizedObjects;

  // Step 2: Build the alert payload in the exact schema the SSE stream expects.
  const alert: AlertEventPayload = {
    id: isNonEmptyString(violation.id) ? violation.id.trim() : crypto.randomUUID(),
    title: 'PPE Violation',
    description,
    severity: normalizeSeverity(violation.severity),
    source: 'nexxau',
    location: isNonEmptyString(violation.location) ? violation.location.trim() : null,
    worksiteId,
    status: 'ACTIVE',
    metadata,
    createdAt: toIsoTimestamp(violation.timestamp),
  };

  // Step 3: Emit into the shared alert event bus consumed by /api/alerts/stream.
  try {
    emitAlertCreated(alert);
  } catch (error) {
    console.error('[Nexxau] Failed to emit alert event:', error);
  }

  return alert;
}

export function handleNexxauYoloViolation(raw: unknown): AlertEventPayload | null {
  // Step 1: Guard against malformed payloads.
  if (!raw || typeof raw !== 'object') {
    console.warn('[Nexxau] Invalid YOLO violation payload received:', raw);
    return null;
  }

  // Step 2: Treat the raw object as a Nexxau violation and publish it.
  return publishNexxauPpeAlert(raw as NexxauPpeViolation);
}

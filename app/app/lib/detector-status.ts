/**
 * Last-known model state of the YOLO detection service.
 *
 * The detector (ai-detection/railway_service.py) is a pure client — it has no inbound
 * HTTP server, so the app cannot query it. Instead it attaches a `service` block to the
 * heartbeat it already sends every HEARTBEAT_INTERVAL_SEC (30s), and we hold the latest
 * one here.
 *
 * Deliberately in-memory rather than a Prisma table: this is diagnostic state that is
 * fully refreshed every 30 seconds, so persisting it would mean a DB write per heartbeat
 * to store something that is stale the moment the detector redeploys. Consequences:
 *   - After an app deploy it reads "waiting for heartbeat" for up to 30s. Expected.
 *   - If the app ever runs more than one replica, a heartbeat lands on one instance and
 *     a page request may hit another, so the panel can show stale/empty on some loads.
 *     Single replica on Railway today; revisit with a table if that changes.
 */

export interface DetectorModelInfo {
  detector?: {
    configured?: string;
    loaded?: string;
    sha256?: string | null;
    size_mb?: number | null;
    classes?: number;
    is_coco_fallback?: boolean;
    confidence_floor?: number;
  };
  vest_classifier?: {
    active?: boolean;
    loaded?: string;
    sha256?: string | null;
    size_mb?: number | null;
    threshold?: number;
    names?: Record<string, string>;
    source?: string;
  };
}

export interface DetectorStatus {
  info: DetectorModelInfo;
  /** When the detector last told us. */
  reportedAt: string;
  /** Seconds since that report — the UI uses this to decide if the service is alive. */
  ageSeconds: number;
}

let cached: { info: DetectorModelInfo; reportedAt: Date } | null = null;

export function setDetectorStatus(info: unknown): void {
  if (!info || typeof info !== 'object' || Array.isArray(info)) return;
  const candidate = info as DetectorModelInfo;
  // Only accept payloads that carry a detector block — an older detector build that
  // doesn't send `service` must not blank out a good reading.
  if (!candidate.detector) return;
  cached = { info: candidate, reportedAt: new Date() };
}

export function getDetectorStatus(): DetectorStatus | null {
  if (!cached) return null;
  return {
    info: cached.info,
    reportedAt: cached.reportedAt.toISOString(),
    ageSeconds: Math.round((Date.now() - cached.reportedAt.getTime()) / 1000),
  };
}

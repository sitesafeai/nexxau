/**
 * Camera Status Helper
 *
 * Derives camera online status from health/heartbeat data when available,
 * falling back to the camera.status string field when no health records exist.
 *
 * Rules (in priority order):
 * 1. If CameraHealth record exists and is < 60s old → use it (authoritative)
 * 2. If no health record → fall back to camera.status string ('online' / 'ONLINE')
 *
 * Why the fallback:
 * - CameraHealth records are written by a heartbeat writer that may not be running.
 * - Without the fallback, every camera appears offline until the heartbeat service starts.
 * - The status string is set when a camera connects or is manually configured, so it
 *   reflects a reasonable last-known state when no heartbeat data is available.
 */

import { prisma } from '@/app/lib/prisma';

export interface CameraWithHealth {
  id: string;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
  health?: Array<{
    status: string;
    lastCheck: Date;
  }>;
}

/**
 * Determine if a camera is online based on health data
 * 
 * @param camera - Camera object with health records
 * @returns true if camera is online, false otherwise
 * 
 * Logic:
 * - Checks latest CameraHealth record (most recent health check)
 * - Online if: status === 'ONLINE' AND lastCheck < 60 seconds ago
 * - Offline if: no health record OR status !== 'ONLINE' OR lastCheck > 60 seconds ago
 * 
 * Why 60 seconds:
 * - Health checks should occur at least every 30-60 seconds
 * - If no check in 60s, camera is likely offline or health system is down
 * - This threshold balances responsiveness with network delay tolerance
 * 
 * Note: This function IGNORES camera.status string field for reliability
 */
/** Cameras seen by the YOLO service within this many milliseconds are online. */
const SEEN_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export function isCameraOnline(camera: CameraWithHealth): boolean {
  // --- Path 1: authoritative CameraHealth record (heartbeat writer) ---
  // If a health record exists (even a stale one), it is authoritative — we do
  // NOT fall through to the status string, because camera.status = 'online'
  // may be a stale value from the last heartbeat that stopped arriving.
  if (camera.health && camera.health.length > 0) {
    const latestHealth = camera.health[0];
    if (latestHealth.status !== 'ONLINE') {
      return false;
    }
    const secondsSinceCheck =
      (Date.now() - new Date(latestHealth.lastCheck).getTime()) / 1000;
    return secondsSinceCheck < 60;
  }

  // --- Path 2: YOLO ingest lastSeenAt stamp in camera metadata ---
  // If lastSeenAt exists (stale or fresh) it is authoritative — stale means
  // the camera stopped sending frames, so return false instead of falling through.
  if (camera.metadata && typeof camera.metadata === 'object') {
    const lastSeenAt = (camera.metadata as Record<string, unknown>).lastSeenAt;
    if (lastSeenAt) {
      const msAgo = Date.now() - new Date(lastSeenAt as string).getTime();
      return msAgo < SEEN_WINDOW_MS;
    }
  }

  // --- No reliable data: treat as offline ---
  // camera.status is not trustworthy here:
  //   - 'active' is the DB default for cameras that have never connected
  //   - 'online' may be stale (set by a past heartbeat that since stopped)
  // Without a recent health record or lastSeenAt we cannot confirm the camera
  // is online, so we return false rather than mislead the KPI counter.
  return false;
}

/**
 * Get camera online status for a worksite
 * 
 * @param worksiteId - Worksite identifier
 * @returns Object with online/offline counts
 */
export async function getCameraStatusMetrics(worksiteId: string): Promise<{
  online: number;
  offline: number;
  total: number;
}> {
  const cameras = await prisma.camera.findMany({
    where: { worksiteId },
    include: {
      health: {
        orderBy: { lastCheck: 'desc' },
        take: 1 // Only need latest health record
      }
    }
  });
  
  let online = 0;
  let offline = 0;
  
  for (const camera of cameras) {
    if (isCameraOnline(camera)) {
      online++;
    } else {
      offline++;
    }
  }
  
  return {
    online,
    offline,
    total: cameras.length
  };
}


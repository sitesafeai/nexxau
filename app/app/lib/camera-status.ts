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
  // The ingest route writes `metadata.lastSeenAt` whenever it processes a
  // detection for this camera, giving us a real "last known streaming" time.
  if (camera.metadata && typeof camera.metadata === 'object') {
    const lastSeenAt = (camera.metadata as Record<string, unknown>).lastSeenAt;
    if (lastSeenAt) {
      const msAgo = Date.now() - new Date(lastSeenAt as string).getTime();
      if (msAgo < SEEN_WINDOW_MS) {
        return true;
      }
    }
  }

  // --- Path 3: status string fallback ---
  // Camera.status defaults to 'active' (schema default) and is also set to
  // 'online' by some paths. Treat both as "intended to be online."
  // A camera will only have status 'offline' or 'inactive' if explicitly set.
  const s = camera.status?.toLowerCase();
  return s === 'online' || s === 'active';
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


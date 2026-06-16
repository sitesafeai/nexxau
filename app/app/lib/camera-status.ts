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
  status?: string | null; // Ignored for online calculation
  health?: Array<{
    status: string;
    lastCheck: Date;
  }>;
  // Future: lastHlsSegmentAt?: Date;
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
export function isCameraOnline(camera: CameraWithHealth): boolean {
  // --- Path 1: authoritative health record ---
  if (camera.health && camera.health.length > 0) {
    const latestHealth = camera.health[0];
    if (latestHealth.status !== 'ONLINE') {
      return false;
    }
    const now = new Date();
    const lastCheck = new Date(latestHealth.lastCheck);
    const secondsSinceCheck = (now.getTime() - lastCheck.getTime()) / 1000;
    return secondsSinceCheck < 60;
  }

  // --- Path 2: no health records — fall back to camera.status string ---
  // This covers the common case where the heartbeat writer hasn't run yet.
  const s = camera.status?.toLowerCase();
  return s === 'online';
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


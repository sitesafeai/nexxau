/**
 * Camera Status Helper
 * 
 * Derives camera online status from health/heartbeat data, NOT from string status field.
 * 
 * Rules:
 * - Camera is "online" if: lastHealthHeartbeat < NOW - 60s OR lastHlsSegmentAt < NOW - 30s
 * - Camera is "offline" if: no recent health check OR health check indicates offline
 * - Status string field is IGNORED for metrics (unreliable)
 * 
 * This ensures metrics reflect real camera health, not potentially stale status strings.
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
  // If no health records, camera is offline
  if (!camera.health || camera.health.length === 0) {
    return false;
  }
  
  // Get most recent health check
  const latestHealth = camera.health[0];
  if (!latestHealth) {
    return false;
  }
  
  // Check if health status is ONLINE
  if (latestHealth.status !== 'ONLINE') {
    return false;
  }
  
  // Check if last health check was within last 60 seconds
  const now = new Date();
  const lastCheck = new Date(latestHealth.lastCheck);
  const secondsSinceCheck = (now.getTime() - lastCheck.getTime()) / 1000;
  
  // Camera is online if health check was within 60 seconds
  return secondsSinceCheck < 60;
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


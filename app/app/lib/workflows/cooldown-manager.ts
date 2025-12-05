/**
 * Cooldown Manager - Prevents alert spam
 * 
 * Implements per-camera and per-violation cooldowns to prevent hammering users
 * Independent from storm mode - this is noise suppression at the source
 */

import { prisma } from '../prisma';

export const COOLDOWN_DEFAULTS = {
  PER_CAMERA_TYPE: 120,        // 120 seconds between same violation type from same camera
  PER_VIOLATION_ZONE: 180,     // 180 seconds between same violation in same zone
  MIN_CONFIDENCE: 0.65,        // Below this = low confidence, longer cooldown
};

export class CooldownManager {
  /**
   * Check if alert should be suppressed due to cooldown
   */
  async shouldSuppress(alert: any): Promise<{ suppress: boolean; reason?: string }> {
    // Check camera + violation type cooldown
    if (alert.cameraId && alert.violationType) {
      const lastSimilar = await prisma.alert.findFirst({
        where: {
          cameraId: alert.cameraId,
          violationType: alert.violationType,
          createdAt: {
            gte: new Date(Date.now() - COOLDOWN_DEFAULTS.PER_CAMERA_TYPE * 1000)
          },
          id: {
            not: alert.id
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (lastSimilar) {
        const secondsAgo = (Date.now() - new Date(lastSimilar.createdAt).getTime()) / 1000;
        return {
          suppress: true,
          reason: `Cooldown active: Same violation from camera ${alert.cameraId} ${Math.round(secondsAgo)}s ago`
        };
      }
    }

    // Check zone + violation cooldown
    if (alert.location && alert.violationType) {
      const lastSimilar = await prisma.alert.findFirst({
        where: {
          worksiteId: alert.worksiteId,
          location: alert.location,
          violationType: alert.violationType,
          createdAt: {
            gte: new Date(Date.now() - COOLDOWN_DEFAULTS.PER_VIOLATION_ZONE * 1000)
          },
          id: {
            not: alert.id
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (lastSimilar) {
        const secondsAgo = (Date.now() - new Date(lastSimilar.createdAt).getTime()) / 1000;
        return {
          suppress: true,
          reason: `Cooldown active: Same violation in zone ${alert.location} ${Math.round(secondsAgo)}s ago`
        };
      }
    }

    return { suppress: false };
  }

  /**
   * Get cooldown duration based on confidence
   */
  getCooldownDuration(confidence: number | null): number {
    if (!confidence) return COOLDOWN_DEFAULTS.PER_CAMERA_TYPE;

    // Low confidence = longer cooldown
    if (confidence < COOLDOWN_DEFAULTS.MIN_CONFIDENCE) {
      return COOLDOWN_DEFAULTS.PER_CAMERA_TYPE * 2; // 240 seconds
    }

    return COOLDOWN_DEFAULTS.PER_CAMERA_TYPE;
  }
}

export const cooldownManager = new CooldownManager();


/**
 * Camera Health Monitor
 * 
 * Detects camera flapping, bitrate loss, low-light, and obstruction
 * Escalates to prevent silent failures
 */

import { prisma } from '../prisma';

export const CAMERA_HEALTH_DEFAULTS = {
  FLAP_THRESHOLD: 3,           // 3 state changes in window = flapping
  FLAP_WINDOW_MINUTES: 15,     // Within 15 minutes
  OBSTRUCTION_MINUTES: 3,       // Dark/obstructed for 3 minutes = issue
  BITRATE_THRESHOLD: 0.5,      // 50% bitrate loss = degraded
};

export class CameraHealthMonitor {
  /**
   * Check for camera flapping (online/offline/online)
   */
  async detectFlapping(cameraId: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - CAMERA_HEALTH_DEFAULTS.FLAP_WINDOW_MINUTES * 60 * 1000);

    // Get recent camera health records
    const healthRecords = await prisma.cameraHealth.findMany({
      where: {
        cameraId,
        createdAt: {
          gte: windowStart
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (healthRecords.length < CAMERA_HEALTH_DEFAULTS.FLAP_THRESHOLD) {
      return false;
    }

    // Count state changes
    let stateChanges = 0;
    let lastStatus = healthRecords[0]?.status;

    for (let i = 1; i < healthRecords.length; i++) {
      if (healthRecords[i].status !== lastStatus) {
        stateChanges++;
        lastStatus = healthRecords[i].status;
      }
    }

    if (stateChanges >= CAMERA_HEALTH_DEFAULTS.FLAP_THRESHOLD) {
      console.log(`[Camera Health] Flapping detected for camera ${cameraId}: ${stateChanges} state changes`);
      return true;
    }

    return false;
  }

  /**
   * Check for camera obstruction or low-light
   */
  async detectObstruction(cameraId: string): Promise<boolean> {
    const windowStart = new Date(Date.now() - CAMERA_HEALTH_DEFAULTS.OBSTRUCTION_MINUTES * 60 * 1000);

    const recentHealth = await prisma.cameraHealth.findMany({
      where: {
        cameraId,
        createdAt: {
          gte: windowStart
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });

    // Check if consistently dark or low quality
    const darkCount = recentHealth.filter(h => 
      h.metadata && (h.metadata as any).isDark === true
    ).length;

    const lowQualityCount = recentHealth.filter(h => 
      h.streamQuality === 'poor' || h.streamQuality === 'degraded'
    ).length;

    if (darkCount >= 3 || lowQualityCount >= 3) {
      console.log(`[Camera Health] Obstruction/low-light detected for camera ${cameraId}`);
      return true;
    }

    return false;
  }

  /**
   * Check for bitrate loss
   */
  async detectBitrateLoss(cameraId: string): Promise<boolean> {
    // Get recent health records directly
    const healthRecords = await prisma.cameraHealth.findMany({
      where: {
        cameraId,
        createdAt: {
          gte: new Date(Date.now() - 15 * 60 * 1000) // Last 15 minutes
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    if (healthRecords.length === 0) {
      return false;
    }

    // Check if frame rate is consistently low
    const avgFrameRate = healthRecords.reduce((sum, h) => sum + (h.frameRate || 0), 0) / healthRecords.length;
    const expectedFrameRate = 30; // Assume 30 FPS is expected

    if (avgFrameRate < expectedFrameRate * CAMERA_HEALTH_DEFAULTS.BITRATE_THRESHOLD) {
      console.log(`[Camera Health] Bitrate loss detected for camera ${cameraId}: ${avgFrameRate.toFixed(1)} FPS`);
      return true;
    }

    return false;
  }

  /**
   * Handle camera health issues
   */
  async handleHealthIssue(cameraId: string, issue: 'flapping' | 'obstruction' | 'bitrate'): Promise<void> {
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: {
        worksite: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!camera) return;

    const severity = issue === 'flapping' ? 'MODERATE' : 'SEVERE';
    const title = issue === 'flapping' 
      ? `Camera Flapping: ${camera.name}`
      : issue === 'obstruction'
      ? `Camera Obstruction/Low-Light: ${camera.name}`
      : `Camera Bitrate Loss: ${camera.name}`;

    const description = issue === 'flapping'
      ? `Camera ${camera.name} is flapping (online/offline repeatedly). Requires immediate attention.`
      : issue === 'obstruction'
      ? `Camera ${camera.name} appears obstructed or in low-light conditions. Maintenance required.`
      : `Camera ${camera.name} experiencing significant bitrate loss. Stream quality degraded.`;

    // Create maintenance alert
    await prisma.alert.create({
      data: {
        title,
        description,
        severity: severity as any,
        status: 'ACTIVE',
        source: 'camera_health',
        location: camera.location || 'Unknown',
        worksiteId: camera.worksiteId,
        cameraId: camera.id,
        metadata: {
          healthIssue: issue,
          cameraName: camera.name,
          requiresMaintenance: true
        } as any
      }
    });

    // If flapping, escalate to supervisor
    if (issue === 'flapping') {
      // Find escalation chain
      const chain = await prisma.escalationChain.findFirst({
        where: {
          worksiteId: camera.worksiteId,
          enabled: true
        }
      });

      if (chain) {
        // Create escalation with shorter delay for camera issues
        await prisma.escalation.create({
          data: {
            alertId: (await prisma.alert.findFirst({
              where: {
                cameraId,
                source: 'camera_health',
                createdAt: {
                  gte: new Date(Date.now() - 60 * 1000)
                }
              },
              orderBy: { createdAt: 'desc' }
            }))?.id || '',
            chainId: chain.id,
            currentLevel: 1,
            status: 'pending',
            notifications: [] as any
          }
        });
      }
    }

    console.log(`[Camera Health] Created ${severity} alert for camera ${cameraId}: ${issue}`);
  }
}

export const cameraHealthMonitor = new CameraHealthMonitor();


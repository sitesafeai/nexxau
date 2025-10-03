import { prisma } from './prisma';
import { NotificationService } from './notification-service';

export interface CameraHealthData {
  cameraId: string;
  status: 'ONLINE' | 'OFFLINE' | 'DEGRADED' | 'ERROR' | 'MAINTENANCE';
  streamQuality?: number;
  frameRate?: number;
  resolution?: string;
  bitrate?: number;
  latency?: number;
  errors?: any[];
}

export class CameraHealthMonitor {
  /**
   * Update camera health status
   */
  static async updateCameraHealth(data: CameraHealthData): Promise<any> {
    try {
      const healthRecord = await prisma.cameraHealth.upsert({
        where: { cameraId: data.cameraId },
        update: {
          status: data.status,
          streamQuality: data.streamQuality,
          frameRate: data.frameRate,
          resolution: data.resolution,
          bitrate: data.bitrate,
          latency: data.latency,
          errors: data.errors,
          lastCheck: new Date(),
        },
        create: {
          cameraId: data.cameraId,
          status: data.status,
          streamQuality: data.streamQuality,
          frameRate: data.frameRate,
          resolution: data.resolution,
          bitrate: data.bitrate,
          latency: data.latency,
          errors: data.errors,
          lastCheck: new Date(),
        },
      });

      // Check for status changes and send notifications
      await this.checkStatusChange(data.cameraId, data.status);

      return healthRecord;
    } catch (error) {
      console.error('Error updating camera health:', error);
      throw error;
    }
  }

  /**
   * Check for camera status changes and send notifications
   */
  static async checkStatusChange(cameraId: string, newStatus: string): Promise<void> {
    try {
      const camera = await prisma.camera.findUnique({
        where: { id: cameraId },
        include: {
          worksite: {
            include: {
              users: {
                where: {
                  role: {
                    in: ['admin', 'site-manager'],
                  },
                },
              },
            },
          },
        },
      });

      if (!camera) return;

      // Get previous health record
      const previousHealth = await prisma.cameraHealth.findFirst({
        where: { cameraId },
        orderBy: { lastCheck: 'desc' },
        skip: 1, // Skip the most recent record
      });

      if (!previousHealth || previousHealth.status === newStatus) {
        return; // No status change
      }

      // Send notifications to site managers and admins
      const userIds = camera.worksite.users.map(user => user.id);
      
      if (newStatus === 'OFFLINE') {
        await NotificationService.createBulkNotifications(userIds, {
          title: `Camera Offline: ${camera.name}`,
          message: `Camera "${camera.name}" at ${camera.location || 'unknown location'} has gone offline.`,
          type: 'SYSTEM',
          priority: 'HIGH',
          metadata: {
            cameraId,
            cameraName: camera.name,
            location: camera.location,
            previousStatus: previousHealth.status,
            newStatus,
            timestamp: new Date().toISOString(),
          },
        });
      } else if (newStatus === 'ERROR') {
        await NotificationService.createBulkNotifications(userIds, {
          title: `Camera Error: ${camera.name}`,
          message: `Camera "${camera.name}" is experiencing errors and may not be functioning properly.`,
          type: 'SYSTEM',
          priority: 'HIGH',
          metadata: {
            cameraId,
            cameraName: camera.name,
            location: camera.location,
            previousStatus: previousHealth.status,
            newStatus,
            timestamp: new Date().toISOString(),
          },
        });
      } else if (newStatus === 'ONLINE' && previousHealth.status === 'OFFLINE') {
        await NotificationService.createBulkNotifications(userIds, {
          title: `Camera Restored: ${camera.name}`,
          message: `Camera "${camera.name}" is back online and functioning normally.`,
          type: 'SYSTEM',
          priority: 'MEDIUM',
          metadata: {
            cameraId,
            cameraName: camera.name,
            location: camera.location,
            previousStatus: previousHealth.status,
            newStatus,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('Error checking camera status change:', error);
    }
  }

  /**
   * Get camera health summary for a worksite
   */
  static async getWorksiteHealthSummary(worksiteId: string) {
    try {
      const cameras = await prisma.camera.findMany({
        where: { worksiteId },
        include: {
          health: {
            orderBy: { lastCheck: 'desc' },
            take: 1,
          },
        },
      });

      const summary = {
        total: cameras.length,
        online: 0,
        offline: 0,
        degraded: 0,
        error: 0,
        maintenance: 0,
        unknown: 0,
        averageQuality: 0,
        totalErrors: 0,
      };

      let totalQuality = 0;
      let qualityCount = 0;

      cameras.forEach(camera => {
        const health = camera.health[0];
        if (!health) {
          summary.unknown++;
          return;
        }

        switch (health.status) {
          case 'ONLINE':
            summary.online++;
            break;
          case 'OFFLINE':
            summary.offline++;
            break;
          case 'DEGRADED':
            summary.degraded++;
            break;
          case 'ERROR':
            summary.error++;
            break;
          case 'MAINTENANCE':
            summary.maintenance++;
            break;
        }

        if (health.streamQuality !== null) {
          totalQuality += health.streamQuality;
          qualityCount++;
        }

        if (health.errors && Array.isArray(health.errors)) {
          summary.totalErrors += health.errors.length;
        }
      });

      summary.averageQuality = qualityCount > 0 ? totalQuality / qualityCount : 0;

      return summary;
    } catch (error) {
      console.error('Error getting worksite health summary:', error);
      throw error;
    }
  }

  /**
   * Get camera health trends over time
   */
  static async getCameraHealthTrends(cameraId: string, days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const healthRecords = await prisma.cameraHealth.findMany({
        where: {
          cameraId,
          lastCheck: {
            gte: startDate,
          },
        },
        orderBy: { lastCheck: 'asc' },
        select: {
          status: true,
          streamQuality: true,
          frameRate: true,
          latency: true,
          lastCheck: true,
        },
      });

      return healthRecords;
    } catch (error) {
      console.error('Error getting camera health trends:', error);
      throw error;
    }
  }

  /**
   * Check for cameras that haven't been checked recently
   */
  static async checkStaleCameras(minutesThreshold: number = 30): Promise<string[]> {
    try {
      const threshold = new Date();
      threshold.setMinutes(threshold.getMinutes() - minutesThreshold);

      const staleCameras = await prisma.camera.findMany({
        where: {
          health: {
            none: {
              lastCheck: {
                gte: threshold,
              },
            },
          },
        },
        select: { id: true },
      });

      return staleCameras.map(camera => camera.id);
    } catch (error) {
      console.error('Error checking stale cameras:', error);
      throw error;
    }
  }

  /**
   * Get cameras with poor stream quality
   */
  static async getPoorQualityCameras(qualityThreshold: number = 70): Promise<any[]> {
    try {
      const cameras = await prisma.camera.findMany({
        where: {
          health: {
            some: {
              streamQuality: {
                lt: qualityThreshold,
              },
              status: 'ONLINE',
            },
          },
        },
        include: {
          health: {
            orderBy: { lastCheck: 'desc' },
            take: 1,
          },
        },
      });

      return cameras.filter(camera => {
        const health = camera.health[0];
        return health && health.streamQuality && health.streamQuality < qualityThreshold;
      });
    } catch (error) {
      console.error('Error getting poor quality cameras:', error);
      throw error;
    }
  }

  /**
   * Clean up old health records (older than 30 days)
   */
  static async cleanupOldHealthRecords(daysToKeep: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await prisma.cameraHealth.deleteMany({
        where: {
          lastCheck: {
            lt: cutoffDate,
          },
        },
      });

      return result.count;
    } catch (error) {
      console.error('Error cleaning up old health records:', error);
      throw error;
    }
  }
}

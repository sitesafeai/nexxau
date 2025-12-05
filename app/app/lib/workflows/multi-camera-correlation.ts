/**
 * Multi-Camera Correlation
 * 
 * Stitches together alerts from multiple cameras detecting the same event
 * Reduces noise and improves evidence quality
 */

import { prisma } from '../prisma';

export const CORRELATION_DEFAULTS = {
  TIME_WINDOW_SECONDS: 20,     // Same event within 20 seconds
  LOCATION_RADIUS_METERS: 50,  // Same zone or nearby
  SAME_WORKER_THRESHOLD: 0.8,  // 80% similarity in detection data
};

export class MultiCameraCorrelator {
  /**
   * Check if alert correlates with existing alerts
   */
  async findCorrelatedAlerts(alert: any): Promise<any[]> {
    if (!alert.worksiteId || !alert.location) {
      return [];
    }

    const timeWindow = new Date(Date.now() - CORRELATION_DEFAULTS.TIME_WINDOW_SECONDS * 1000);

    // Find alerts in same zone within time window
    const correlated = await prisma.alert.findMany({
      where: {
        worksiteId: alert.worksiteId,
        location: alert.location,
        createdAt: {
          gte: timeWindow
        },
        id: {
          not: alert.id
        },
        violationType: alert.violationType, // Same violation type
        status: {
          not: 'RESOLVED'
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    });

    // Check if same worker detected (if detection data available)
    if (alert.detectionData && correlated.length > 0) {
      return correlated.filter(c => {
        if (!c.detectionData) return true; // Include if no detection data

        // Simple similarity check (can be enhanced with ML)
        const alertBbox = alert.detectionData.boundingBox;
        const cBbox = c.detectionData.boundingBox;

        if (!alertBbox || !cBbox) return true;

        // Check if bounding boxes overlap significantly
        const overlap = this.calculateOverlap(alertBbox, cBbox);
        return overlap > CORRELATION_DEFAULTS.SAME_WORKER_THRESHOLD;
      });
    }

    return correlated;
  }

  /**
   * Stitch correlated alerts into single event
   */
  async stitchEvent(alert: any, correlated: any[]): Promise<string | null> {
    if (correlated.length === 0) {
      return null; // No correlation, process individually
    }

    // Find or create event group
    const eventGroupId = correlated[0].metadata?.eventGroupId || 
                        await this.createEventGroup(alert, correlated);

    // Update all alerts to reference same event group
    const allAlerts = [alert, ...correlated];
    for (const a of allAlerts) {
      await prisma.alert.update({
        where: { id: a.id },
        data: {
          metadata: {
            ...(a.metadata as any),
            eventGroupId,
            correlatedAlerts: allAlerts.map(al => al.id),
            isPrimary: a.id === alert.id // First alert is primary
          } as any
        }
      });
    }

    console.log(`[Multi-Camera] Stitched ${allAlerts.length} alerts into event group ${eventGroupId}`);

    return eventGroupId;
  }

  /**
   * Create event group for correlated alerts
   */
  private async createEventGroup(primaryAlert: any, correlated: any[]): Promise<string> {
    const eventGroupId = `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Aggregate all camera sources
    const cameras = [primaryAlert.cameraId, ...correlated.map(c => c.cameraId)].filter(Boolean);
    const uniqueCameras = [...new Set(cameras)];

    // Aggregate all snapshots/video
    const snapshots = [
      primaryAlert.detectionSnapshot,
      ...correlated.map(c => c.detectionSnapshot)
    ].filter(Boolean);

    const videos = [
      primaryAlert.detectionVideo,
      ...correlated.map(c => c.detectionVideo)
    ].filter(Boolean);

    // Store event group metadata
    await prisma.alert.update({
      where: { id: primaryAlert.id },
      data: {
        metadata: {
          ...(primaryAlert.metadata as any),
          eventGroupId,
          eventGroup: {
            id: eventGroupId,
            primaryAlertId: primaryAlert.id,
            correlatedAlertIds: correlated.map(c => c.id),
            cameras: uniqueCameras,
            snapshots,
            videos,
            createdAt: new Date().toISOString()
          }
        } as any
      }
    });

    return eventGroupId;
  }

  /**
   * Calculate bounding box overlap (simple IoU)
   */
  private calculateOverlap(bbox1: any, bbox2: any): number {
    if (!bbox1 || !bbox2) return 0;

    const x1 = Math.max(bbox1.x || 0, bbox2.x || 0);
    const y1 = Math.max(bbox1.y || 0, bbox2.y || 0);
    const x2 = Math.min((bbox1.x || 0) + (bbox1.width || 0), (bbox2.x || 0) + (bbox2.width || 0));
    const y2 = Math.min((bbox1.y || 0) + (bbox1.height || 0), (bbox2.y || 0) + (bbox2.height || 0));

    if (x2 < x1 || y2 < y1) return 0;

    const intersection = (x2 - x1) * (y2 - y1);
    const area1 = (bbox1.width || 0) * (bbox1.height || 0);
    const area2 = (bbox2.width || 0) * (bbox2.height || 0);
    const union = area1 + area2 - intersection;

    return union > 0 ? intersection / union : 0;
  }
}

export const multiCameraCorrelator = new MultiCameraCorrelator();


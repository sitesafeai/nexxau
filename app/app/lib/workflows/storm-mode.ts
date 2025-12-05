/**
 * Storm Mode / High-Activity Detection
 * 
 * Detects when alert rate exceeds thresholds and switches to batching mode
 * Prevents notification fatigue during high-activity periods
 */

import { prisma } from '../prisma';

// Default storm mode configuration
export const STORM_MODE_DEFAULTS = {
  ALERT_THRESHOLD: 30,        // 30 alerts in X minutes triggers storm mode
  TIME_WINDOW_MINUTES: 5,     // Time window for threshold
  BASELINE_MULTIPLIER: 3,     // 3× baseline rate triggers storm mode
  BATCH_WINDOW_MINUTES: 5,    // Batch alerts every 5 minutes
  DUPLICATE_WINDOW_SECONDS: 120, // Suppress duplicates within 2 minutes
};

export class StormModeDetector {
  /**
   * Check if worksite is in storm mode (scaled by site size)
   */
  async isStormMode(worksiteId: string): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - STORM_MODE_DEFAULTS.TIME_WINDOW_MINUTES * 60 * 1000);

    // Get worksite to determine expected worker count
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: {
        _count: {
          select: {
            workers: true
          }
        },
        metadata: true
      }
    });

    // Calculate threshold based on site size
    const expectedWorkers = worksite?._count?.workers || 
                            (worksite?.metadata as any)?.expectedWorkers || 
                            10; // Default assumption

    // Threshold = max(20, 1.5 × expected workers)
    const dynamicThreshold = Math.max(20, Math.ceil(expectedWorkers * 1.5));

    // Count recent alerts
    const recentAlertCount = await prisma.alert.count({
      where: {
        worksiteId,
        createdAt: {
          gte: windowStart
        }
      }
    });

    // Check dynamic threshold (scaled by site size)
    if (recentAlertCount >= dynamicThreshold) {
      console.log(`[Storm Mode] ACTIVATED for worksite ${worksiteId}: ${recentAlertCount} alerts (threshold: ${dynamicThreshold} for ${expectedWorkers} workers)`);
      return true;
    }

    // Check baseline multiplier
    const baseline = await this.getBaselineRate(worksiteId);
    if (baseline > 0 && recentAlertCount >= baseline * STORM_MODE_DEFAULTS.BASELINE_MULTIPLIER) {
      console.log(`[Storm Mode] ACTIVATED for worksite ${worksiteId}: ${recentAlertCount} alerts vs baseline ${baseline}`);
      return true;
    }

    return false;
  }

  /**
   * Get baseline alert rate for worksite
   */
  private async getBaselineRate(worksiteId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const metrics = await prisma.worksiteMetrics.findMany({
      where: {
        worksiteId,
        date: {
          gte: sevenDaysAgo
        }
      },
      select: {
        totalAlerts: true
      }
    });

    if (metrics.length === 0) return 0;

    // Calculate average alerts per 5-minute window from daily totals
    const avgAlertsPerDay = metrics.reduce((sum, m) => sum + m.totalAlerts, 0) / metrics.length;
    const avgAlertsPerFiveMinutes = (avgAlertsPerDay / 24 / 60) * STORM_MODE_DEFAULTS.TIME_WINDOW_MINUTES;
    
    return Math.ceil(avgAlertsPerFiveMinutes);
  }

  /**
   * Should this alert be batched?
   */
  async shouldBatch(worksiteId: string, alert: any): Promise<boolean> {
    const inStormMode = await this.isStormMode(worksiteId);
    
    if (!inStormMode) {
      return false;
    }

    // Check for duplicate within window
    const isDuplicate = await this.isDuplicateAlert(worksiteId, alert);
    if (isDuplicate) {
      console.log(`[Storm Mode] Suppressing duplicate alert for camera ${alert.cameraId}`);
      return true; // Suppress
    }

    return true; // Batch it
  }

  /**
   * Check if alert is duplicate within suppression window
   */
  private async isDuplicateAlert(worksiteId: string, alert: any): Promise<boolean> {
    const windowStart = new Date(Date.now() - STORM_MODE_DEFAULTS.DUPLICATE_WINDOW_SECONDS * 1000);

    const duplicate = await prisma.alert.findFirst({
      where: {
        worksiteId,
        cameraId: alert.cameraId,
        severity: alert.severity,
        createdAt: {
          gte: windowStart
        },
        id: {
          not: alert.id
        }
      }
    });

    return !!duplicate;
  }

  /**
   * Add alert to current batch
   */
  async addToBatch(worksiteId: string, alertId: string, alert: any): Promise<void> {
    const now = new Date();
    const batchStart = new Date(now.getTime() - (now.getTime() % (STORM_MODE_DEFAULTS.BATCH_WINDOW_MINUTES * 60 * 1000)));
    const batchEnd = new Date(batchStart.getTime() + STORM_MODE_DEFAULTS.BATCH_WINDOW_MINUTES * 60 * 1000);

    // Find or create current batch
    let batch = await prisma.alertBatch.findFirst({
      where: {
        worksiteId,
        batchStart,
        batchEnd,
        notificationSent: false
      }
    });

    if (!batch) {
      batch = await prisma.alertBatch.create({
        data: {
          worksiteId,
          batchStart,
          batchEnd,
          alertIds: [alertId],
          alertCount: 1,
          topTypes: [{ type: alert.violationType || 'unknown', count: 1 }] as any,
          topZones: alert.location ? [{ zone: alert.location, count: 1 }] : [] as any,
          severityBreakdown: { [alert.severity]: 1 } as any,
          createdAt: now
        }
      });
    } else {
      // Update existing batch
      const alertIds = [...batch.alertIds, alertId];
      const topTypes = this.updateAggregation(batch.topTypes as any, alert.violationType || 'unknown');
      const topZones = alert.location ? this.updateAggregation(batch.topZones as any, alert.location) : batch.topZones;
      const severityBreakdown = { ...(batch.severityBreakdown as any) };
      severityBreakdown[alert.severity] = (severityBreakdown[alert.severity] || 0) + 1;

      await prisma.alertBatch.update({
        where: { id: batch.id },
        data: {
          alertIds,
          alertCount: alertIds.length,
          topTypes: topTypes as any,
          topZones: topZones as any,
          severityBreakdown: severityBreakdown as any
        }
      });
    }

    console.log(`[Storm Mode] Added alert ${alertId} to batch ${batch.id}`);
  }

  /**
   * Send batched notification
   */
  async sendBatchNotification(batchId: string): Promise<void> {
    const batch = await prisma.alertBatch.findUnique({
      where: { id: batchId },
      include: {
        worksite: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!batch || batch.notificationSent) {
      return;
    }

    // Build summary message
    const topTypes = (batch.topTypes as any[]).sort((a, b) => b.count - a.count).slice(0, 3);
    const topZones = (batch.topZones as any[]).sort((a, b) => b.count - a.count).slice(0, 3);

    const message = `
🚨 HIGH ACTIVITY ALERT - ${batch.worksite.name}

${batch.alertCount} alerts detected (${batch.batchStart.toLocaleTimeString()} - ${batch.batchEnd.toLocaleTimeString()})

Top Alert Types:
${topTypes.map((t: any, i: number) => `${i + 1}. ${t.type}: ${t.count}`).join('\n')}

Top Zones:
${topZones.map((z: any, i: number) => `${i + 1}. ${z.zone}: ${z.count}`).join('\n')}

Severity Breakdown: ${JSON.stringify(batch.severityBreakdown)}

Action Required: Review alerts in dashboard
`.trim();

    // Find escalation chain or default contacts
    const chain = await prisma.escalationChain.findFirst({
      where: {
        worksiteId: batch.worksiteId,
        enabled: true
      }
    });

    // Send to first level of escalation chain
    if (chain && Array.isArray(chain.steps)) {
      const firstStep = (chain.steps as any[])[0];
      if (firstStep?.contacts) {
        for (const contact of firstStep.contacts) {
          await prisma.notificationLog.create({
            data: {
              worksiteId: batch.worksiteId,
              channel: contact.type || 'sms',
              recipient: contact.value,
              subject: `High Activity Alert - ${batch.worksite.name}`,
              body: message,
              status: 'pending'
            }
          });
        }
      }
    }

    // Mark batch as sent
    await prisma.alertBatch.update({
      where: { id: batchId },
      data: {
        notificationSent: true,
        sentAt: new Date()
      }
    });

    console.log(`[Storm Mode] Sent batch notification for ${batch.alertCount} alerts`);
  }

  /**
   * Helper to update aggregation counts
   */
  private updateAggregation(current: any[], key: string): any[] {
    const existing = current.find(item => item.type === key || item.zone === key);
    if (existing) {
      return current.map(item =>
        (item.type === key || item.zone === key)
          ? { ...item, count: item.count + 1 }
          : item
      );
    } else {
      return [...current, current[0]?.type ? { type: key, count: 1 } : { zone: key, count: 1 }];
    }
  }
}

export const stormModeDetector = new StormModeDetector();


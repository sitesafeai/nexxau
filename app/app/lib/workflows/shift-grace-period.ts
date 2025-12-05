/**
 * Shift Start Grace Period
 * 
 * Downgrades PPE alerts during shift start periods
 * Workers walking in before grabbing PPE are not violations
 */

import { prisma } from '../prisma';

export const GRACE_PERIOD_DEFAULTS = {
  DURATION_MINUTES: 10,        // 10 minutes after shift start
  DEFAULT_SHIFT_STARTS: [      // Default shift times (can be overridden per worksite)
    { hour: 6, minute: 0 },    // 6:00 AM
    { hour: 14, minute: 0 },   // 2:00 PM
    { hour: 22, minute: 0 }    // 10:00 PM
  ]
};

export class ShiftGracePeriodHandler {
  /**
   * Check if alert is during grace period
   */
  async isInGracePeriod(alert: any): Promise<boolean> {
    const worksite = await prisma.worksite.findUnique({
      where: { id: alert.worksiteId },
      select: {
        metadata: true
      }
    });

    // Get shift start times (from worksite config or defaults)
    const shiftStarts = this.getShiftStarts(worksite?.metadata as any);
    const alertTime = new Date(alert.createdAt);
    const alertHour = alertTime.getHours();
    const alertMinute = alertTime.getMinutes();

    // Check if alert is within grace period of any shift start
    for (const shift of shiftStarts) {
      const shiftStart = new Date(alertTime);
      shiftStart.setHours(shift.hour, shift.minute, 0, 0);

      // Handle overnight shifts
      if (shift.hour > 20 && alertHour < 6) {
        shiftStart.setDate(shiftStart.getDate() - 1);
      }

      const graceEnd = new Date(shiftStart.getTime() + GRACE_PERIOD_DEFAULTS.DURATION_MINUTES * 60 * 1000);

      if (alertTime >= shiftStart && alertTime <= graceEnd) {
        console.log(`[Grace Period] Alert ${alert.id} is during shift start grace period (${shift.hour}:${shift.minute})`);
        return true;
      }
    }

    return false;
  }

  /**
   * Downgrade PPE alerts during grace period
   */
  async applyGracePeriod(alert: any): Promise<{ downgraded: boolean; originalSeverity?: string }> {
    const violationType = (alert.violationType || alert.title || '').toLowerCase();
    const isPPE = violationType.includes('hard hat') ||
                   violationType.includes('helmet') ||
                   violationType.includes('safety vest') ||
                   violationType.includes('ppe');

    if (!isPPE) {
      return { downgraded: false };
    }

    const inGracePeriod = await this.isInGracePeriod(alert);
    if (!inGracePeriod) {
      return { downgraded: false };
    }

    // Downgrade to MINOR
    const originalSeverity = alert.severity;
    await prisma.alert.update({
      where: { id: alert.id },
      data: {
        severity: 'MINOR' as any,
        metadata: {
          ...(alert.metadata as any),
          gracePeriodApplied: true,
          originalSeverity,
          gracePeriodReason: 'Shift start grace period - workers entering site'
        } as any
      }
    });

    console.log(`[Grace Period] Downgraded alert ${alert.id} from ${originalSeverity} to MINOR (grace period)`);

    return {
      downgraded: true,
      originalSeverity
    };
  }

  /**
   * Get shift start times for worksite
   */
  private getShiftStarts(metadata: any): Array<{ hour: number; minute: number }> {
    if (metadata?.shiftStarts && Array.isArray(metadata.shiftStarts)) {
      return metadata.shiftStarts;
    }

    return GRACE_PERIOD_DEFAULTS.DEFAULT_SHIFT_STARTS;
  }
}

export const shiftGracePeriodHandler = new ShiftGracePeriodHandler();


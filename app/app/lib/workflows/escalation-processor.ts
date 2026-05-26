/**
 * Escalation Ladder Processor
 * 
 * Handles automatic escalation of unacknowledged alerts through chain of contacts
 * Timeline: T+5min → site lead, T+10min → supervisor, T+20min → safety manager
 */

import { prisma } from '../prisma';

export const ESCALATION_DEFAULTS = {
  // Severity-based delays (in minutes)
  CRITICAL_DELAYS: { LEVEL_1: 0, LEVEL_2: 0, LEVEL_3: 0 },  // Immediate for all levels
  SEVERE_DELAYS: { LEVEL_1: 3, LEVEL_2: 8, LEVEL_3: 15 },   // Faster for severe
  MODERATE_DELAYS: { LEVEL_1: 10, LEVEL_2: 20, LEVEL_3: 30 }, // Standard for moderate
  CHECK_INTERVAL: 60 * 1000, // Check every minute
};

export class EscalationProcessor {
  private intervalId: NodeJS.Timeout | null = null;

  /**
   * Start the escalation processor
   */
  start(): void {
    if (this.intervalId) {
      console.log('[Escalation] Processor already running');
      return;
    }

    console.log('[Escalation] Starting escalation processor');
    this.intervalId = setInterval(() => {
      this.processEscalations().catch(error => {
        console.error('[Escalation] Error processing escalations:', error);
      });
    }, ESCALATION_DEFAULTS.CHECK_INTERVAL);

    // Run immediately on start
    this.processEscalations();
  }

  /**
   * Stop the escalation processor
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[Escalation] Processor stopped');
    }
  }

  /**
   * Process all pending escalations
   */
  private async processEscalations(): Promise<void> {
    try {
      // Find all active escalations
      const escalations = await prisma.escalation.findMany({
        where: {
          status: {
            in: ['pending', 'in_progress']
          }
        },
        include: {
          alert: true,
          chain: true
        }
      });

      console.log(`[Escalation] Processing ${escalations.length} active escalations`);

      for (const escalation of escalations) {
        await this.processEscalation(escalation);
      }
    } catch (error) {
      console.error('[Escalation] Error in processEscalations:', error);
    }
  }

  /**
   * Process a single escalation
   */
  private async processEscalation(escalation: any): Promise<void> {
    const { alert, chain, currentLevel } = escalation;

    // Check if alert has been acknowledged
    if (alert.status === 'ACKNOWLEDGED' || alert.status === 'RESOLVED') {
      await prisma.escalation.update({
        where: { id: escalation.id },
        data: {
          status: 'acknowledged',
          acknowledgedAt: new Date()
        }
      });
      console.log(`[Escalation] Alert ${alert.id} acknowledged, stopping escalation`);
      return;
    }

    const minutesSinceCreated = (Date.now() - new Date(escalation.createdAt).getTime()) / 1000 / 60;
    const steps = chain.steps as any[];
    const nextStep = steps.find((s: any) => s.level === currentLevel);

    if (!nextStep) {
      console.log(`[Escalation] No more escalation steps for ${escalation.id}`);
      await prisma.escalation.update({
        where: { id: escalation.id },
        data: { status: 'completed' }
      });
      return;
    }

    // Get severity-based delay
    const requiredDelay = this.getRequiredDelay(alert.severity, currentLevel);
    const stepDelay = nextStep.delayMinutes || requiredDelay;

    // Check if it's time to execute this level
    if (minutesSinceCreated >= stepDelay) {
      await this.executeEscalationLevel(escalation, nextStep);
      
      // Move to next level
      const nextLevel = currentLevel + 1;
      await prisma.escalation.update({
        where: { id: escalation.id },
        data: {
          currentLevel: nextLevel,
          status: 'in_progress',
          notifications: [
            ...(escalation.notifications as any[]),
            {
              level: currentLevel,
              sentAt: new Date().toISOString(),
              recipients: nextStep.contacts,
              status: 'sent'
            }
          ] as any
        }
      });
    }
  }

  /**
   * Execute a specific escalation level
   */
  private async executeEscalationLevel(escalation: any, step: any): Promise<void> {
    const { alert } = escalation;
    const { level, contacts, message } = step;

    console.log(`[Escalation] Executing level ${level} for alert ${alert.id}`);

    const notificationMessage = message || this.buildEscalationMessage(alert, level);

    for (const contact of contacts) {
      try {
        await prisma.notificationLog.create({
          data: {
            worksiteId: alert.worksiteId,
            alertId: alert.id,
            channel: contact.type || 'sms',
            recipient: contact.value,
            subject: `ESCALATION LEVEL ${level}: ${alert.title || 'Safety Alert'}`,
            body: notificationMessage,
            status: 'pending',
            metadata: {
              escalationLevel: level,
              escalationId: escalation.id
            } as any
          }
        });

        console.log(`[Escalation] Queued ${contact.type} to ${contact.value} for level ${level}`);
      } catch (error) {
        console.error(`[Escalation] Failed to queue notification:`, error);
      }
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: 'system',
        action: 'ESCALATE_ALERT',
        entityType: 'Alert',
        entityId: alert.id,
        worksiteId: alert.worksiteId,
        changes: {
          escalationLevel: level,
          contacts: contacts.map((c: any) => c.value)
        } as any,
        metadata: {
          alertSeverity: alert.severity,
          minutesSinceCreated: (Date.now() - new Date(alert.createdAt).getTime()) / 1000 / 60
        } as any,
        ipAddress: 'system',
        userAgent: 'workflow-engine'
      }
    });
  }

  /**
   * Build escalation message
   */
  private buildEscalationMessage(alert: any, level: number): string {
    const minutesOld = Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 1000 / 60);

    return `
🚨 ESCALATION LEVEL ${level}

Alert: ${alert.title || 'Safety Violation'}
Severity: ${alert.severity}
Location: ${alert.location || 'Unknown'}
Time: ${minutesOld} minutes ago

Description: ${alert.description}

⚠️ This alert has not been acknowledged.
Please review immediately in the dashboard.

Alert ID: ${alert.id}
`.trim();
  }

  /**
   * Create default escalation chain for new worksite
   */
  async createDefaultChain(worksiteId: string, supervisorContact?: string): Promise<void> {
    const existing = await prisma.escalationChain.findFirst({
      where: { worksiteId }
    });

    if (existing) {
      console.log('[Escalation] Chain already exists for worksite:', worksiteId);
      return;
    }

    const defaultSteps = [
      {
        level: 1,
        delayMinutes: ESCALATION_DEFAULTS.LEVEL_1_DELAY,
        contacts: supervisorContact ? [{ type: 'sms', value: supervisorContact, role: 'Site Lead' }] : [],
        message: null
      },
      {
        level: 2,
        delayMinutes: ESCALATION_DEFAULTS.LEVEL_2_DELAY,
        contacts: supervisorContact ? [{ type: 'sms', value: supervisorContact, role: 'Site Supervisor' }] : [],
        message: null
      },
      {
        level: 3,
        delayMinutes: ESCALATION_DEFAULTS.LEVEL_3_DELAY,
        contacts: [], // To be configured by user
        message: null
      }
    ];

    await prisma.escalationChain.create({
      data: {
        worksiteId,
        name: 'Default Escalation Chain',
        description: 'Automatic escalation for unacknowledged alerts',
        severity: ['HIGH'],
        alertTypes: [],
        steps: defaultSteps as any,
        enabled: true
      }
    });

    console.log('[Escalation] Created default chain for worksite:', worksiteId);
  }

  /**
   * Check if this is a repeated violation
   */
  private async isRepeatedViolation(alert: any): Promise<boolean> {
    if (!alert.cameraId || !alert.location) return false;

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const count = await prisma.alert.count({
      where: {
        worksiteId: alert.worksiteId,
        cameraId: alert.cameraId,
        location: alert.location,
        createdAt: {
          gte: twentyFourHoursAgo
        }
      }
    });

    return count > 3; // More than 3 in same location in 24h = repeated
  }

  /**
   * Get required delay based on severity and level
   */
  private getRequiredDelay(severity: string, level: number): number {
    if (severity === 'HIGH') {
      return ESCALATION_DEFAULTS.CRITICAL_DELAYS[`LEVEL_${level}` as keyof typeof ESCALATION_DEFAULTS.CRITICAL_DELAYS] || 0;
    } else if (severity === 'SEVERE' || severity === 'HIGH') {
      return ESCALATION_DEFAULTS.SEVERE_DELAYS[`LEVEL_${level}` as keyof typeof ESCALATION_DEFAULTS.SEVERE_DELAYS] || 3;
    } else {
      return ESCALATION_DEFAULTS.MODERATE_DELAYS[`LEVEL_${level}` as keyof typeof ESCALATION_DEFAULTS.MODERATE_DELAYS] || 10;
    }
  }
}

export const escalationProcessor = new EscalationProcessor();


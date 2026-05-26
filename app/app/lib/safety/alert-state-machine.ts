/**
 * Alert State Machine
 * 
 * Per directive: Alerts are state machines, not events.
 * Each alert must have:
 * - Deterministic unique key
 * - Immutable creation record
 * - Explicit lifecycle states
 * - Append-only override history
 */

import { prisma } from '../prisma';

export type AlertState = 'CREATED' | 'ACKNOWLEDGED' | 'OVERRIDDEN' | 'RESOLVED' | 'ESCALATED';

export interface AlertStateTransition {
  from: AlertState;
  to: AlertState;
  timestamp: Date;
  userId: string;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface AlertOverride {
  id: string;
  alertId: string;
  userId: string;
  timestamp: Date;
  reason: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

export class AlertStateMachine {
  private static readonly VALID_TRANSITIONS: Record<AlertState, AlertState[]> = {
    CREATED: ['ACKNOWLEDGED', 'OVERRIDDEN', 'RESOLVED', 'ESCALATED'],
    ACKNOWLEDGED: ['RESOLVED', 'ESCALATED', 'OVERRIDDEN'],
    OVERRIDDEN: ['RESOLVED'], // Overridden alerts can only be resolved
    RESOLVED: [], // Terminal state
    ESCALATED: ['ACKNOWLEDGED', 'RESOLVED', 'OVERRIDDEN'],
  };

  /**
   * Generate deterministic unique key for an alert
   * Used for deduplication and idempotency
   */
  public static generateAlertKey(data: {
    cameraId: string;
    violationType: string;
    timestamp: Date;
    location?: string;
    metadata?: Record<string, any>;
  }): string {
    // Create deterministic key from key fields
    const keyParts = [
      data.cameraId,
      data.violationType,
      Math.floor(data.timestamp.getTime() / 1000), // Round to seconds
      data.location || '',
      JSON.stringify(data.metadata || {}),
    ];
    
    // Hash the key
    const keyString = keyParts.join('|');
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(keyString).digest('hex').substring(0, 32);
  }

  /**
   * Check if a state transition is valid
   */
  public static isValidTransition(from: AlertState, to: AlertState): boolean {
    return this.VALID_TRANSITIONS[from]?.includes(to) || false;
  }

  /**
   * Transition alert to new state with full audit trail
   */
  public static async transitionAlert(
    alertId: string,
    toState: AlertState,
    userId: string,
    reason?: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get current alert
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        select: { id: true, status: true, metadata: true },
      });

      if (!alert) {
        return { success: false, error: 'Alert not found' };
      }

      const currentState = alert.status as AlertState;

      // Validate transition
      if (!this.isValidTransition(currentState, toState)) {
        return {
          success: false,
          error: `Invalid transition from ${currentState} to ${toState}`,
        };
      }

      // Perform transition in transaction
      await prisma.$transaction(async (tx) => {
        // Update alert status
        const updateData: any = {
          status: toState,
          updatedAt: new Date(),
        };

        // Set resolvedAt if transitioning to RESOLVED
        if (toState === 'RESOLVED') {
          updateData.resolvedAt = new Date();
        }

        // Update metadata with transition history
        const currentMetadata = (alert.metadata as Record<string, any>) || {};
        const transitions = currentMetadata.transitions || [];
        transitions.push({
          from: currentState,
          to: toState,
          timestamp: new Date().toISOString(),
          userId,
          reason,
          metadata,
        });

        updateData.metadata = {
          ...currentMetadata,
          transitions,
          lastTransition: {
            from: currentState,
            to: toState,
            timestamp: new Date().toISOString(),
            userId,
          },
        };

        await tx.alert.update({
          where: { id: alertId },
          data: updateData,
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: `ALERT_${toState}`,
            entity: 'ALERT',
            entityId: alertId,
            entityName: `Alert ${alertId}`,
            metadata: {
              fromState: currentState,
              toState,
              userId,
              reason,
              ...metadata,
            },
            result: 'SUCCESS',
            severity: toState === 'OVERRIDDEN' ? 'LOW' : 'MEDIUM',
          },
        });

        // Create alert response record
        if (userId) {
          await tx.alertResponse.create({
            data: {
              alertId,
              userId,
              response: toState,
              notes: reason || null,
              createdAt: new Date(),
            },
          });
        }
      });

      return { success: true };
    } catch (error: any) {
      console.error('[AlertStateMachine] Transition failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to transition alert',
      };
    }
  }

  /**
   * Override an alert (append-only, never delete history)
   */
  public static async overrideAlert(
    alertId: string,
    userId: string,
    reason: string,
    expiresAt?: Date,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string; overrideId?: string }> {
    try {
      // Get current alert
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        select: { id: true, status: true, metadata: true },
      });

      if (!alert) {
        return { success: false, error: 'Alert not found' };
      }

      // Validate reason is provided
      if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'Override reason is required' };
      }

      // Perform override in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update alert to OVERRIDDEN state
        const currentMetadata = (alert.metadata as Record<string, any>) || {};
        const overrides = currentMetadata.overrides || [];
        
        const overrideRecord = {
          id: require('crypto').randomUUID(),
          userId,
          timestamp: new Date().toISOString(),
          reason: reason.trim(),
          expiresAt: expiresAt?.toISOString() || null,
          metadata: metadata || {},
        };
        
        overrides.push(overrideRecord);

        await tx.alert.update({
          where: { id: alertId },
          data: {
            status: 'OVERRIDDEN',
            updatedAt: new Date(),
            metadata: {
              ...currentMetadata,
              overrides,
              lastOverride: overrideRecord,
            },
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            action: 'ALERT_OVERRIDDEN',
            entity: 'ALERT',
            entityId: alertId,
            entityName: `Alert ${alertId}`,
            metadata: {
              userId,
              reason,
              expiresAt: expiresAt?.toISOString() || null,
              ...metadata,
            },
            result: 'SUCCESS',
            severity: 'LOW',
          },
        });

        // Create alert response
        await tx.alertResponse.create({
          data: {
            alertId,
            userId,
            response: 'OVERRIDDEN',
            notes: reason,
            createdAt: new Date(),
          },
        });

        return overrideRecord.id;
      });

      return { success: true, overrideId: result };
    } catch (error: any) {
      console.error('[AlertStateMachine] Override failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to override alert',
      };
    }
  }

  /**
   * Check if an alert is overridden and if override has expired
   */
  public static async isAlertOverridden(alertId: string): Promise<{
    isOverridden: boolean;
    expiresAt?: Date;
    canReFire: boolean;
  }> {
    try {
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        select: { status: true, metadata: true },
      });

      if (!alert || alert.status !== 'OVERRIDDEN') {
        return { isOverridden: false, canReFire: true };
      }

      const metadata = (alert.metadata as Record<string, any>) || {};
      const lastOverride = metadata.lastOverride;

      if (!lastOverride) {
        return { isOverridden: true, canReFire: false };
      }

      // Check if override has expired
      if (lastOverride.expiresAt) {
        const expiresAt = new Date(lastOverride.expiresAt);
        const now = new Date();
        
        if (now > expiresAt) {
          // Override expired, alert can re-fire
          return {
            isOverridden: true,
            expiresAt,
            canReFire: true,
          };
        }
      }

      return {
        isOverridden: true,
        expiresAt: lastOverride.expiresAt ? new Date(lastOverride.expiresAt) : undefined,
        canReFire: false,
      };
    } catch (error) {
      console.error('[AlertStateMachine] Check override failed:', error);
      // Fail closed - assume not overridden
      return { isOverridden: false, canReFire: true };
    }
  }

  /**
   * Check if alert should be created (deduplication check)
   */
  public static async shouldCreateAlert(alertKey: string): Promise<{
    shouldCreate: boolean;
    existingAlertId?: string;
    reason?: string;
  }> {
    try {
      // Check for existing alert with same key in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const existingAlert = await prisma.alert.findFirst({
        where: {
          metadata: {
            path: ['alertKey'],
            equals: alertKey,
          },
          createdAt: {
            gte: fiveMinutesAgo,
          },
        },
        select: { id: true, status: true },
        orderBy: { createdAt: 'desc' },
      });

      if (!existingAlert) {
        return { shouldCreate: true };
      }

      // Check if existing alert is overridden
      const overrideCheck = await this.isAlertOverridden(existingAlert.id);
      
      if (overrideCheck.isOverridden && !overrideCheck.canReFire) {
        return {
          shouldCreate: false,
          existingAlertId: existingAlert.id,
          reason: 'Alert is overridden and override has not expired',
        };
      }

      // If alert is resolved or override expired, allow new alert
      if (existingAlert.status === 'RESOLVED' || overrideCheck.canReFire) {
        return { shouldCreate: true };
      }

      return {
        shouldCreate: false,
        existingAlertId: existingAlert.id,
        reason: `Duplicate alert exists (status: ${existingAlert.status})`,
      };
    } catch (error) {
      console.error('[AlertStateMachine] Deduplication check failed:', error);
      // Fail open - allow creation if check fails
      return { shouldCreate: true };
    }
  }
}


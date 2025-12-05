import { prisma } from '@/app/lib/prisma';

export type AuditEntity = 'ALERT' | 'CAMERA' | 'USER' | 'RULE' | 'INTEGRATION' | 'SYSTEM';
export type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
export type AuditResult = 'SUCCESS' | 'FAILURE' | 'PENDING';

// Common audit actions
export const AUDIT_ACTIONS = {
  // Alert actions
  ALERT_CREATED: 'ALERT_CREATED',
  ALERT_ACKNOWLEDGED: 'ALERT_ACKNOWLEDGED',
  ALERT_RESOLVED: 'ALERT_RESOLVED',
  ALERT_CONFIRMED: 'ALERT_CONFIRMED',
  ALERT_FALSE_POSITIVE: 'ALERT_FALSE_POSITIVE',
  ALERT_SNOOZED: 'ALERT_SNOOZED',
  ALERT_REOPENED: 'ALERT_REOPENED',
  ALERT_ESCALATED: 'ALERT_ESCALATED',
  ALERT_SEVERITY_CHANGED: 'ALERT_SEVERITY_CHANGED',
  ALERT_OWNER_CHANGED: 'ALERT_OWNER_CHANGED',
  ALERT_NOTE_ADDED: 'ALERT_NOTE_ADDED',
  ALERT_EVIDENCE_ADDED: 'ALERT_EVIDENCE_ADDED',
  
  // Camera actions
  CAMERA_ADDED: 'CAMERA_ADDED',
  CAMERA_REMOVED: 'CAMERA_REMOVED',
  CAMERA_RENAMED: 'CAMERA_RENAMED',
  CAMERA_MOVED: 'CAMERA_MOVED',
  CAMERA_OFFLINE: 'CAMERA_OFFLINE',
  CAMERA_ONLINE: 'CAMERA_ONLINE',
  CAMERA_FIRMWARE_UPDATE: 'CAMERA_FIRMWARE_UPDATE',
  CAMERA_STREAM_CHANGED: 'CAMERA_STREAM_CHANGED',
  CAMERA_MODEL_CHANGED: 'CAMERA_MODEL_CHANGED',
  CAMERA_CONFIGURED: 'CAMERA_CONFIGURED',
  
  // User actions
  USER_ADDED: 'USER_ADDED',
  USER_REMOVED: 'USER_REMOVED',
  USER_ROLE_CHANGED: 'USER_ROLE_CHANGED',
  USER_PERMISSIONS_UPDATED: 'USER_PERMISSIONS_UPDATED',
  USER_LOGIN_SUCCESS: 'USER_LOGIN_SUCCESS',
  USER_LOGIN_FAILED: 'USER_LOGIN_FAILED',
  USER_PASSWORD_RESET: 'USER_PASSWORD_RESET',
  USER_MFA_ENABLED: 'USER_MFA_ENABLED',
  USER_MFA_DISABLED: 'USER_MFA_DISABLED',
  USER_LOCKED: 'USER_LOCKED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  USER_REACTIVATED: 'USER_REACTIVATED',
  USER_INVITED: 'USER_INVITED',
  
  // Rule actions
  RULE_CREATED: 'RULE_CREATED',
  RULE_DELETED: 'RULE_DELETED',
  RULE_UPDATED: 'RULE_UPDATED',
  RULE_ENABLED: 'RULE_ENABLED',
  RULE_DISABLED: 'RULE_DISABLED',
  RULE_THRESHOLD_UPDATED: 'RULE_THRESHOLD_UPDATED',
  RULE_NOTIFICATION_CHANGED: 'RULE_NOTIFICATION_CHANGED',
  
  // Integration actions
  API_KEY_CREATED: 'API_KEY_CREATED',
  API_KEY_REVOKED: 'API_KEY_REVOKED',
  API_KEY_SCOPE_CHANGED: 'API_KEY_SCOPE_CHANGED',
  WEBHOOK_DELIVERED: 'WEBHOOK_DELIVERED',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',
  WEBHOOK_RETRY: 'WEBHOOK_RETRY',
  INTEGRATION_INSTALLED: 'INTEGRATION_INSTALLED',
  INTEGRATION_REMOVED: 'INTEGRATION_REMOVED',
  
  // System actions
  MODEL_UPDATED: 'MODEL_UPDATED',
  BATCH_JOB_RUN: 'BATCH_JOB_RUN',
  DETECTOR_RESTART: 'DETECTOR_RESTART',
  STORAGE_EVENT: 'STORAGE_EVENT',
  DEPLOYMENT: 'DEPLOYMENT',
  RATE_LIMIT_TRIGGERED: 'RATE_LIMIT_TRIGGERED',
  DATA_PURGE: 'DATA_PURGE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
} as const;

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  entity: AuditEntity;
  entityId?: string;
  entityName?: string;
  worksiteId?: string;
  companyId?: string;
  changes?: {
    old?: Record<string, any>;
    new?: Record<string, any>;
  };
  details?: Record<string, any>;
  result?: AuditResult;
  severity?: AuditSeverity;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(input: AuditLogInput): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: input.userId,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        entityName: input.entityName,
        worksiteId: input.worksiteId,
        companyId: input.companyId,
        changes: input.changes,
        details: input.details,
        result: input.result || 'SUCCESS',
        severity: input.severity || 'INFO',
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        metadata: input.metadata,
      },
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
    // Don't throw - audit logging should not break main functionality
  }
}

/**
 * Log alert action
 */
export async function logAlertAction(
  action: string,
  alertId: string,
  alertTitle: string,
  userId: string | null,
  worksiteId?: string,
  changes?: { old?: any; new?: any },
  details?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entity: 'ALERT',
    entityId: alertId,
    entityName: alertTitle,
    worksiteId,
    changes,
    details,
    severity: action.includes('ESCALATED') || action.includes('CRITICAL') ? 'WARNING' : 'INFO',
  });
}

/**
 * Log camera action
 */
export async function logCameraAction(
  action: string,
  cameraId: string,
  cameraName: string,
  userId: string | null,
  worksiteId?: string,
  changes?: { old?: any; new?: any },
  details?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entity: 'CAMERA',
    entityId: cameraId,
    entityName: cameraName,
    worksiteId,
    changes,
    details,
    severity: action.includes('REMOVED') || action.includes('OFFLINE') ? 'WARNING' : 'INFO',
  });
}

/**
 * Log user action
 */
export async function logUserAction(
  action: string,
  targetUserId: string,
  targetUserName: string,
  actingUserId: string | null,
  details?: Record<string, any>,
  result?: AuditResult
): Promise<void> {
  await createAuditLog({
    userId: actingUserId,
    action,
    entity: 'USER',
    entityId: targetUserId,
    entityName: targetUserName,
    details,
    result,
    severity: action.includes('FAILED') || action.includes('LOCKED') ? 'WARNING' : 'INFO',
  });
}

/**
 * Log rule action
 */
export async function logRuleAction(
  action: string,
  ruleId: string,
  ruleName: string,
  userId: string | null,
  worksiteId?: string,
  changes?: { old?: any; new?: any },
  details?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entity: 'RULE',
    entityId: ruleId,
    entityName: ruleName,
    worksiteId,
    changes,
    details,
  });
}

/**
 * Log integration action
 */
export async function logIntegrationAction(
  action: string,
  integrationId: string,
  integrationName: string,
  userId: string | null,
  result?: AuditResult,
  details?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId,
    action,
    entity: 'INTEGRATION',
    entityId: integrationId,
    entityName: integrationName,
    result,
    details,
    severity: result === 'FAILURE' ? 'ERROR' : 'INFO',
  });
}

/**
 * Log system event
 */
export async function logSystemEvent(
  action: string,
  description: string,
  severity: AuditSeverity = 'INFO',
  details?: Record<string, any>
): Promise<void> {
  await createAuditLog({
    userId: null,
    action,
    entity: 'SYSTEM',
    entityName: description,
    severity,
    details,
  });
}


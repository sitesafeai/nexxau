import { prisma } from './prisma';
import { NextRequest } from 'next/server';

export type AuditAction = 
  | 'CREATE' 
  | 'UPDATE' 
  | 'DELETE' 
  | 'LOGIN' 
  | 'LOGOUT' 
  | 'INVITE' 
  | 'CLAIM_ACCOUNT'
  | 'ACKNOWLEDGE_ALERT'
  | 'RESOLVE_ALERT';

export type AuditEntity = 
  | 'User' 
  | 'Company' 
  | 'Worksite' 
  | 'Camera' 
  | 'Alert' 
  | 'AlertRule'
  | 'CustomRule'
  | 'Workflow';

interface AuditLogParams {
  userId: string;
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string;
  changes?: {
    before?: any;
    after?: any;
  };
  metadata?: any;
  request?: NextRequest;
}

/**
 * Log an audit event
 * This should be called for all important actions in the system
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const {
      userId,
      action,
      entity,
      entityId,
      changes,
      metadata,
      request
    } = params;

    // Extract IP and user agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;

    if (request) {
      // Try to get real IP from headers (for proxies/load balancers)
      ipAddress = 
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        request.ip ||
        'unknown';
      
      userAgent = request.headers.get('user-agent') || undefined;
    }

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        changes,
        ipAddress,
        userAgent,
        metadata
      }
    });

    console.log(`📝 Audit: ${action} ${entity}${entityId ? ` (${entityId})` : ''} by user ${userId}`);
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error('Failed to create audit log:', error);
  }
}

/**
 * Convenience functions for common audit actions
 */

export async function logLogin(userId: string, request?: NextRequest) {
  return logAudit({
    userId,
    action: 'LOGIN',
    entity: 'User',
    entityId: userId,
    request
  });
}

export async function logLogout(userId: string) {
  return logAudit({
    userId,
    action: 'LOGOUT',
    entity: 'User',
    entityId: userId
  });
}

export async function logCreate(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  data: any,
  request?: NextRequest
) {
  return logAudit({
    userId,
    action: 'CREATE',
    entity,
    entityId,
    changes: { after: data },
    request
  });
}

export async function logUpdate(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  before: any,
  after: any,
  request?: NextRequest
) {
  return logAudit({
    userId,
    action: 'UPDATE',
    entity,
    entityId,
    changes: { before, after },
    request
  });
}

export async function logDelete(
  userId: string,
  entity: AuditEntity,
  entityId: string,
  data: any,
  request?: NextRequest
) {
  return logAudit({
    userId,
    action: 'DELETE',
    entity,
    entityId,
    changes: { before: data },
    request
  });
}

export async function logInvite(
  userId: string,
  invitedEmail: string,
  role: string,
  request?: NextRequest
) {
  return logAudit({
    userId,
    action: 'INVITE',
    entity: 'User',
    metadata: { invitedEmail, role },
    request
  });
}

export async function logAlertAction(
  userId: string,
  action: 'ACKNOWLEDGE_ALERT' | 'RESOLVE_ALERT',
  alertId: string,
  request?: NextRequest
) {
  return logAudit({
    userId,
    action,
    entity: 'Alert',
    entityId: alertId,
    request
  });
}


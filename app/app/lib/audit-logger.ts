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
  | 'Workflow'
  | 'BillingRecord';

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
  correlationId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Log an audit event
 * This should be called for all important actions in the system
 */
// Generate correlation ID for request tracking
function generateCorrelationId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// Extract browser/OS from user agent
function parseUserAgent(userAgent?: string): { browser?: string; os?: string } {
  if (!userAgent) return {};
  
  const browserMatch = userAgent.match(/(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/);
  const osMatch = userAgent.match(/(Windows|Mac OS|Linux|iOS|Android)/);
  
  return {
    browser: browserMatch ? browserMatch[1] : undefined,
    os: osMatch ? osMatch[1] : undefined,
  };
}

// Determine severity based on action and entity
function determineSeverity(action: AuditAction, entity: AuditEntity): 'low' | 'medium' | 'high' | 'critical' {
  if (action === 'DELETE' && ['Company', 'Worksite', 'User'].includes(entity)) {
    return 'critical';
  }
  if (action === 'DELETE' || (action === 'UPDATE' && ['User', 'Company'].includes(entity))) {
    return 'high';
  }
  if (action === 'UPDATE' || action === 'CREATE') {
    return 'medium';
  }
  return 'low';
}

export async function logAudit(params: AuditLogParams): Promise<string> {
  try {
    const {
      userId,
      action,
      entity,
      entityId,
      changes,
      metadata,
      request,
      correlationId,
      severity
    } = params;

    // Extract IP and user agent from request if provided
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    let geoIP: string | undefined;
    let browserInfo: { browser?: string; os?: string } = {};

    if (request) {
      // Try to get real IP from headers (for proxies/load balancers)
      ipAddress = 
        request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        (request as any).ip ||
        'unknown';
      
      userAgent = request.headers.get('user-agent') || undefined;
      browserInfo = parseUserAgent(userAgent);
      
      // Geo-IP would be determined by IP lookup service (placeholder)
      // In production, use a service like MaxMind GeoIP2
      geoIP = ipAddress !== 'unknown' ? 'US' : undefined; // Placeholder
    }

    // Generate correlation ID if not provided
    const finalCorrelationId = correlationId || generateCorrelationId();
    
    // Determine severity if not provided
    const finalSeverity = severity || determineSeverity(action, entity);

    // Enhanced metadata with correlation ID, severity, and browser info
    const enhancedMetadata = {
      ...metadata,
      correlationId: finalCorrelationId,
      severity: finalSeverity,
      browser: browserInfo.browser,
      os: browserInfo.os,
      geoIP,
    };

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        changes,
        ipAddress,
        userAgent,
        metadata: enhancedMetadata
      }
    });

    console.log(`📝 Audit [${finalSeverity.toUpperCase()}]: ${action} ${entity}${entityId ? ` (${entityId})` : ''} by user ${userId} [${finalCorrelationId}]`);
    
    return finalCorrelationId;
  } catch (error) {
    // Don't throw - audit logging should never break the main flow
    console.error('Failed to create audit log:', error);
    return '';
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


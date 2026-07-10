/**
 * Shared audit log helper.
 *
 * The AuditLog Prisma model has these columns:
 *   userId, worksiteId, action, entity, entityId, changes, ipAddress, userAgent, metadata, createdAt
 *
 * Extra fields (entityName, severity, result, companyId, details) are stored inside
 * the `metadata` JSON column and flattened back out by the GET /api/audit handler.
 */

import { prisma } from './prisma';

export interface AuditOptions {
  userId?: string | null;
  worksiteId?: string | null;
  action: string;
  entity: string; // keep uppercase: CAMERA | USER | RULE | INTEGRATION | SYSTEM | ALERT
  entityId?: string | null;
  entityName?: string | null;
  companyId?: string | null;
  severity?: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  result?: 'SUCCESS' | 'FAILURE';
  details?: Record<string, any>;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes?: { old?: any; new?: any };
}

/**
 * Write an audit log entry. Never throws — errors are swallowed so callers
 * are never blocked by audit failures.
 */
export async function writeAuditLog(opts: AuditOptions): Promise<void> {
  try {
    const {
      changes,
      details,
      entityName,
      companyId,
      severity,
      result,
      entity,
      ...rest
    } = opts;

    await prisma.auditLog.create({
      data: {
        ...rest,
        entity: entity.toUpperCase(),
        changes: changes ? { old: changes.old ?? {}, new: changes.new ?? {} } : undefined,
        metadata: {
          entityName: entityName ?? null,
          companyId: companyId ?? null,
          severity: severity ?? 'INFO',
          result: result ?? 'SUCCESS',
          details: details ?? null,
        },
      },
    });
  } catch (err) {
    console.error('[AuditLog] Failed to write audit log:', err);
  }
}

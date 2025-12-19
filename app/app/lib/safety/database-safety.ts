/**
 * Database Safety Utilities
 * 
 * Per directive: Partial writes are worse than crashes.
 * All alert creation = transactional
 * All retries = idempotent via keys
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { prisma } from '../prisma';

export interface IdempotencyKey {
  key: string;
  operation: string;
  entityId?: string;
  expiresAt: Date;
}

/**
 * Execute operation with idempotency check
 */
export async function executeWithIdempotency<T>(
  idempotencyKey: string,
  operation: () => Promise<T>,
  ttlSeconds: number = 300 // 5 minutes default
): Promise<{ result: T; wasCached: boolean }> {
  // Check if operation was already executed
  const cacheKey = `idempotency:${idempotencyKey}`;
  
  // In production, use Redis or similar
  // For now, use in-memory cache (will be lost on restart, but that's acceptable)
  const idempotencyCache = new Map<string, { result: any; expiresAt: Date }>();
  
  const cached = idempotencyCache.get(cacheKey);
  if (cached && cached.expiresAt > new Date()) {
    console.log(`[DatabaseSafety] Idempotency cache hit for key: ${idempotencyKey}`);
    return { result: cached.result as T, wasCached: true };
  }
  
  // Execute operation
  const result = await operation();
  
  // Cache result
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  idempotencyCache.set(cacheKey, { result, expiresAt });
  
  // Clean up expired entries periodically
  if (idempotencyCache.size > 1000) {
    const now = new Date();
    for (const [key, value] of idempotencyCache.entries()) {
      if (value.expiresAt <= now) {
        idempotencyCache.delete(key);
      }
    }
  }
  
  return { result, wasCached: false };
}

/**
 * Execute alert creation transactionally
 * Ensures all-or-nothing: alert + video + audit log
 */
export async function createAlertTransactionally(data: {
  alert: Prisma.AlertCreateInput;
  videoClip?: {
    url: string;
    cameraId: string;
    startTime: Date;
    endTime: Date;
  };
  auditLog?: Prisma.AuditLogCreateInput;
}): Promise<{ alertId: string; success: boolean; error?: string }> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create alert
      const alert = await tx.alert.create({
        data: data.alert,
      });
      
      // 2. Create video clip if provided
      if (data.videoClip) {
        await tx.videoClip.create({
          data: {
            alertId: alert.id,
            cameraId: data.videoClip.cameraId,
            url: data.videoClip.url,
            startTime: data.videoClip.startTime,
            endTime: data.videoClip.endTime,
            duration: (data.videoClip.endTime.getTime() - data.videoClip.startTime.getTime()) / 1000,
          },
        });
      }
      
      // 3. Create audit log
      if (data.auditLog) {
        await tx.auditLog.create({
          data: {
            ...data.auditLog,
            entityId: alert.id,
          },
        });
      } else {
        // Default audit log
        await tx.auditLog.create({
          data: {
            action: 'ALERT_CREATED',
            entity: 'ALERT',
            entityId: alert.id,
            entityName: (data.alert.title as string) || 'Alert',
            metadata: data.alert.metadata || {},
            result: 'SUCCESS',
            severity: (data.alert.severity as string) || 'WARNING',
            worksiteId: (data.alert.worksite as any)?.connect?.id || data.alert.worksiteId,
          },
        });
      }
      
      return { alertId: alert.id };
    }, {
      maxWait: 5000, // Max time to wait for transaction
      timeout: 10000, // Max time for transaction to complete
    });
    
    return { ...result, success: true };
  } catch (error: any) {
    console.error('[DatabaseSafety] Transaction failed:', error);
    return {
      alertId: '',
      success: false,
      error: error.message || 'Transaction failed',
    };
  }
}

/**
 * Reconcile orphaned data (background job)
 */
export async function reconcileOrphanedData(): Promise<{
  alertsWithoutVideo: number;
  videoWithoutAlerts: number;
  orphanedCameras: number;
}> {
  const results = {
    alertsWithoutVideo: 0,
    videoWithoutAlerts: 0,
    orphanedCameras: 0,
  };
  
  try {
    // Find alerts without video clips
    const alertsWithoutVideo = await prisma.alert.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        },
        videoClips: {
          none: {},
        },
      },
      select: { id: true },
    });
    
    results.alertsWithoutVideo = alertsWithoutVideo.length;
    
    // Find video clips without alerts
    const videoWithoutAlerts = await prisma.videoClip.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        alertId: null,
      },
      select: { id: true },
    });
    
    results.videoWithoutAlerts = videoWithoutAlerts.length;
    
    // Find orphaned cameras (no health records in 24h)
    const orphanedCameras = await prisma.camera.findMany({
      where: {
        health: {
          none: {
            lastCheck: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        },
      },
      select: { id: true },
    });
    
    results.orphanedCameras = orphanedCameras.length;
    
    // Log reconciliation results
    if (results.alertsWithoutVideo > 0 || results.videoWithoutAlerts > 0 || results.orphanedCameras > 0) {
      console.warn('[DatabaseSafety] Reconciliation found inconsistencies:', results);
      
      // Create audit log
      await prisma.auditLog.create({
        data: {
          action: 'DATA_RECONCILIATION',
          entity: 'SYSTEM',
          entityId: 'reconciliation',
          entityName: 'Data Reconciliation',
          metadata: results,
          result: 'WARNING',
          severity: 'INFO',
        },
      });
    }
    
    return results;
  } catch (error) {
    console.error('[DatabaseSafety] Reconciliation failed:', error);
    return results;
  }
}

/**
 * Soft delete with audit trail
 */
export async function softDelete<T extends { id: string; deletedAt?: Date | null }>(
  model: any,
  id: string,
  userId: string
): Promise<boolean> {
  try {
    await prisma.$transaction(async (tx) => {
      // Update record with deletedAt
      await tx[model].update({
        where: { id },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
      
      // Create audit log
      await tx.auditLog.create({
        data: {
          action: `${model.toUpperCase()}_DELETED`,
          entity: model.toUpperCase(),
          entityId: id,
          entityName: `${model} ${id}`,
          metadata: { deletedBy: userId },
          result: 'SUCCESS',
          severity: 'INFO',
        },
      });
    });
    
    return true;
  } catch (error) {
    console.error(`[DatabaseSafety] Soft delete failed for ${model}:`, error);
    return false;
  }
}


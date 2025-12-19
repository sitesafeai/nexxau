/**
 * Camera Watchdog System
 * 
 * Monitors camera health and implements circuit breakers.
 * Per directive: One camera = one isolated execution context.
 * Failures must not cascade to other cameras.
 */

import { prisma } from '../prisma';

export interface CameraHealthMetrics {
  cameraId: string;
  lastValidFrame: Date | null;
  consecutiveFailures: number;
  totalFrames: number;
  failedFrames: number;
  status: 'HEALTHY' | 'DEGRADED' | 'FAILED' | 'DISABLED';
  lastStatusChange: Date;
  degradedAt: Date | null;
  failedAt: Date | null;
}

export interface WatchdogConfig {
  maxConsecutiveFailures: number; // Default: 5
  degradedThresholdSeconds: number; // Default: 30 seconds without valid frame
  failedThresholdSeconds: number; // Default: 120 seconds without valid frame
  healthCheckIntervalMs: number; // Default: 5000ms
  autoDisableOnFailure: boolean; // Default: true
}

const DEFAULT_CONFIG: WatchdogConfig = {
  maxConsecutiveFailures: 5,
  degradedThresholdSeconds: 30,
  failedThresholdSeconds: 120,
  healthCheckIntervalMs: 5000,
  autoDisableOnFailure: true,
};

class CameraWatchdog {
  private static instance: CameraWatchdog;
  private healthMetrics: Map<string, CameraHealthMetrics> = new Map();
  private config: WatchdogConfig;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly logContext = '[CameraWatchdog]';

  private constructor(config: Partial<WatchdogConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  public static getInstance(config?: Partial<WatchdogConfig>): CameraWatchdog {
    if (!CameraWatchdog.instance) {
      CameraWatchdog.instance = new CameraWatchdog(config);
    }
    return CameraWatchdog.instance;
  }

  /**
   * Record a valid frame from a camera
   * Resets failure counters and updates health status
   */
  public recordValidFrame(cameraId: string, timestamp: Date = new Date()): void {
    const metrics = this.getOrCreateMetrics(cameraId);
    
    metrics.lastValidFrame = timestamp;
    metrics.totalFrames++;
    
    // Reset failure counters on valid frame
    if (metrics.consecutiveFailures > 0) {
      console.log(`${this.logContext} Camera ${cameraId}: Valid frame received, resetting failure counter`);
      metrics.consecutiveFailures = 0;
    }
    
    // Upgrade status if we were degraded/failed
    if (metrics.status !== 'HEALTHY') {
      const previousStatus = metrics.status;
      metrics.status = 'HEALTHY';
      metrics.lastStatusChange = timestamp;
      metrics.degradedAt = null;
      metrics.failedAt = null;
      
      console.log(`${this.logContext} Camera ${cameraId}: Status upgraded from ${previousStatus} to HEALTHY`);
      
      // Update database
      this.updateCameraStatusInDB(cameraId, 'online').catch(err => {
        console.error(`${this.logContext} Failed to update camera status in DB:`, err);
      });
    }
    
    this.healthMetrics.set(cameraId, metrics);
  }

  /**
   * Record a failed frame from a camera
   * Increments failure counters and may trigger status changes
   */
  public recordFailedFrame(cameraId: string, reason: string, timestamp: Date = new Date()): void {
    const metrics = this.getOrCreateMetrics(cameraId);
    
    metrics.consecutiveFailures++;
    metrics.failedFrames++;
    metrics.totalFrames++;
    
    console.warn(`${this.logContext} Camera ${cameraId}: Frame failure #${metrics.consecutiveFailures} - ${reason}`);
    
    // Check if we should mark as degraded
    if (metrics.status === 'HEALTHY' && metrics.consecutiveFailures >= this.config.maxConsecutiveFailures) {
      metrics.status = 'DEGRADED';
      metrics.degradedAt = timestamp;
      metrics.lastStatusChange = timestamp;
      
      console.error(`${this.logContext} Camera ${cameraId}: Marked as DEGRADED after ${metrics.consecutiveFailures} consecutive failures`);
      
      // Update database
      this.updateCameraStatusInDB(cameraId, 'error').catch(err => {
        console.error(`${this.logContext} Failed to update camera status in DB:`, err);
      });
    }
    
    // Check if we should mark as failed and disable
    if (metrics.status === 'DEGRADED' && this.config.autoDisableOnFailure) {
      // Additional check: if degraded for too long, mark as failed
      const timeSinceDegraded = metrics.degradedAt 
        ? (timestamp.getTime() - metrics.degradedAt.getTime()) / 1000
        : 0;
      
      if (timeSinceDegraded > this.config.failedThresholdSeconds) {
        metrics.status = 'FAILED';
        metrics.failedAt = timestamp;
        metrics.lastStatusChange = timestamp;
        
        console.error(`${this.logContext} Camera ${cameraId}: Marked as FAILED after ${timeSinceDegraded}s in DEGRADED state`);
        
        // Disable camera in database
        this.disableCamera(cameraId, 'Auto-disabled due to persistent failures').catch(err => {
          console.error(`${this.logContext} Failed to disable camera in DB:`, err);
        });
      }
    }
    
    this.healthMetrics.set(cameraId, metrics);
  }

  /**
   * Check if a camera is healthy and can process frames
   */
  public isCameraHealthy(cameraId: string): boolean {
    const metrics = this.healthMetrics.get(cameraId);
    if (!metrics) {
      return true; // Unknown cameras are assumed healthy
    }
    
    return metrics.status === 'HEALTHY';
  }

  /**
   * Check if a camera is disabled (circuit breaker open)
   */
  public isCameraDisabled(cameraId: string): boolean {
    const metrics = this.healthMetrics.get(cameraId);
    if (!metrics) {
      return false;
    }
    
    return metrics.status === 'DISABLED' || metrics.status === 'FAILED';
  }

  /**
   * Get current health metrics for a camera
   */
  public getHealthMetrics(cameraId: string): CameraHealthMetrics | null {
    return this.healthMetrics.get(cameraId) || null;
  }

  /**
   * Manually disable a camera (circuit breaker)
   */
  public async disableCamera(cameraId: string, reason: string): Promise<void> {
    const metrics = this.getOrCreateMetrics(cameraId);
    metrics.status = 'DISABLED';
    metrics.lastStatusChange = new Date();
    
    this.healthMetrics.set(cameraId, metrics);
    
    // Update database
    await this.updateCameraStatusInDB(cameraId, 'offline');
    
    // Log to audit
    try {
      await prisma.auditLog.create({
        data: {
          action: 'CAMERA_DISABLED',
          entity: 'CAMERA',
          entityId: cameraId,
          entityName: `Camera ${cameraId}`,
          metadata: { reason, disabledBy: 'system' },
          result: 'SUCCESS',
          severity: 'WARNING',
        },
      });
    } catch (err) {
      console.error(`${this.logContext} Failed to create audit log:`, err);
    }
    
    console.error(`${this.logContext} Camera ${cameraId}: DISABLED - ${reason}`);
  }

  /**
   * Manually re-enable a camera (circuit breaker reset)
   * Requires explicit action - cameras don't auto-re-enable
   */
  public async enableCamera(cameraId: string, userId: string): Promise<void> {
    const metrics = this.getOrCreateMetrics(cameraId);
    
    // Reset metrics
    metrics.status = 'HEALTHY';
    metrics.consecutiveFailures = 0;
    metrics.lastValidFrame = new Date();
    metrics.lastStatusChange = new Date();
    metrics.degradedAt = null;
    metrics.failedAt = null;
    
    this.healthMetrics.set(cameraId, metrics);
    
    // Update database
    await this.updateCameraStatusInDB(cameraId, 'online');
    
    // Log to audit
    try {
      await prisma.auditLog.create({
        data: {
          action: 'CAMERA_ENABLED',
          entity: 'CAMERA',
          entityId: cameraId,
          entityName: `Camera ${cameraId}`,
          metadata: { enabledBy: userId },
          result: 'SUCCESS',
          severity: 'INFO',
        },
      });
    } catch (err) {
      console.error(`${this.logContext} Failed to create audit log:`, err);
    }
    
    console.log(`${this.logContext} Camera ${cameraId}: ENABLED by ${userId}`);
  }

  /**
   * Start periodic health checks
   */
  public startHealthChecks(): void {
    if (this.healthCheckInterval) {
      return; // Already running
    }
    
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);
    
    console.log(`${this.logContext} Health checks started (interval: ${this.config.healthCheckIntervalMs}ms)`);
  }

  /**
   * Stop periodic health checks
   */
  public stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      console.log(`${this.logContext} Health checks stopped`);
    }
  }

  /**
   * Perform health check on all monitored cameras
   */
  private async performHealthChecks(): Promise<void> {
    const now = new Date();
    
    for (const [cameraId, metrics] of this.healthMetrics.entries()) {
      // Skip if already disabled
      if (metrics.status === 'DISABLED' || metrics.status === 'FAILED') {
        continue;
      }
      
      // Check if camera hasn't sent valid frames recently
      if (metrics.lastValidFrame) {
        const secondsSinceLastFrame = (now.getTime() - metrics.lastValidFrame.getTime()) / 1000;
        
        // Mark as degraded if threshold exceeded
        if (metrics.status === 'HEALTHY' && secondsSinceLastFrame > this.config.degradedThresholdSeconds) {
          metrics.status = 'DEGRADED';
          metrics.degradedAt = now;
          metrics.lastStatusChange = now;
          
          console.warn(`${this.logContext} Camera ${cameraId}: Auto-marked as DEGRADED (no frames for ${secondsSinceLastFrame.toFixed(1)}s)`);
          
          await this.updateCameraStatusInDB(cameraId, 'error').catch(err => {
            console.error(`${this.logContext} Failed to update camera status:`, err);
          });
        }
        
        // Mark as failed if threshold exceeded
        if (metrics.status === 'DEGRADED' && secondsSinceLastFrame > this.config.failedThresholdSeconds) {
          metrics.status = 'FAILED';
          metrics.failedAt = now;
          metrics.lastStatusChange = now;
          
          console.error(`${this.logContext} Camera ${cameraId}: Auto-marked as FAILED (no frames for ${secondsSinceLastFrame.toFixed(1)}s)`);
          
          if (this.config.autoDisableOnFailure) {
            await this.disableCamera(cameraId, `No valid frames for ${secondsSinceLastFrame.toFixed(1)} seconds`).catch(err => {
              console.error(`${this.logContext} Failed to disable camera:`, err);
            });
          }
        }
      }
    }
  }

  /**
   * Get or create health metrics for a camera
   */
  private getOrCreateMetrics(cameraId: string): CameraHealthMetrics {
    if (!this.healthMetrics.has(cameraId)) {
      const now = new Date();
      this.healthMetrics.set(cameraId, {
        cameraId,
        lastValidFrame: null,
        consecutiveFailures: 0,
        totalFrames: 0,
        failedFrames: 0,
        status: 'HEALTHY',
        lastStatusChange: now,
        degradedAt: null,
        failedAt: null,
      });
    }
    
    return this.healthMetrics.get(cameraId)!;
  }

  /**
   * Update camera status in database
   */
  private async updateCameraStatusInDB(cameraId: string, status: 'online' | 'offline' | 'error'): Promise<void> {
    try {
      await prisma.camera.update({
        where: { id: cameraId },
        data: { 
          status,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      // Don't throw - database failures shouldn't crash the watchdog
      console.error(`${this.logContext} Database update failed for camera ${cameraId}:`, err);
    }
  }
}

// Export singleton instance
export const cameraWatchdog = CameraWatchdog.getInstance();

// Auto-start health checks when module loads
if (typeof window === 'undefined') {
  // Server-side only
  cameraWatchdog.startHealthChecks();
}


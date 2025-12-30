import { createLogger, Logger } from '@nexxau/logger';
import { FFmpegManager } from './ffmpeg-manager';
import { FrameWatcher } from './frame-watcher';
import { FPSController } from './fps-controller';
import { CameraConfig, CameraState, CameraStatus, Heartbeat } from './types';

/**
 * Manages camera lifecycle and heartbeats
 */
export class CameraManager {
  private logger: Logger;
  private ffmpegManager: FFmpegManager;
  private frameWatcher: FrameWatcher;
  private fpsController: FPSController;
  private heartbeatInterval?: NodeJS.Timeout;
  private fpsUpdateInterval?: NodeJS.Timeout;

  constructor(logger: Logger, ffmpegManager: FFmpegManager, frameWatcher: FrameWatcher) {
    this.logger = logger;
    this.ffmpegManager = ffmpegManager;
    this.frameWatcher = frameWatcher;
    this.fpsController = new FPSController();
  }

  /**
   * Add/start a camera
   */
  async addCamera(config: CameraConfig): Promise<void> {
    this.logger.info('Adding camera', {
      cameraId: config.id,
      tenantId: config.tenantId,
    });

    await this.ffmpegManager.startCamera(config);
    
    // Start watching frame output directory
    this.frameWatcher.startWatching(config);
    
    this.startHeartbeatEmitter();
    this.startFPSUpdateLoop();
  }

  /**
   * Remove/stop a camera
   */
  removeCamera(cameraId: string): void {
    this.logger.info('Removing camera', { cameraId });
    this.ffmpegManager.stopCamera(cameraId);
    this.frameWatcher.stopWatching(cameraId);
  }

  /**
   * Get camera state
   */
  getCameraState(cameraId: string): CameraState | undefined {
    return this.ffmpegManager.getCameraState(cameraId);
  }

  /**
   * Get all camera states
   */
  getAllCameraStates(): Map<string, CameraState> {
    return this.ffmpegManager.getAllCameraStates();
  }

  /**
   * Start heartbeat emitter (emits every 5 seconds)
   */
  private startHeartbeatEmitter(): void {
    // Only start one heartbeat interval
    if (this.heartbeatInterval) {
      return;
    }

    this.logger.info('Starting heartbeat emitter');

    this.heartbeatInterval = setInterval(() => {
      this.emitHeartbeats();
    }, 5000); // 5 seconds
  }

  /**
   * Stop heartbeat emitter
   */
  stopHeartbeatEmitter(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
      this.logger.info('Stopped heartbeat emitter');
    }
  }

  /**
   * Emit heartbeat for all active cameras
   */
  private emitHeartbeats(): void {
    const cameras = this.ffmpegManager.getAllCameraStates();

    for (const [cameraId, state] of cameras) {
      if (state.status === CameraStatus.STOPPED) {
        continue;
      }

      const now = new Date();
      const uptime = state.startedAt
        ? Math.floor((now.getTime() - state.startedAt.getTime()) / 1000)
        : undefined;

      // Reset failure count on successful heartbeat (process is still running)
      if (state.status === CameraStatus.RUNNING && state.process && !state.process.killed) {
        this.ffmpegManager.resetFailureCount(cameraId);
      }

      const heartbeat: Heartbeat = {
        cameraId,
        tenantId: state.config.tenantId,
        timestamp: now,
        status: state.status,
        uptime,
      };

      state.lastHeartbeat = now;

      this.logger.info('Camera heartbeat', {
        cameraId,
        tenantId: state.config.tenantId,
        status: state.status,
        uptime,
        failureCount: state.failureCount,
      });

      // In future: emit to event bus/queue
      // For now, just log the heartbeat
    }
  }

  /**
   * Get current FPS for a camera based on system load
   */
  private getCurrentFPS(cameraId: string): number {
    // Get frame backlog for camera (if available from Redis or local tracking)
    // For now, return undefined - controller will use CPU/memory only
    const frameBacklog = this.getFrameBacklog(cameraId);
    return this.fpsController.getCurrentFPS(frameBacklog);
  }

  /**
   * Get frame backlog for camera (placeholder - implement Redis check if needed)
   */
  private getFrameBacklog(cameraId: string): number | undefined {
    // Option 1: Get from Redis stream length
    // Option 2: Track locally
    // For now, return undefined (controller will use CPU/memory only)
    return undefined;
  }

  /**
   * Update FPS for all cameras based on system load
   */
  private updateCameraFPS(): void {
    const cameras = this.ffmpegManager.getAllCameraStates();

    for (const [cameraId, state] of cameras.entries()) {
      if (state.status !== CameraStatus.RUNNING) {
        continue;
      }

      const currentFPS = this.getCurrentFPS(cameraId);
      const configuredFPS = state.config.fps || 1;

      // Update if FPS changed significantly (>10% difference)
      if (Math.abs(currentFPS - configuredFPS) > configuredFPS * 0.1) {
        this.logger.info('Updating camera FPS', {
          cameraId,
          oldFPS: configuredFPS,
          newFPS: currentFPS
        });

        // Update FFmpeg with new FPS
        this.ffmpegManager.updateFPS(cameraId, currentFPS);

        // Update config (will be persisted in next state update)
        state.config.fps = currentFPS;
      }
    }
  }

  /**
   * Start FPS update loop
   */
  private startFPSUpdateLoop(): void {
    // Only start one FPS update interval
    if (this.fpsUpdateInterval) {
      return;
    }

    this.logger.info('Starting FPS update loop');

    // Start periodic FPS update (every 30 seconds)
    this.fpsUpdateInterval = setInterval(() => {
      this.updateCameraFPS();
    }, 30000); // 30 seconds
  }

  /**
   * Stop FPS update loop
   */
  private stopFPSUpdateLoop(): void {
    if (this.fpsUpdateInterval) {
      clearInterval(this.fpsUpdateInterval);
      this.fpsUpdateInterval = undefined;
      this.logger.info('Stopped FPS update loop');
    }
  }

  /**
   * Shutdown manager
   */
  shutdown(): void {
    this.logger.info('Shutting down camera manager');
    this.stopFPSUpdateLoop();
    this.stopHeartbeatEmitter();
    this.frameWatcher.shutdown();
    this.ffmpegManager.shutdown();
  }
}

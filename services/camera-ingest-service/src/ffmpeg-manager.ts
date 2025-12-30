import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { createLogger, Logger } from '@nexxau/logger';
import { CameraConfig, CameraStatus, CameraState } from './types';

const MAX_RESTART_ATTEMPTS = 5;
const INITIAL_BACKOFF_MS = 1000; // 1 second
const MAX_BACKOFF_MS = 60000; // 60 seconds
const DEGRADED_THRESHOLD = 3; // Mark as DEGRADED after 3 consecutive failures

/**
 * Manages FFmpeg processes for camera ingestion
 */
export class FFmpegManager {
  private logger: Logger;
  private cameras: Map<string, CameraState> = new Map();
  private restartTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Start ingesting from a camera
   */
  async startCamera(config: CameraConfig): Promise<void> {
    const cameraId = config.id;
    const fps = config.fps || 1;
    const outputPath = config.frameOutputPath || `/tmp/frames/${cameraId}`;

    // Ensure output directory exists
    if (!existsSync(outputPath)) {
      mkdirSync(outputPath, { recursive: true });
      this.logger.info('Created frame output directory', { cameraId, outputPath });
    }

    // Initialize or update camera state
    const existingState = this.cameras.get(cameraId);
    const state: CameraState = {
      config,
      status: CameraStatus.RUNNING,
      failureCount: existingState?.failureCount || 0,
      lastFailureAt: existingState?.lastFailureAt,
      startedAt: new Date(),
      restartAttempt: 0,
    };

    this.cameras.set(cameraId, state);

    this.logger.info('Starting camera ingestion', {
      cameraId,
      tenantId: config.tenantId,
      rtspUrl: config.rtspUrl,
      fps,
      outputPath,
    });

    this.spawnFFmpeg(cameraId, config.rtspUrl, fps, outputPath);
  }

  /**
   * Update FPS for a running camera
   */
  updateFPS(cameraId: string, newFPS: number): void {
    const state = this.cameras.get(cameraId);
    if (!state) {
      this.logger.warn('Camera not found for FPS update', { cameraId });
      return;
    }

    if (state.status !== CameraStatus.RUNNING) {
      this.logger.warn('Camera not running, cannot update FPS', { cameraId });
      return;
    }

    // Stop current process
    this.stopCamera(cameraId);

    // Update config
    state.config.fps = newFPS;

    // Restart with new FPS
    this.startCamera(state.config);
  }

  /**
   * Stop ingesting from a camera
   */
  stopCamera(cameraId: string): void {
    const state = this.cameras.get(cameraId);
    if (!state) {
      this.logger.warn('Camera not found', { cameraId });
      return;
    }

    // Clear any pending restart
    const timeout = this.restartTimeouts.get(cameraId);
    if (timeout) {
      clearTimeout(timeout);
      this.restartTimeouts.delete(cameraId);
    }

    // Kill FFmpeg process
    if (state.process) {
      this.logger.info('Stopping camera ingestion', { cameraId });
      state.process.kill('SIGTERM');
      
      // Force kill if not terminated within 5 seconds
      setTimeout(() => {
        if (state.process && !state.process.killed) {
          this.logger.warn('Force killing FFmpeg process', { cameraId });
          state.process.kill('SIGKILL');
        }
      }, 5000);
    }

    state.status = CameraStatus.STOPPED;
    state.process = undefined;
    this.cameras.set(cameraId, state);
  }

  /**
   * Get camera state
   */
  getCameraState(cameraId: string): CameraState | undefined {
    return this.cameras.get(cameraId);
  }

  /**
   * Get all camera states
   */
  getAllCameraStates(): Map<string, CameraState> {
    return this.cameras;
  }

  /**
   * Spawn FFmpeg process for camera
   */
  private spawnFFmpeg(
    cameraId: string,
    rtspUrl: string,
    fps: number,
    outputPath: string
  ): void {
    const state = this.cameras.get(cameraId);
    if (!state) {
      this.logger.error('Camera state not found', { cameraId });
      return;
    }

    // FFmpeg command to extract JPEG frames from RTSP stream
    // -rtsp_transport tcp: Use TCP transport for reliability
    // -i {rtspUrl}: Input RTSP stream
    // -vf fps={fps}: Extract frames at specified FPS
    // -q:v 2: High quality JPEG (scale 2-31, lower is better)
    // -y: Overwrite output files
    // Using sequential frame numbering (frame_00001.jpg, frame_00002.jpg, ...)
    const outputPattern = join(outputPath, 'frame_%05d.jpg');

    const ffmpegArgs = [
      '-rtsp_transport', 'tcp', // Use TCP for reliability
      '-i', rtspUrl, // Input RTSP URL
      '-vf', `fps=${fps}`, // Extract frames at specified FPS
      '-q:v', '2', // High quality JPEG (1-31, lower is better)
      '-y', // Overwrite existing files
      outputPattern,
    ];

    this.logger.debug('Spawning FFmpeg process', {
      cameraId,
      command: `ffmpeg ${ffmpegArgs.join(' ')}`,
    });

    const process = spawn('ffmpeg', ffmpegArgs);

    state.process = process;
    state.status = CameraStatus.RUNNING;
    this.cameras.set(cameraId, state);

    // Track stdout/stderr
    let stderrBuffer = '';

    process.stdout?.on('data', (data: Buffer) => {
      this.logger.debug('FFmpeg stdout', { cameraId, output: data.toString() });
    });

    process.stderr?.on('data', (data: Buffer) => {
      // FFmpeg writes to stderr for both errors and info
      stderrBuffer += data.toString();
    });

    process.on('error', (error: Error) => {
      this.logger.error('FFmpeg process error', { cameraId }, error);
      this.handleProcessFailure(cameraId, error.message);
    });

    process.on('exit', (code: number | null, signal: string | null) => {
      if (code !== 0 && code !== null) {
        this.logger.error('FFmpeg process exited with error', {
          cameraId,
          exitCode: code,
          signal,
          stderr: stderrBuffer.slice(-500), // Last 500 chars of stderr
        });
        this.handleProcessFailure(cameraId, `Exit code: ${code}`);
      } else if (signal) {
        this.logger.info('FFmpeg process terminated by signal', {
          cameraId,
          signal,
        });
      } else {
        this.logger.info('FFmpeg process exited normally', { cameraId, code });
      }

      // Clear process reference
      const currentState = this.cameras.get(cameraId);
      if (currentState) {
        currentState.process = undefined;
        this.cameras.set(cameraId, currentState);
      }
    });

    this.logger.info('FFmpeg process spawned', {
      cameraId,
      pid: process.pid,
      fps,
      outputPath,
    });
  }

  /**
   * Handle FFmpeg process failure with exponential backoff
   */
  private handleProcessFailure(cameraId: string, error: string): void {
    const state = this.cameras.get(cameraId);
    if (!state) {
      this.logger.error('Camera state not found during failure handling', { cameraId });
      return;
    }

    state.failureCount += 1;
    state.lastFailureAt = new Date();
    const restartAttempt = (state.restartAttempt || 0) + 1;

    // Mark as DEGRADED after threshold failures
    if (state.failureCount >= DEGRADED_THRESHOLD) {
      state.status = CameraStatus.DEGRADED;
      this.logger.warn('Camera marked as DEGRADED', {
        cameraId,
        failureCount: state.failureCount,
        threshold: DEGRADED_THRESHOLD,
      });
    } else {
      state.status = CameraStatus.FAILING;
    }

    // Stop restarting after max attempts
    if (restartAttempt > MAX_RESTART_ATTEMPTS) {
      state.status = CameraStatus.DEGRADED;
      this.logger.error('Max restart attempts reached, stopping retries', {
        cameraId,
        restartAttempt,
        maxAttempts: MAX_RESTART_ATTEMPTS,
      });
      this.cameras.set(cameraId, state);
      return;
    }

    // Calculate exponential backoff: min(initial * 2^(attempt-1), max)
    const backoffMs = Math.min(
      INITIAL_BACKOFF_MS * Math.pow(2, restartAttempt - 1),
      MAX_BACKOFF_MS
    );

    state.restartAttempt = restartAttempt;
    this.cameras.set(cameraId, state);

    this.logger.info('Scheduling FFmpeg restart with exponential backoff', {
      cameraId,
      restartAttempt,
      backoffMs,
      failureCount: state.failureCount,
    });

    // Schedule restart
    const timeout = setTimeout(() => {
      this.restartTimeouts.delete(cameraId);
      this.logger.info('Restarting FFmpeg after backoff', {
        cameraId,
        restartAttempt,
      });
      this.spawnFFmpeg(
        cameraId,
        state.config.rtspUrl,
        state.config.fps || 1,
        state.config.frameOutputPath || `/tmp/frames/${cameraId}`
      );
    }, backoffMs);

    this.restartTimeouts.set(cameraId, timeout);
  }

  /**
   * Reset failure count (called on successful operation)
   */
  resetFailureCount(cameraId: string): void {
    const state = this.cameras.get(cameraId);
    if (state) {
      state.failureCount = 0;
      state.restartAttempt = 0;
      if (state.status === CameraStatus.DEGRADED || state.status === CameraStatus.FAILING) {
        state.status = CameraStatus.RUNNING;
      }
      this.cameras.set(cameraId, state);
    }
  }

  /**
   * Cleanup all cameras (for graceful shutdown)
   */
  shutdown(): void {
    this.logger.info('Shutting down FFmpeg manager', {
      cameraCount: this.cameras.size,
    });

    // Clear all restart timeouts
    for (const timeout of this.restartTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.restartTimeouts.clear();

    // Stop all cameras
    for (const cameraId of this.cameras.keys()) {
      this.stopCamera(cameraId);
    }
  }
}

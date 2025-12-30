import { watch, FSWatcher } from 'chokidar';
import { join, basename } from 'path';
import { createLogger, Logger } from '@nexxau/logger';
import { RedisStreamManager } from './redis-stream-manager';
import { CameraConfig } from './types';

/**
 * Watches frame output directory and pushes new frames to Redis
 */
export class FrameWatcher {
  private logger: Logger;
  private redisStreamManager: RedisStreamManager;
  private watchers: Map<string, FSWatcher> = new Map();
  private processedFiles: Set<string> = new Set();

  constructor(logger: Logger, redisStreamManager: RedisStreamManager) {
    this.logger = logger;
    this.redisStreamManager = redisStreamManager;
  }

  /**
   * Start watching a camera's frame output directory
   */
  startWatching(config: CameraConfig): void {
    const cameraId = config.id;
    const outputPath = config.frameOutputPath || `/tmp/frames/${cameraId}`;

    // Stop existing watcher if any
    this.stopWatching(cameraId);

    this.logger.info('Starting frame watcher', {
      cameraId,
      tenantId: config.tenantId,
      outputPath,
    });

    // Watch for new files (only .jpg files)
    const watcher = watch(join(outputPath, '*.jpg'), {
      ignored: /(^|[\/\\])\../, // Ignore dotfiles
      persistent: true,
      ignoreInitial: true, // Don't process existing files
      awaitWriteFinish: {
        stabilityThreshold: 100, // Wait 100ms after file write completes
        pollInterval: 50,
      },
    });

    watcher.on('add', async (filePath: string) => {
      await this.handleNewFrame(config, filePath);
    });

    watcher.on('error', (error: Error) => {
      this.logger.error('Frame watcher error', { cameraId, outputPath }, error);
    });

    this.watchers.set(cameraId, watcher);

    this.logger.info('Frame watcher started', { cameraId, outputPath });
  }

  /**
   * Stop watching a camera's frame output directory
   */
  stopWatching(cameraId: string): void {
    const watcher = this.watchers.get(cameraId);
    if (watcher) {
      watcher.close();
      this.watchers.delete(cameraId);
      this.logger.info('Frame watcher stopped', { cameraId });
    }
  }

  /**
   * Handle new frame file
   */
  private async handleNewFrame(config: CameraConfig, filePath: string): Promise<void> {
    const cameraId = config.id;
    const fileName = basename(filePath);

    // Skip if already processed (avoid duplicates)
    if (this.processedFiles.has(filePath)) {
      return;
    }

    try {
      // Extract sequence number from filename (e.g., "frame_00042.jpg" -> 42)
      const sequenceMatch = fileName.match(/frame_(\d+)\.jpg$/i);
      const sequence = sequenceMatch ? parseInt(sequenceMatch[1], 10) : 0;

      this.logger.debug('Processing new frame', {
        cameraId,
        tenantId: config.tenantId,
        filePath,
        fileName,
        sequence,
      });

      // Push frame reference to Redis stream (file path only, no binary data)
      await this.redisStreamManager.pushFrameReference(
        config.tenantId,
        cameraId,
        filePath,
        sequence
      );

      // Mark as processed
      this.processedFiles.add(filePath);

      // Update metrics
      await this.redisStreamManager.updateStreamLength(config.tenantId, cameraId);

      this.logger.debug('Frame reference pushed to Redis stream', {
        cameraId,
        tenantId: config.tenantId,
        fileName,
        sequence,
      });
    } catch (error: any) {
      this.logger.error('Failed to process frame', { cameraId, filePath }, error);
      // Don't mark as processed on error, allow retry
    }
  }

  /**
   * Clear processed files cache (optional cleanup)
   */
  clearProcessedCache(): void {
    this.processedFiles.clear();
  }

  /**
   * Shutdown all watchers
   */
  shutdown(): void {
    this.logger.info('Shutting down frame watchers');
    
    for (const [cameraId, watcher] of this.watchers.entries()) {
      watcher.close();
      this.logger.debug('Frame watcher closed', { cameraId });
    }

    this.watchers.clear();
    this.processedFiles.clear();
  }
}

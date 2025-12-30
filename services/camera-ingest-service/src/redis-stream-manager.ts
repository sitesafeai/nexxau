import Redis from 'ioredis';
import { createLogger, Logger } from '@nexxau/logger';
import { getRedisConfig } from '@nexxau/config';
import { stat } from 'fs/promises';
import { resolve } from 'path';

const MAX_STREAM_LENGTH = 20;
const BACKPRESSURE_THRESHOLD = 10; // Start dropping frames when backlog > 10
const STREAM_KEY_PREFIX = 'frames';

export interface StreamMetrics {
  cameraId: string;
  tenantId: string;
  streamLength: number;
  pendingFrames: number; // Frames waiting to be processed
  droppedFrames: number; // Total dropped frames (lifetime)
  lastFrameTimestamp?: Date;
}

/**
 * Manages Redis Streams for camera frame ingestion
 */
export class RedisStreamManager {
  private logger: Logger;
  private redis: Redis;
  private metrics: Map<string, StreamMetrics> = new Map();
  private isConnected: boolean = false;

  constructor(logger: Logger, redis?: Redis) {
    this.logger = logger;
    this.redis = redis || this.createRedisClient();
    this.setupEventHandlers();
  }

  /**
   * Create Redis client from configuration
   */
  private createRedisClient(): Redis {
    const config = getRedisConfig();

    const client = new Redis({
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      ...(config.tls && { tls: {} }),
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    return client;
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('connect', () => {
      this.isConnected = true;
      this.logger.info('Redis client connected');
    });

    this.redis.on('ready', () => {
      this.logger.info('Redis client ready');
    });

    this.redis.on('error', (error: Error) => {
      this.logger.error('Redis client error', {}, error);
    });

    this.redis.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis client closed');
    });

    this.redis.on('reconnecting', (delay: number) => {
      this.logger.info('Redis client reconnecting', { delay });
    });
  }

  /**
   * Get stream key for tenant + camera
   * Format: frames:tenant:{tenantId}:camera:{cameraId}
   */
  private getStreamKey(tenantId: string, cameraId: string): string {
    return `${STREAM_KEY_PREFIX}:tenant:${tenantId}:camera:${cameraId}`;
  }

  /**
   * Push frame reference to Redis stream
   * 
   * IMPORTANT: Redis stores frame REFERENCES (file paths), NOT binary image data.
   * This design decision:
   * - Reduces Redis memory usage by ~99% (paths are ~100 bytes vs 100KB+ for images)
   * - Enables efficient GPU-based inference (files can be memory-mapped)
   * - Maintains stream performance even with high frame rates
   * - Allows consumers to choose optimal loading strategy (mmap, direct read, HTTP)
   */
  async pushFrameReference(
    tenantId: string,
    cameraId: string,
    framePath: string,
    sequence: number,
    timestamp?: Date
  ): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, dropping frame', { tenantId, cameraId });
      this.incrementDroppedFrames(tenantId, cameraId);
      return;
    }

    const streamKey = this.getStreamKey(tenantId, cameraId);

    try {
      // Check current stream length before adding
      const streamLength = await this.redis.xlen(streamKey);

      // Get or initialize metrics
      const metrics = this.getMetrics(tenantId, cameraId);

      // Implement backpressure: drop frame if backlog too high
      // This prevents the stream from growing beyond MAX_STREAM_LENGTH
      if (streamLength >= BACKPRESSURE_THRESHOLD) {
        this.logger.warn('Stream backlog too high, dropping frame', {
          tenantId,
          cameraId,
          streamLength,
          threshold: BACKPRESSURE_THRESHOLD,
        });
        this.incrementDroppedFrames(tenantId, cameraId);
        return;
      }

      // Get absolute file path and file size
      const absolutePath = resolve(framePath);
      let fileSize: number;
      try {
        const stats = await stat(absolutePath);
        fileSize = stats.size;
      } catch (error: any) {
        this.logger.error('Failed to get file stats', { tenantId, cameraId, framePath }, error);
        throw error;
      }

      // Prepare stream entry fields (frame reference only, no binary data)
      const entryTimestamp = timestamp || new Date();
      const fields: Record<string, string> = {
        frame_path: absolutePath,
        timestamp: entryTimestamp.toISOString(),
        size: fileSize.toString(),
        sequence: sequence.toString(),
      };

      // Add entry to stream (XADD)
      const messageId = await this.redis.xadd(
        streamKey,
        '*', // Auto-generate message ID
        ...Object.entries(fields).flat()
      );

      // Trim stream to max length (XTRIM with MAXLEN)
      // MAXLEN removes entries from the beginning (oldest), keeping the most recent
      // Using '~' for approximate trimming (better performance, slight length variation)
      // To ensure exactly MAX_STREAM_LENGTH, use '=' instead of '~'
      await this.redis.xtrim(streamKey, 'MAXLEN', '~', MAX_STREAM_LENGTH.toString());

      // Update metrics
      metrics.streamLength = await this.redis.xlen(streamKey);
      metrics.lastFrameTimestamp = entryTimestamp;

      this.logger.debug('Frame reference pushed to Redis stream', {
        tenantId,
        cameraId,
        streamKey,
        messageId,
        streamLength: metrics.streamLength,
        framePath: absolutePath,
        sequence,
        fileSize,
      });
    } catch (error: any) {
      this.logger.error('Failed to push frame reference to Redis stream', { tenantId, cameraId, framePath }, error);
      this.incrementDroppedFrames(tenantId, cameraId);
      throw error;
    }
  }

  /**
   * Get stream length
   */
  async getStreamLength(tenantId: string, cameraId: string): Promise<number> {
    const streamKey = this.getStreamKey(tenantId, cameraId);
    return await this.redis.xlen(streamKey);
  }

  /**
   * Get stream metrics
   */
  getMetrics(tenantId: string, cameraId: string): StreamMetrics {
    const key = `${tenantId}:${cameraId}`;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        cameraId,
        tenantId,
        streamLength: 0,
        pendingFrames: 0,
        droppedFrames: 0,
      });
    }

    return this.metrics.get(key)!;
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): StreamMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Update stream length in metrics (async update)
   */
  async updateStreamLength(tenantId: string, cameraId: string): Promise<void> {
    const streamLength = await this.getStreamLength(tenantId, cameraId);
    const metrics = this.getMetrics(tenantId, cameraId);
    metrics.streamLength = streamLength;
  }

  /**
   * Increment dropped frames counter
   */
  private incrementDroppedFrames(tenantId: string, cameraId: string): void {
    const metrics = this.getMetrics(tenantId, cameraId);
    metrics.droppedFrames += 1;
  }

  /**
   * Clear stream (for testing/cleanup)
   */
  async clearStream(tenantId: string, cameraId: string): Promise<void> {
    const streamKey = this.getStreamKey(tenantId, cameraId);
    await this.redis.del(streamKey);
    this.logger.info('Stream cleared', { tenantId, cameraId, streamKey });
  }

  /**
   * Get stream info (for debugging)
   */
  async getStreamInfo(tenantId: string, cameraId: string): Promise<any> {
    const streamKey = this.getStreamKey(tenantId, cameraId);
    const info = await this.redis.xinfo('STREAM', streamKey);
    return info;
  }

  /**
   * Shutdown Redis connection
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down Redis stream manager');
    await this.redis.quit();
  }

  /**
   * Check if Redis is connected
   */
  isRedisConnected(): boolean {
    return this.isConnected && this.redis.status === 'ready';
  }
}

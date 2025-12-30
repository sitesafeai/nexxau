import express, { Request, Response } from 'express';
import { createLogger } from '@nexxau/logger';
import { getServiceConfig } from '@nexxau/config';
import { ErrorHandler, ValidationError } from '@nexxau/errors';
import { CameraManager } from './camera-manager';
import { FFmpegManager } from './ffmpeg-manager';
import { RedisStreamManager } from './redis-stream-manager';
import { FrameWatcher } from './frame-watcher';
import { CameraConfig } from './types';

const config = getServiceConfig('camera-ingest-service');
const logger = createLogger({
  service: config.name,
  environment: config.environment,
  version: config.version,
  level: config.logLevel as any,
});

// Initialize managers
const ffmpegManager = new FFmpegManager(logger);
const redisStreamManager = new RedisStreamManager(logger);
const frameWatcher = new FrameWatcher(logger, redisStreamManager);
const cameraManager = new CameraManager(logger, ffmpegManager, frameWatcher);

const app = express();

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req: Request, res: Response, next: express.NextFunction) => {
  logger.debug('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
  });
  next();
});

// ============================================================================
// Health Check Endpoint
// ============================================================================
app.get('/health', async (req: Request, res: Response) => {
  const cameras = cameraManager.getAllCameraStates();
  const cameraCount = cameras.size;
  
  const cameraStatuses = Array.from(cameras.values()).map(state => ({
    id: state.config.id,
    status: state.status,
    failureCount: state.failureCount,
  }));

  const runningCount = Array.from(cameras.values()).filter(
    s => s.status === 'RUNNING'
  ).length;
  const degradedCount = Array.from(cameras.values()).filter(
    s => s.status === 'DEGRADED'
  ).length;

  // Redis health check
  const redisConnected = redisStreamManager.isRedisConnected();
  const redisMetrics = redisStreamManager.getAllMetrics();

  // Determine overall health
  let healthStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (degradedCount > 0 || !redisConnected) {
    healthStatus = 'degraded';
  }
  if (degradedCount === cameraCount && cameraCount > 0) {
    healthStatus = 'unhealthy';
  }

  res.json({
    status: healthStatus,
    service: config.name,
    version: config.version,
    timestamp: new Date().toISOString(),
    checks: {
      cameras: {
        status: healthStatus === 'healthy' ? 'healthy' : 'degraded',
        total: cameraCount,
        running: runningCount,
        degraded: degradedCount,
        details: cameraStatuses,
      },
      redis: {
        status: redisConnected ? 'healthy' : 'unhealthy',
        connected: redisConnected,
      },
    },
  });
});

// ============================================================================
// Camera Management Endpoints
// ============================================================================

/**
 * POST /api/v1/cameras
 * Add/start a camera
 */
app.post('/api/v1/cameras', async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const { id, tenantId, rtspUrl, fps, frameOutputPath } = req.body;

    // Validation
    if (!id || typeof id !== 'string') {
      throw new ValidationError('Camera ID is required', { field: 'id' });
    }
    if (!tenantId || typeof tenantId !== 'string') {
      throw new ValidationError('Tenant ID is required', { field: 'tenantId' });
    }
    if (!rtspUrl || typeof rtspUrl !== 'string') {
      throw new ValidationError('RTSP URL is required', { field: 'rtspUrl' });
    }
    if (fps !== undefined && (typeof fps !== 'number' || fps <= 0 || fps > 30)) {
      throw new ValidationError('FPS must be a number between 0 and 30', { field: 'fps' });
    }

    const cameraConfig: CameraConfig = {
      id,
      tenantId,
      rtspUrl,
      fps: fps || 1,
      frameOutputPath,
    };

    await cameraManager.addCamera(cameraConfig);

    logger.info('Camera added successfully', {
      cameraId: id,
      tenantId,
      rtspUrl,
      fps: cameraConfig.fps,
    });

    res.status(201).json({
      success: true,
      data: {
        cameraId: id,
        status: 'RUNNING',
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/cameras/:cameraId
 * Remove/stop a camera
 */
app.delete('/api/v1/cameras/:cameraId', (req: Request, res: Response) => {
  const { cameraId } = req.params;

  const state = cameraManager.getCameraState(cameraId);
  if (!state) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Camera ${cameraId} not found`,
        statusCode: 404,
      },
    });
  }

  cameraManager.removeCamera(cameraId);

  logger.info('Camera removed successfully', { cameraId });

  res.json({
    success: true,
    data: {
      cameraId,
      status: 'STOPPED',
    },
  });
});

/**
 * GET /api/v1/cameras/:cameraId
 * Get camera state
 */
app.get('/api/v1/cameras/:cameraId', (req: Request, res: Response) => {
  const { cameraId } = req.params;

  const state = cameraManager.getCameraState(cameraId);
  if (!state) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Camera ${cameraId} not found`,
        statusCode: 404,
      },
    });
  }

  res.json({
    success: true,
    data: {
      cameraId: state.config.id,
      tenantId: state.config.tenantId,
      status: state.status,
      failureCount: state.failureCount,
      lastFailureAt: state.lastFailureAt?.toISOString(),
      lastHeartbeat: state.lastHeartbeat?.toISOString(),
      startedAt: state.startedAt?.toISOString(),
      restartAttempt: state.restartAttempt,
      isProcessRunning: state.process && !state.process.killed,
    },
  });
});

/**
 * GET /api/v1/cameras
 * List all cameras
 */
app.get('/api/v1/cameras', async (req: Request, res: Response) => {
  const cameras = cameraManager.getAllCameraStates();
  
  const cameraList = await Promise.all(
    Array.from(cameras.values()).map(async (state) => {
      const streamMetrics = redisStreamManager.getMetrics(
        state.config.tenantId,
        state.config.id
      );
      
      // Update stream length
      await redisStreamManager.updateStreamLength(
        state.config.tenantId,
        state.config.id
      );

      return {
        cameraId: state.config.id,
        tenantId: state.config.tenantId,
        status: state.status,
        failureCount: state.failureCount,
        lastHeartbeat: state.lastHeartbeat?.toISOString(),
        startedAt: state.startedAt?.toISOString(),
        streamMetrics: {
          streamLength: streamMetrics.streamLength,
          droppedFrames: streamMetrics.droppedFrames,
          lastFrameTimestamp: streamMetrics.lastFrameTimestamp?.toISOString(),
        },
      };
    })
  );

  res.json({
    success: true,
    data: {
      cameras: cameraList,
      total: cameraList.length,
    },
  });
});

/**
 * GET /api/v1/cameras/:cameraId/metrics
 * Get camera stream metrics
 */
app.get('/api/v1/cameras/:cameraId/metrics', async (req: Request, res: Response) => {
  const { cameraId } = req.params;
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'tenantId query parameter is required',
        statusCode: 400,
      },
    });
  }

  const state = cameraManager.getCameraState(cameraId);
  if (!state) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `Camera ${cameraId} not found`,
        statusCode: 404,
      },
    });
  }

  // Update and get metrics
  await redisStreamManager.updateStreamLength(tenantId, cameraId);
  const metrics = redisStreamManager.getMetrics(tenantId, cameraId);

  res.json({
    success: true,
    data: {
      cameraId,
      tenantId,
      streamLength: metrics.streamLength,
      pendingFrames: metrics.pendingFrames,
      droppedFrames: metrics.droppedFrames,
      lastFrameTimestamp: metrics.lastFrameTimestamp?.toISOString(),
      maxStreamLength: 20,
      backpressureThreshold: 10,
    },
  });
});

// ============================================================================
// Error Handling Middleware
// ============================================================================
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] as string,
  }, err);

  const response = ErrorHandler.toResponse(err);
  res.status(response.error.statusCode).json(response);
});

// ============================================================================
// Start Server
// ============================================================================
const port = config.port;
const server = app.listen(port, () => {
  logger.info('Camera ingest service started', { 
    port, 
    environment: config.environment,
    version: config.version,
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================
const shutdown = async (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);
  
  // Stop accepting new connections
  server.close(() => {
    logger.info('HTTP server closed');
  });

  // Shutdown camera manager (stops all FFmpeg processes)
  cameraManager.shutdown();

  // Shutdown Redis stream manager
  await redisStreamManager.shutdown();

  // Give processes time to cleanup
  setTimeout(() => {
    logger.info('Shutdown complete');
    process.exit(0);
  }, 5000);
};

process.on('SIGTERM', () => {
  shutdown('SIGTERM').catch(err => {
    logger.error('Error during SIGTERM shutdown', {}, err);
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  shutdown('SIGINT').catch(err => {
    logger.error('Error during SIGINT shutdown', {}, err);
    process.exit(1);
  });
});

// Handle uncaught errors
process.on('uncaughtException', (error: Error) => {
  logger.fatal('Uncaught exception', {}, error);
  shutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.fatal('Unhandled rejection', { reason: String(reason) });
  shutdown('UNHANDLED_REJECTION');
});
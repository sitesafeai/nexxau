import express, { Request, Response } from 'express';
import { createLogger } from '@nexxau/logger';
import { getServiceConfig } from '@nexxau/config';
import { ErrorHandler, ValidationError } from '@nexxau/errors';
import { CameraManager } from './camera-manager';
import { FFmpegManager } from './ffmpeg-manager';
import { RedisStreamManager } from './redis-stream-manager';
import { FrameWatcher } from './frame-watcher';
import { CameraConfig } from './types';
import { RtpFfmpegManager } from './rtp-ffmpeg-manager';

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
const rtpManager = new RtpFfmpegManager(logger);

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
  const rtpStreams = rtpManager.getAllStreamStates();
  const cameraCount = cameras.size;
  const rtpCount = rtpStreams.size;
  
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
      rtpStreams: {
        status: rtpCount > 0 ? 'healthy' : 'healthy',
        total: rtpCount,
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
 * POST /api/v1/cameras/:cameraId/rtp/start
 * Start RTP push to Janus for a camera
 */
app.post('/api/v1/cameras/:cameraId/rtp/start', async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const { cameraId } = req.params;
    const { rtspUrl, mountpointId, rtpHost, rtpPort, payloadType, videoCodec, inputCodec } = req.body;

    if (!cameraId || typeof cameraId !== 'string') {
      throw new ValidationError('Camera ID is required', { field: 'cameraId' });
    }
    if (!rtspUrl || typeof rtspUrl !== 'string') {
      throw new ValidationError('RTSP URL is required', { field: 'rtspUrl' });
    }
    if (!mountpointId || typeof mountpointId !== 'number') {
      throw new ValidationError('mountpointId is required', { field: 'mountpointId' });
    }
    if (!rtpHost || typeof rtpHost !== 'string') {
      throw new ValidationError('rtpHost is required', { field: 'rtpHost' });
    }
    if (!rtpPort || typeof rtpPort !== 'number') {
      throw new ValidationError('rtpPort is required', { field: 'rtpPort' });
    }

    const result = rtpManager.startStream({
      cameraId,
      rtspUrl,
      mountpointId,
      rtpHost,
      rtpPort,
      payloadType: typeof payloadType === 'number' ? payloadType : 96,
      videoCodec: typeof videoCodec === 'string' ? videoCodec : 'h264',
      inputCodec: typeof inputCodec === 'string' ? inputCodec : undefined, // Pass detected input codec for codec-aware transcoding
    });

    res.status(201).json({
      success: true,
      data: {
        cameraId,
        status: result.state.status,
        started: result.started,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/cameras/:cameraId/rtp/stop
 * Stop RTP push for a camera
 */
app.post('/api/v1/cameras/:cameraId/rtp/stop', (req: Request, res: Response) => {
  const { cameraId } = req.params;
  rtpManager.stopStream(cameraId);
  res.json({
    success: true,
    data: {
      cameraId,
      status: 'STOPPED',
    },
  });
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
 * GET /api/v1/rtp/streams
 * List all active RTP streams
 */
app.get('/api/v1/rtp/streams', (req: Request, res: Response) => {
  const streams = rtpManager.getAllStreamStates();
  const streamList = Array.from(streams.values()).map(state => {
    const process = state.process;
    const processInfo = process ? {
      pid: process.pid,
      killed: process.killed,
      exitCode: process.exitCode,
      signalCode: process.signalCode,
    } : null;
    
    // Calculate uptime
    const uptimeSeconds = state.startedAt 
      ? Math.round((Date.now() - state.startedAt.getTime()) / 1000)
      : null;
    
    return {
      cameraId: state.config.cameraId,
      mountpointId: state.config.mountpointId,
      rtspUrl: state.config.rtspUrl,
      rtpHost: state.config.rtpHost,
      rtpPort: state.config.rtpPort,
      videoCodec: state.config.videoCodec,
      inputCodec: state.config.inputCodec, // Detected input codec (for diagnostics)
      payloadType: state.config.payloadType,
      status: state.status,
      failureCount: state.failureCount,
      lastFailureAt: state.lastFailureAt?.toISOString(),
      startedAt: state.startedAt?.toISOString(),
      isProcessRunning: state.process && !state.process.killed,
      processInfo,
      uptimeSeconds,
      // Expected Janus configuration for comparison
      expectedJanusConfig: {
        videoport: state.config.rtpPort,
        videopt: state.config.payloadType,
        videocodec: state.config.videoCodec || 'h264',
        videortpmap: `${(state.config.videoCodec || 'h264').toUpperCase()}/90000`
      }
    };
  });

  res.json({
    success: true,
    data: {
      streams: streamList,
      total: streamList.length,
      running: streamList.filter(s => s.status === 'RUNNING').length,
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
// RTP Stream Diagnostics Endpoint
// ============================================================================
/**
 * GET /api/v1/rtp/streams/:cameraId/diagnostics
 * Get detailed diagnostics for a specific RTP stream
 */
app.get('/api/v1/rtp/streams/:cameraId/diagnostics', (req: Request, res: Response) => {
  const { cameraId } = req.params;
  const state = rtpManager.getStreamState(cameraId);
  
  if (!state) {
    return res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: `RTP stream for camera ${cameraId} not found`,
        statusCode: 404,
      },
    });
  }
  
  const process = state.process;
  const diagnostics = {
    cameraId: state.config.cameraId,
    mountpointId: state.config.mountpointId,
    rtspUrl: state.config.rtspUrl,
    rtpHost: state.config.rtpHost,
    rtpPort: state.config.rtpPort,
    payloadType: state.config.payloadType,
    videoCodec: state.config.videoCodec,
    inputCodec: state.config.inputCodec,
    status: state.status,
    failureCount: state.failureCount,
    lastFailureAt: state.lastFailureAt?.toISOString(),
    startedAt: state.startedAt?.toISOString(),
    uptimeSeconds: state.startedAt 
      ? Math.round((Date.now() - state.startedAt.getTime()) / 1000)
      : null,
    process: process ? {
      pid: process.pid,
      killed: process.killed,
      exitCode: process.exitCode,
      signalCode: process.signalCode,
      spawnfile: process.spawnfile,
      spawnargs: process.spawnargs,
    } : null,
    expectedJanusConfig: {
      videoport: state.config.rtpPort,
      videopt: state.config.payloadType,
      videocodec: state.config.videoCodec || 'h264',
      videortpmap: `${(state.config.videoCodec || 'h264').toUpperCase()}/90000`
    },
    ffmpegCommand: process ? process.spawnargs?.join(' ') : null,
  };
  
  res.json({
    success: true,
    data: diagnostics,
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
// Use 3001 by default to avoid conflict with Next.js (3000)
const port = Number(process.env.PORT) || 3001;
const server = app.listen(port, () => {
  logger.info('Camera ingest service started', { 
    port, 
    environment: config.environment,
    version: config.version,
  });
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    logger.error(`Port ${port} is already in use. Stop the other process (e.g. lsof -ti:${port} | xargs kill) or set PORT=3003`, { port });
    process.exit(1);
  } else {
    logger.error('Server error', { err: err.message });
  }
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
  rtpManager.shutdown();

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
import NodeMediaServer from 'node-media-server';
import { config } from './config';
import { logger } from './utils/logger';
import { CameraManager } from './services/camera-manager';
import { StreamManager } from './services/stream-manager';

const nms = new NodeMediaServer(config.rtmp);
const cameraManager = new CameraManager();
const streamManager = new StreamManager();

// Start the server
nms.run();

// Handle new connections
nms.on('preConnect', (id, args) => {
  logger.info(`[NodeEvent on preConnect] id=${id} args=${JSON.stringify(args)}`);
  // You can reject the connection here if needed
  // return false;
});

// Handle new streams
nms.on('prePublish', async (id, StreamPath, args) => {
  logger.info(`[NodeEvent on prePublish] id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  try {
    const cameraId = StreamPath.split('/')[2]; // Extract camera ID from stream path
    await cameraManager.registerStream(cameraId, StreamPath);
    return true;
  } catch (error) {
    logger.error(`Error registering stream: ${error}`);
    return false;
  }
});

// Handle stream end
nms.on('donePublish', async (id, StreamPath, args) => {
  logger.info(`[NodeEvent on donePublish] id=${id} StreamPath=${StreamPath} args=${JSON.stringify(args)}`);
  
  try {
    const cameraId = StreamPath.split('/')[2];
    await cameraManager.unregisterStream(cameraId);
  } catch (error) {
    logger.error(`Error unregistering stream: ${error}`);
  }
});

// Health check endpoint
nms.on('postConnect', (id, args) => {
  logger.info(`[NodeEvent on postConnect] id=${id} args=${JSON.stringify(args)}`);
});

// Error handling
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
}); 
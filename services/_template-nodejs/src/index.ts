import express from 'express';
import { createLogger } from '@nexxau/logger';
import { getServiceConfig } from '@nexxau/config';
import { ErrorHandler } from '@nexxau/errors';

const config = getServiceConfig('SERVICE_NAME');
const logger = createLogger({
  service: config.name,
  environment: config.environment,
  version: config.version,
  level: config.logLevel as any,
});

const app = express();

// Middleware
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: config.name,
    version: config.version,
    timestamp: new Date().toISOString(),
  });
});

// Example route
app.get('/api/v1/status', (req, res) => {
  res.json({ message: 'Service is running' });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Request error', {
    path: req.path,
    method: req.method,
    requestId: req.headers['x-request-id'] as string,
  }, err);

  const response = ErrorHandler.toResponse(err);
  res.status(response.error.statusCode).json(response);
});

// Start server
const port = config.port;
app.listen(port, () => {
  logger.info('Service started', { port, environment: config.environment });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

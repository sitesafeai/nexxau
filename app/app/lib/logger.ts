import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

// Define log levels
const logLevels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define log colors
const logColors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white'
};

winston.addColors(logColors);

// Create custom format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Create transports
const transports = [
  // Console transport
  new winston.transports.Console({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat
  }),

  // Error log file
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'error',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),

  // Combined log file
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '14d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  }),

  // HTTP requests log file
  new DailyRotateFile({
    filename: path.join(process.cwd(), 'logs', 'http-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    level: 'http',
    maxSize: '20m',
    maxFiles: '7d',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

// Create logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: logLevels,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports,
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(process.cwd(), 'logs', 'rejections.log') 
    })
  ]
});

// Add custom log methods
export class Logger {
  private static instance: Logger;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  // HTTP request logging
  public logHttpRequest(
    method: string,
    url: string,
    statusCode: number,
    responseTime: number,
    userAgent?: string,
    userId?: string
  ): void {
    logger.http('HTTP Request', {
      method,
      url,
      statusCode,
      responseTime,
      userAgent,
      userId,
      timestamp: new Date().toISOString()
    });
  }

  // Database operation logging
  public logDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    if (success) {
      logger.debug('Database Operation', {
        operation,
        table,
        duration,
        success
      });
    } else {
      logger.error('Database Operation Failed', {
        operation,
        table,
        duration,
        success,
        error
      });
    }
  }

  // AI detection logging
  public logAIDetection(
    cameraId: string,
    duration: number,
    success: boolean,
    objectCount: number,
    error?: string
  ): void {
    if (success) {
      logger.info('AI Detection', {
        cameraId,
        duration,
        success,
        objectCount,
        timestamp: new Date().toISOString()
      });
    } else {
      logger.error('AI Detection Failed', {
        cameraId,
        duration,
        success,
        error,
        timestamp: new Date().toISOString()
      });
    }
  }

  // User activity logging
  public logUserActivity(
    action: string,
    userId: string,
    userRole: string,
    success: boolean,
    details?: any
  ): void {
    logger.info('User Activity', {
      action,
      userId,
      userRole,
      success,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Security event logging
  public logSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userId?: string,
    ipAddress?: string,
    details?: any
  ): void {
    logger.warn('Security Event', {
      event,
      severity,
      userId,
      ipAddress,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Alert logging
  public logAlert(
    alertType: string,
    severity: string,
    worksiteId: string,
    cameraId?: string,
    details?: any
  ): void {
    logger.warn('Alert Generated', {
      alertType,
      severity,
      worksiteId,
      cameraId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Error logging
  public logError(
    error: Error,
    context?: string,
    userId?: string,
    additionalInfo?: any
  ): void {
    logger.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
      userId,
      additionalInfo,
      timestamp: new Date().toISOString()
    });
  }

  // Performance logging
  public logPerformance(
    operation: string,
    duration: number,
    success: boolean,
    details?: any
  ): void {
    logger.info('Performance Metric', {
      operation,
      duration,
      success,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // Business metrics logging
  public logBusinessMetric(
    metric: string,
    value: number,
    worksiteId?: string,
    details?: any
  ): void {
    logger.info('Business Metric', {
      metric,
      value,
      worksiteId,
      details,
      timestamp: new Date().toISOString()
    });
  }

  // System health logging
  public logSystemHealth(
    component: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    details?: any
  ): void {
    const level = status === 'healthy' ? 'info' : 
                  status === 'degraded' ? 'warn' : 'error';
    
    logger[level]('System Health', {
      component,
      status,
      details,
      timestamp: new Date().toISOString()
    });
  }
}

// Export logger instance
export const appLogger = Logger.getInstance();

// Export winston logger for direct use
export { logger };

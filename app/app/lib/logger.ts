/**
 * Structured Logging Service for SiteSafe
 * 
 * Provides consistent, structured logging across the application
 * with support for different log levels and contexts.
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface LogContext {
  userId?: string;
  cameraId?: string;
  alertId?: string;
  worksiteId?: string;
  requestId?: string;
  ip?: string;
  userAgent?: string;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    operation: string;
  };
}

class Logger {
  private static instance: Logger;
  private minLevel: LogLevel = LogLevel.INFO;
  private logs: LogEntry[] = [];
  private maxLogsInMemory = 1000; // Keep last 1000 logs in memory

  private constructor() {
    // Set log level from environment
    const envLevel = process.env.LOG_LEVEL?.toUpperCase();
    if (envLevel && envLevel in LogLevel) {
      this.minLevel = LogLevel[envLevel as keyof typeof LogLevel];
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    return levels.indexOf(level) >= levels.indexOf(this.minLevel);
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] ${level}: ${message}${contextStr}`;
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error, performance?: { duration: number; operation: string }) {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      performance
    };

    // Store in memory (limited buffer)
    this.logs.push(entry);
    if (this.logs.length > this.maxLogsInMemory) {
      this.logs.shift(); // Remove oldest
    }

    // Console output with colors
    const formattedMessage = this.formatMessage(level, message, context);
    
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage);
        if (error) console.warn('Error details:', error);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage);
        if (error) console.error('Error details:', error);
        break;
      case LogLevel.CRITICAL:
        console.error(`🚨 CRITICAL: ${formattedMessage}`);
        if (error) console.error('Error details:', error);
        break;
    }

    // In production, you would send logs to a service like:
    // - Sentry for errors
    // - DataDog for metrics
    // - CloudWatch for AWS
    // - Custom log aggregation service
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  warn(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.WARN, message, context, error);
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.ERROR, message, context, error);
  }

  critical(message: string, context?: LogContext, error?: Error) {
    this.log(LogLevel.CRITICAL, message, context, error);
  }

  // Performance logging
  startTimer(operation: string, context?: LogContext): () => void {
    const startTime = Date.now();
    this.debug(`Started: ${operation}`, context);
    
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed: ${operation}`, context, undefined, { duration, operation });
    };
  }

  // Camera-specific logging
  cameraActivity(cameraId: string, message: string, context?: LogContext) {
    this.info(message, { ...context, cameraId });
  }

  cameraError(cameraId: string, message: string, error?: Error, context?: LogContext) {
    this.error(message, { ...context, cameraId }, error);
  }

  // Alert-specific logging
  alertCreated(alertId: string, severity: string, message: string, context?: LogContext) {
    this.info(`🚨 Alert Created: ${message}`, { ...context, alertId, severity });
  }

  alertStateChange(alertId: string, from: string, to: string, context?: LogContext) {
    this.info(`Alert state transition: ${from} → ${to}`, { ...context, alertId });
  }

  // Detection-specific logging
  detectionEvent(cameraId: string, detectionCount: number, context?: LogContext) {
    this.debug(`Detected ${detectionCount} objects`, { ...context, cameraId });
  }

  violationDetected(cameraId: string, violationType: string, severity: string, context?: LogContext) {
    this.warn(`🚨 Safety Violation: ${violationType}`, { ...context, cameraId, violationType, severity });
  }

  // Database operation logging
  dbQuery(operation: string, table: string, duration?: number, context?: LogContext) {
    const message = duration 
      ? `DB Query: ${operation} on ${table} (${duration}ms)`
      : `DB Query: ${operation} on ${table}`;
    this.debug(message, { ...context, operation, table, duration });
  }

  dbError(operation: string, table: string, error: Error, context?: LogContext) {
    this.error(`DB Error: ${operation} on ${table}`, { ...context, operation, table }, error);
  }

  // API request logging
  apiRequest(method: string, path: string, statusCode?: number, duration?: number, context?: LogContext) {
    const message = `${method} ${path} ${statusCode ? `→ ${statusCode}` : ''}${duration ? ` (${duration}ms)` : ''}`;
    
    if (statusCode && statusCode >= 500) {
      this.error(message, { ...context, method, path, statusCode, duration });
    } else if (statusCode && statusCode >= 400) {
      this.warn(message, { ...context, method, path, statusCode, duration });
    } else {
      this.info(message, { ...context, method, path, statusCode, duration });
    }
  }

  // System health logging
  healthCheck(service: string, status: 'healthy' | 'degraded' | 'unhealthy', message?: string, context?: LogContext) {
    const emoji = status === 'healthy' ? '✅' : status === 'degraded' ? '⚠️' : '❌';
    const logMessage = `${emoji} Health Check - ${service}: ${status}${message ? ` - ${message}` : ''}`;
    
    if (status === 'unhealthy') {
      this.error(logMessage, { ...context, service, status });
    } else if (status === 'degraded') {
      this.warn(logMessage, { ...context, service, status });
    } else {
      this.info(logMessage, { ...context, service, status });
    }
  }

  // Get recent logs (for admin dashboard)
  getRecentLogs(limit: number = 100, level?: LogLevel): LogEntry[] {
    let logs = [...this.logs];
    
    if (level) {
      logs = logs.filter(log => log.level === level);
    }
    
    return logs.slice(-limit).reverse(); // Most recent first
  }

  // Clear logs (for testing/debugging)
  clearLogs() {
    this.logs = [];
    this.info('Logs cleared');
  }

  // Export logs (for download/debugging)
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }
}

// Export singleton instance
export const logger = Logger.getInstance();

// Convenience exports
export default logger;

/**
 * Janus Logger Utility
 * 
 * FIX 6: Structured logging with levels and context.
 * 
 * Provides consistent logging format with cameraId, mountpointId, retry counts.
 */

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface LogContext {
  cameraId?: string;
  mountpointId?: number;
  retryCount?: number;
  sessionId?: string;
  [key: string]: any;
}

/**
 * Structured logger for Janus operations
 */
export class JanusLogger {
  private static formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[Janus] [${level}] [${timestamp}] ${message}${contextStr}`;
  }

  static info(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('INFO', message, context);
    console.log(formatted);
  }

  static warn(message: string, context?: LogContext): void {
    const formatted = this.formatMessage('WARN', message, context);
    console.warn(formatted);
  }

  static error(message: string, context?: LogContext, error?: Error): void {
    const formatted = this.formatMessage('ERROR', message, context);
    if (error) {
      console.error(formatted, error);
    } else {
      console.error(formatted);
    }
  }
}

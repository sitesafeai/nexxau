import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from './metrics';
import { appLogger } from './logger';
import { errorTracker } from './sentry';
import { jwtManager } from './jwt';

export interface MonitoringContext {
  startTime: number;
  requestId: string;
  userId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent: string;
}

export class MonitoringMiddleware {
  private static instance: MonitoringMiddleware;

  private constructor() {}

  public static getInstance(): MonitoringMiddleware {
    if (!MonitoringMiddleware.instance) {
      MonitoringMiddleware.instance = new MonitoringMiddleware();
    }
    return MonitoringMiddleware.instance;
  }

  // Create monitoring context
  public createContext(request: NextRequest): MonitoringContext {
    const startTime = Date.now();
    const requestId = this.generateRequestId();
    const ipAddress = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    
    // Extract user info from token if available
    let userId: string | undefined;
    let userRole: string | undefined;
    
    try {
      const token = jwtManager.extractTokenFromRequest(request);
      if (token) {
        const payload = jwtManager.verifyAccessToken(token);
        if (payload) {
          userId = payload.userId;
          userRole = payload.role;
        }
      }
    } catch (error) {
      // Token extraction failed, continue without user info
    }

    return {
      startTime,
      requestId,
      userId,
      userRole,
      ipAddress,
      userAgent
    };
  }

  // Record request metrics and logs
  public recordRequest(
    request: NextRequest,
    response: NextResponse,
    context: MonitoringContext
  ): void {
    const duration = Date.now() - context.startTime;
    const method = request.method;
    const url = request.url;
    const statusCode = response.status;

    // Extract route from URL
    const route = this.extractRoute(url);

    // Record metrics
    metricsCollector.recordHttpRequest(
      method,
      route,
      statusCode,
      duration / 1000, // Convert to seconds
      context.userRole
    );

    // Record logs
    appLogger.logHttpRequest(
      method,
      url,
      statusCode,
      duration,
      context.userAgent,
      context.userId
    );

    // Record user activity if authenticated
    if (context.userId) {
      appLogger.logUserActivity(
        'api_request',
        context.userId,
        context.userRole || 'unknown',
        statusCode < 400,
        {
          endpoint: route,
          method,
          duration,
          requestId: context.requestId
        }
      );
    }

    // Track performance issues
    if (duration > 5000) { // 5 seconds threshold
      errorTracker.trackPerformanceIssue(
        `${method} ${route}`,
        duration,
        5000,
        {
          userId: context.userId,
          details: {
            url,
            statusCode,
            userAgent: context.userAgent
          }
        }
      );
    }

    // Track errors
    if (statusCode >= 400) {
      const error = new Error(`HTTP ${statusCode}: ${method} ${url}`);
      errorTracker.trackAPIError(error, {
        endpoint: route,
        method,
        userId: context.userId,
        requestId: context.requestId
      });
    }
  }

  // Record database operation
  public recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean,
    error?: Error,
    userId?: string
  ): void {
    // Record metrics
    metricsCollector.recordDatabaseOperation(operation, table, duration, success);

    // Record logs
    appLogger.logDatabaseOperation(operation, table, duration, success, error?.message);

    // Track errors
    if (!success && error) {
      errorTracker.trackDatabaseError(error, {
        operation,
        table,
        userId
      });
    }
  }

  // Record AI detection
  public recordAIDetection(
    cameraId: string,
    duration: number,
    success: boolean,
    objectCount: number,
    error?: Error,
    userId?: string,
    worksiteId?: string
  ): void {
    // Record metrics
    metricsCollector.recordAIDetection(cameraId, duration, success, objectCount);

    // Record logs
    appLogger.logAIDetection(cameraId, duration, success, objectCount, error?.message);

    // Track errors
    if (!success && error) {
      errorTracker.trackAIDetectionError(error, {
        cameraId,
        worksiteId,
        userId
      });
    }
  }

  // Record user activity
  public recordUserActivity(
    action: string,
    userId: string,
    userRole: string,
    success: boolean,
    details?: any
  ): void {
    // Record metrics
    metricsCollector.recordUserActivity(action, userRole, success);

    // Record logs
    appLogger.logUserActivity(action, userId, userRole, success, details);
  }

  // Record security event
  public recordSecurityEvent(
    event: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    userId?: string,
    ipAddress?: string,
    details?: any
  ): void {
    // Record logs
    appLogger.logSecurityEvent(event, severity, userId, ipAddress, details);

    // Track in Sentry
    errorTracker.trackSecurityEvent(event, {
      severity,
      userId,
      ipAddress,
      details
    });
  }

  // Record alert
  public recordAlert(
    alertType: string,
    severity: string,
    worksiteId: string,
    cameraId?: string,
    details?: any
  ): void {
    // Record metrics
    metricsCollector.recordAlert(severity, alertType, worksiteId);

    // Record logs
    appLogger.logAlert(alertType, severity, worksiteId, cameraId, details);
  }

  // Record safety violation
  public recordSafetyViolation(
    violationType: string,
    severity: string,
    worksiteId: string,
    details?: any
  ): void {
    // Record metrics
    metricsCollector.recordSafetyViolation(violationType, severity, worksiteId);

    // Record logs
    appLogger.logAlert('safety_violation', severity, worksiteId, undefined, {
      violationType,
      ...details
    });
  }

  // Record error
  public recordError(
    error: Error,
    context: string,
    userId?: string,
    additionalInfo?: any
  ): void {
    // Record metrics
    metricsCollector.recordError('application_error', 'error', context);

    // Record logs
    appLogger.logError(error, context, userId, additionalInfo);

    // Track in Sentry
    errorTracker.trackAPIError(error, {
      endpoint: context,
      method: 'unknown',
      userId,
      requestId: 'unknown'
    });
  }

  // Record business metric
  public recordBusinessMetric(
    metric: string,
    value: number,
    worksiteId?: string,
    details?: any
  ): void {
    // Record logs
    appLogger.logBusinessMetric(metric, value, worksiteId, details);

    // Track in Sentry
    errorTracker.trackBusinessMetric(metric, value, {
      worksiteId,
      details
    });
  }

  // Record system health
  public recordSystemHealth(
    component: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    details?: any
  ): void {
    // Record logs
    appLogger.logSystemHealth(component, status, details);

    // Track in Sentry if unhealthy
    if (status === 'unhealthy') {
      errorTracker.trackAPIError(
        new Error(`System component ${component} is unhealthy`),
        {
          endpoint: 'system_health',
          method: 'health_check',
          requestId: 'system'
        }
      );
    }
  }

  // Helper methods
  private generateRequestId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const ip = forwarded ? forwarded.split(',')[0] : realIP || request.ip || 'unknown';
    return ip;
  }

  private extractRoute(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Replace dynamic segments with placeholders
      return pathname
        .replace(/\/[a-f0-9-]{20,}/g, '/:id') // Replace UUIDs
        .replace(/\/\d+/g, '/:id') // Replace numeric IDs
        .replace(/\/[a-zA-Z0-9]{20,}/g, '/:id'); // Replace other IDs
    } catch {
      return url;
    }
  }
}

// Export singleton instance
export const monitoringMiddleware = MonitoringMiddleware.getInstance();

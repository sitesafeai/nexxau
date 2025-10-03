import * as Sentry from '@sentry/nextjs';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  
  // Configure release
  release: process.env.npm_package_version || '1.0.0',
  
  // Configure integrations
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Sentry.Integrations.Express({ app: undefined }),
    new Sentry.Integrations.OnUncaughtException(),
    new Sentry.Integrations.OnUnhandledRejection(),
  ],
  
  // Configure beforeSend to filter sensitive data
  beforeSend(event, hint) {
    // Filter out sensitive information
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.token;
      delete event.request.data.secret;
    }
    
    // Filter out health check requests
    if (event.request?.url?.includes('/health')) {
      return null;
    }
    
    return event;
  },
  
  // Configure tags
  initialScope: {
    tags: {
      component: 'nexxau-app'
    }
  }
});

// Custom error tracking functions
export class ErrorTracker {
  private static instance: ErrorTracker;

  private constructor() {}

  public static getInstance(): ErrorTracker {
    if (!ErrorTracker.instance) {
      ErrorTracker.instance = new ErrorTracker();
    }
    return ErrorTracker.instance;
  }

  // Track API errors
  public trackAPIError(
    error: Error,
    context: {
      endpoint: string;
      method: string;
      userId?: string;
      requestId?: string;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'api_error');
      scope.setTag('endpoint', context.endpoint);
      scope.setTag('method', context.method);
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context.requestId) {
        scope.setTag('request_id', context.requestId);
      }
      
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Track database errors
  public trackDatabaseError(
    error: Error,
    context: {
      operation: string;
      table: string;
      userId?: string;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'database_error');
      scope.setTag('operation', context.operation);
      scope.setTag('table', context.table);
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Track AI detection errors
  public trackAIDetectionError(
    error: Error,
    context: {
      cameraId: string;
      worksiteId?: string;
      userId?: string;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'ai_detection_error');
      scope.setTag('camera_id', context.cameraId);
      
      if (context.worksiteId) {
        scope.setTag('worksite_id', context.worksiteId);
      }
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      scope.setLevel('error');
      Sentry.captureException(error);
    });
  }

  // Track authentication errors
  public trackAuthError(
    error: Error,
    context: {
      action: string;
      userId?: string;
      ipAddress?: string;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('error_type', 'authentication_error');
      scope.setTag('action', context.action);
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context.ipAddress) {
        scope.setTag('ip_address', context.ipAddress);
      }
      
      scope.setLevel('warning');
      Sentry.captureException(error);
    });
  }

  // Track security events
  public trackSecurityEvent(
    event: string,
    context: {
      severity: 'low' | 'medium' | 'high' | 'critical';
      userId?: string;
      ipAddress?: string;
      details?: any;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('event_type', 'security_event');
      scope.setTag('event', event);
      scope.setTag('severity', context.severity);
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context.ipAddress) {
        scope.setTag('ip_address', context.ipAddress);
      }
      
      if (context.details) {
        scope.setContext('details', context.details);
      }
      
      scope.setLevel(context.severity === 'critical' ? 'error' : 'warning');
      Sentry.captureMessage(`Security Event: ${event}`, 'warning');
    });
  }

  // Track performance issues
  public trackPerformanceIssue(
    operation: string,
    duration: number,
    threshold: number,
    context: {
      userId?: string;
      details?: any;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('issue_type', 'performance');
      scope.setTag('operation', operation);
      scope.setTag('duration', duration.toString());
      scope.setTag('threshold', threshold.toString());
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context.details) {
        scope.setContext('details', context.details);
      }
      
      scope.setLevel('warning');
      Sentry.captureMessage(
        `Performance Issue: ${operation} took ${duration}ms (threshold: ${threshold}ms)`,
        'warning'
      );
    });
  }

  // Track business metrics
  public trackBusinessMetric(
    metric: string,
    value: number,
    context: {
      worksiteId?: string;
      userId?: string;
      details?: any;
    }
  ): void {
    Sentry.withScope((scope) => {
      scope.setTag('metric_type', 'business');
      scope.setTag('metric', metric);
      scope.setTag('value', value.toString());
      
      if (context.worksiteId) {
        scope.setTag('worksite_id', context.worksiteId);
      }
      
      if (context.userId) {
        scope.setUser({ id: context.userId });
      }
      
      if (context.details) {
        scope.setContext('details', context.details);
      }
      
      scope.setLevel('info');
      Sentry.captureMessage(`Business Metric: ${metric} = ${value}`, 'info');
    });
  }

  // Set user context
  public setUserContext(user: {
    id: string;
    email?: string;
    role?: string;
    worksiteId?: string;
    companyId?: string;
  }): void {
    Sentry.setUser(user);
  }

  // Set custom context
  public setCustomContext(key: string, value: any): void {
    Sentry.setContext(key, value);
  }

  // Add breadcrumb
  public addBreadcrumb(message: string, category: string, level: 'info' | 'warning' | 'error' = 'info'): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level
    });
  }
}

// Export singleton instance
export const errorTracker = ErrorTracker.getInstance();

// Export Sentry for direct use
export { Sentry };

import { register, collectDefaultMetrics, Counter, Histogram, Gauge, Summary } from 'prom-client';

// Enable default metrics collection
collectDefaultMetrics({ register });

// Custom metrics for Nexxau application
export const metrics = {
  // HTTP Request Metrics
  httpRequestsTotal: new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'route', 'status_code', 'user_role']
  }),

  httpRequestDuration: new Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
  }),

  // Database Metrics
  databaseConnections: new Gauge({
    name: 'database_connections_active',
    help: 'Number of active database connections'
  }),

  databaseQueryDuration: new Histogram({
    name: 'database_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['operation', 'table'],
    buckets: [0.01, 0.05, 0.1, 0.2, 0.5, 1, 2, 5]
  }),

  databaseErrors: new Counter({
    name: 'database_errors_total',
    help: 'Total number of database errors',
    labelNames: ['operation', 'error_type']
  }),

  // AI Detection Metrics
  aiDetectionRequests: new Counter({
    name: 'ai_detection_requests_total',
    help: 'Total number of AI detection requests',
    labelNames: ['camera_id', 'status']
  }),

  aiDetectionDuration: new Histogram({
    name: 'ai_detection_duration_seconds',
    help: 'Duration of AI detection processing in seconds',
    labelNames: ['camera_id'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  }),

  aiDetectionAccuracy: new Gauge({
    name: 'ai_detection_accuracy',
    help: 'AI detection accuracy percentage',
    labelNames: ['camera_id', 'object_class']
  }),

  // Camera Stream Metrics
  cameraStreamsActive: new Gauge({
    name: 'camera_streams_active',
    help: 'Number of active camera streams'
  }),

  cameraStreamHealth: new Gauge({
    name: 'camera_stream_health',
    help: 'Camera stream health status (1 = healthy, 0 = unhealthy)',
    labelNames: ['camera_id']
  }),

  // User Activity Metrics
  userSessions: new Gauge({
    name: 'user_sessions_active',
    help: 'Number of active user sessions'
  }),

  userLogins: new Counter({
    name: 'user_logins_total',
    help: 'Total number of user logins',
    labelNames: ['method', 'success']
  }),

  userActions: new Counter({
    name: 'user_actions_total',
    help: 'Total number of user actions',
    labelNames: ['action', 'user_role']
  }),

  // Alert Metrics
  alertsGenerated: new Counter({
    name: 'alerts_generated_total',
    help: 'Total number of alerts generated',
    labelNames: ['severity', 'type', 'worksite_id']
  }),

  alertsResolved: new Counter({
    name: 'alerts_resolved_total',
    help: 'Total number of alerts resolved',
    labelNames: ['severity', 'type', 'worksite_id']
  }),

  // System Resource Metrics
  memoryUsage: new Gauge({
    name: 'memory_usage_bytes',
    help: 'Memory usage in bytes',
    labelNames: ['type']
  }),

  cpuUsage: new Gauge({
    name: 'cpu_usage_percent',
    help: 'CPU usage percentage'
  }),

  // Business Metrics
  detectionsPerHour: new Gauge({
    name: 'detections_per_hour',
    help: 'Number of detections per hour',
    labelNames: ['object_class', 'worksite_id']
  }),

  safetyViolations: new Counter({
    name: 'safety_violations_total',
    help: 'Total number of safety violations detected',
    labelNames: ['violation_type', 'severity', 'worksite_id']
  }),

  // Performance Metrics
  apiResponseTime: new Summary({
    name: 'api_response_time_seconds',
    help: 'API response time in seconds',
    labelNames: ['endpoint', 'method']
  }),

  // Error Metrics
  errorsTotal: new Counter({
    name: 'errors_total',
    help: 'Total number of errors',
    labelNames: ['type', 'severity', 'component']
  }),

  // Feature Usage Metrics
  featureUsage: new Counter({
    name: 'feature_usage_total',
    help: 'Total number of feature usage',
    labelNames: ['feature', 'user_role']
  }),

  /** Application-level 429 responses from built-in rate limiters (auth, API, detection, etc.) */
  rateLimitRejections: new Counter({
    name: 'rate_limit_rejections_total',
    help: 'Total 429 responses emitted by application rate limiters',
    labelNames: ['limiter'],
  }),
};

// Metrics collection functions
export class MetricsCollector {
  private static instance: MetricsCollector;

  private constructor() {}

  public static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  // Record HTTP request
  public recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    userRole?: string
  ): void {
    metrics.httpRequestsTotal.inc({
      method,
      route,
      status_code: statusCode.toString(),
      user_role: userRole || 'anonymous'
    });

    metrics.httpRequestDuration.observe(
      { method, route, status_code: statusCode.toString() },
      duration
    );
  }

  // Record database operation
  public recordDatabaseOperation(
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ): void {
    if (success) {
      metrics.databaseQueryDuration.observe(
        { operation, table },
        duration
      );
    } else {
      metrics.databaseErrors.inc({
        operation,
        error_type: 'query_failed'
      });
    }
  }

  // Record AI detection
  public recordAIDetection(
    cameraId: string,
    duration: number,
    success: boolean,
    objectCount: number
  ): void {
    metrics.aiDetectionRequests.inc({
      camera_id: cameraId,
      status: success ? 'success' : 'failed'
    });

    if (success) {
      metrics.aiDetectionDuration.observe(
        { camera_id: cameraId },
        duration
      );
    }
  }

  // Record user activity
  public recordUserActivity(
    action: string,
    userRole: string,
    success: boolean
  ): void {
    metrics.userActions.inc({
      action,
      user_role: userRole
    });

    if (action === 'login') {
      metrics.userLogins.inc({
        method: 'credentials',
        success: success ? 'true' : 'false'
      });
    }
  }

  // Record alert
  public recordAlert(
    severity: string,
    type: string,
    worksiteId: string,
    resolved: boolean = false
  ): void {
    if (resolved) {
      metrics.alertsResolved.inc({
        severity,
        type,
        worksite_id: worksiteId
      });
    } else {
      metrics.alertsGenerated.inc({
        severity,
        type,
        worksite_id: worksiteId
      });
    }
  }

  // Record safety violation
  public recordSafetyViolation(
    violationType: string,
    severity: string,
    worksiteId: string
  ): void {
    metrics.safetyViolations.inc({
      violation_type: violationType,
      severity,
      worksite_id: worksiteId
    });
  }

  // Record error
  public recordError(
    type: string,
    severity: string,
    component: string
  ): void {
    metrics.errorsTotal.inc({
      type,
      severity,
      component
    });
  }

  // Update system metrics
  public updateSystemMetrics(): void {
    const memUsage = process.memoryUsage();
    
    metrics.memoryUsage.set(
      { type: 'rss' },
      memUsage.rss
    );
    
    metrics.memoryUsage.set(
      { type: 'heapUsed' },
      memUsage.heapUsed
    );
    
    metrics.memoryUsage.set(
      { type: 'heapTotal' },
      memUsage.heapTotal
    );
  }

  // Get metrics as Prometheus format
  public async getMetrics(): Promise<string> {
    return register.metrics();
  }
}

// Export singleton instance
export const metricsCollector = MetricsCollector.getInstance();

// Update system metrics every 30 seconds
setInterval(() => {
  metricsCollector.updateSystemMetrics();
}, 30000);

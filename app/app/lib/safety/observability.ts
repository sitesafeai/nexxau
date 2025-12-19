/**
 * Observability & Monitoring Hooks
 * 
 * Per directive: If you can't see it, you can't fix it.
 * Must log & monitor:
 * - Frame drop rate per camera
 * - Inference latency percentiles
 * - Alert delay
 * - Override frequency
 * - Error budget per site
 */

export interface Metric {
  name: string;
  value: number;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface AlertMetric {
  alertId: string;
  created: Date;
  detected: Date;
  delayMs: number;
  worksiteId: string;
}

export class Observability {
  private static instance: Observability;
  private metrics: Metric[] = [];
  private alertMetrics: AlertMetric[] = [];
  private readonly maxMetrics = 10000; // Keep last 10k metrics

  private constructor() {}

  public static getInstance(): Observability {
    if (!Observability.instance) {
      Observability.instance = new Observability();
    }
    return Observability.instance;
  }

  /**
   * Record frame drop
   */
  public recordFrameDrop(cameraId: string, reason: string): void {
    this.recordMetric({
      name: 'frame_drop',
      value: 1,
      tags: {
        camera_id: cameraId,
        reason,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Record inference latency
   */
  public recordInferenceLatency(worksiteId: string, latencyMs: number, success: boolean): void {
    this.recordMetric({
      name: 'inference_latency_ms',
      value: latencyMs,
      tags: {
        worksite_id: worksiteId,
        success: success.toString(),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Record alert delay
   */
  public recordAlertDelay(alertId: string, created: Date, detected: Date, worksiteId: string): void {
    const delayMs = detected.getTime() - created.getTime();
    
    this.alertMetrics.push({
      alertId,
      created,
      detected,
      delayMs,
      worksiteId,
    });

    this.recordMetric({
      name: 'alert_delay_ms',
      value: delayMs,
      tags: {
        alert_id: alertId,
        worksite_id: worksiteId,
      },
      timestamp: new Date(),
    });

    // Keep only last 1000 alert metrics
    if (this.alertMetrics.length > 1000) {
      this.alertMetrics.shift();
    }
  }

  /**
   * Record override
   */
  public recordOverride(alertId: string, userId: string, worksiteId: string): void {
    this.recordMetric({
      name: 'alert_override',
      value: 1,
      tags: {
        alert_id: alertId,
        user_id: userId,
        worksite_id: worksiteId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Record error
   */
  public recordError(error: Error, context: string, worksiteId?: string): void {
    this.recordMetric({
      name: 'error',
      value: 1,
      tags: {
        error_type: error.name,
        error_message: error.message.substring(0, 100), // Truncate long messages
        context,
        ...(worksiteId && { worksite_id: worksiteId }),
      },
      timestamp: new Date(),
    });
  }

  /**
   * Get frame drop rate for camera
   */
  public getFrameDropRate(cameraId: string, windowMs: number = 60000): number {
    const cutoff = new Date(Date.now() - windowMs);
    const drops = this.metrics.filter(
      m => m.name === 'frame_drop' &&
           m.tags?.camera_id === cameraId &&
           m.timestamp >= cutoff
    );
    
    const total = this.metrics.filter(
      m => (m.name === 'frame_drop' || m.name === 'frame_received') &&
           m.tags?.camera_id === cameraId &&
           m.timestamp >= cutoff
    ).length;

    return total > 0 ? drops.length / total : 0;
  }

  /**
   * Get inference latency percentiles
   */
  public getInferenceLatencyPercentiles(worksiteId: string, percentiles: number[] = [50, 90, 95, 99]): Record<number, number> {
    const cutoff = new Date(Date.now() - 60000); // Last minute
    const latencies = this.metrics
      .filter(
        m => m.name === 'inference_latency_ms' &&
             m.tags?.worksite_id === worksiteId &&
             m.timestamp >= cutoff
      )
      .map(m => m.value)
      .sort((a, b) => a - b);

    if (latencies.length === 0) {
      return {};
    }

    const result: Record<number, number> = {};
    for (const p of percentiles) {
      const index = Math.ceil((p / 100) * latencies.length) - 1;
      result[p] = latencies[Math.max(0, index)] || 0;
    }

    return result;
  }

  /**
   * Get average alert delay
   */
  public getAverageAlertDelay(worksiteId?: string, windowMs: number = 3600000): number {
    const cutoff = new Date(Date.now() - windowMs);
    const alerts = worksiteId
      ? this.alertMetrics.filter(a => a.worksiteId === worksiteId && a.created >= cutoff)
      : this.alertMetrics.filter(a => a.created >= cutoff);

    if (alerts.length === 0) {
      return 0;
    }

    const totalDelay = alerts.reduce((sum, a) => sum + a.delayMs, 0);
    return totalDelay / alerts.length;
  }

  /**
   * Get override frequency
   */
  public getOverrideFrequency(worksiteId?: string, windowMs: number = 86400000): number {
    const cutoff = new Date(Date.now() - windowMs);
    const overrides = this.metrics.filter(
      m => m.name === 'alert_override' &&
           m.timestamp >= cutoff &&
           (!worksiteId || m.tags?.worksite_id === worksiteId)
    );

    return overrides.length;
  }

  /**
   * Get error budget (errors per hour)
   */
  public getErrorBudget(worksiteId?: string, windowMs: number = 3600000): number {
    const cutoff = new Date(Date.now() - windowMs);
    const errors = this.metrics.filter(
      m => m.name === 'error' &&
           m.timestamp >= cutoff &&
           (!worksiteId || m.tags?.worksite_id === worksiteId)
    );

    return errors.length;
  }

  /**
   * Record a metric
   */
  private recordMetric(metric: Metric): void {
    this.metrics.push(metric);

    // Keep only last N metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // In production, send to metrics service (Prometheus, Datadog, etc.)
    // For now, just log
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Observability] ${metric.name}: ${metric.value}`, metric.tags);
    }
  }

  /**
   * Get all metrics (for debugging/monitoring)
   */
  public getMetrics(filter?: { name?: string; tags?: Record<string, string> }): Metric[] {
    let filtered = [...this.metrics];

    if (filter?.name) {
      filtered = filtered.filter(m => m.name === filter.name);
    }

    if (filter?.tags) {
      filtered = filtered.filter(m => {
        for (const [key, value] of Object.entries(filter.tags!)) {
          if (m.tags?.[key] !== value) {
            return false;
          }
        }
        return true;
      });
    }

    return filtered;
  }

  /**
   * Clear old metrics
   */
  public clearOldMetrics(olderThanMs: number): void {
    const cutoff = new Date(Date.now() - olderThanMs);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
    this.alertMetrics = this.alertMetrics.filter(a => a.created >= cutoff);
  }
}

export const observability = Observability.getInstance();


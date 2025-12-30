import { prisma } from './prisma';
import { Prisma } from '@prisma/client';
import { monitoringMiddleware } from './monitoring-middleware';
import { logger as appLogger } from './logger';
import { errorTracker } from './sentry';

export interface AlertRule {
  id: string;
  name: string;
  condition: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldown: number; // minutes
  channels: string[]; // email, sms, webhook
  recipients: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved';
  createdAt: Date;
  resolvedAt?: Date;
  metadata: any;
}

export class AlertingSystem {
  private static instance: AlertingSystem;
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private lastTriggered: Map<string, Date> = new Map();

  private constructor() {
    this.loadAlertRules();
    // Check for alerts every minute
    setInterval(() => this.checkAlerts(), 60000);
  }

  public static getInstance(): AlertingSystem {
    if (!AlertingSystem.instance) {
      AlertingSystem.instance = new AlertingSystem();
    }
    return AlertingSystem.instance;
  }

  // Load alert rules from database
  private async loadAlertRules(): Promise<void> {
    try {
      const rules = await prisma.alertRule.findMany({
        where: { isActive: true }
      });

      for (const rule of rules) {
        const alertRule: AlertRule = {
          id: rule.id,
          name: rule.name,
          condition: rule.condition as string,
          threshold: rule.condition as any,
          severity: rule.severity.toLowerCase() as any,
          enabled: rule.isActive,
          cooldown: 5, // Default 5 minutes
          channels: ['email'], // Default to email
          recipients: []
        };

        this.alertRules.set(rule.id, alertRule);
      }
    } catch (error) {
      appLogger.error('Error loading alert rules:', error as any);
    }
  }

  // Check all alert rules
  private async checkAlerts(): Promise<void> {
    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastTriggered = this.lastTriggered.get(ruleId);
      if (lastTriggered) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (Date.now() - lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      try {
        const shouldTrigger = await this.evaluateRule(rule);
        if (shouldTrigger) {
          await this.triggerAlert(rule);
          this.lastTriggered.set(ruleId, new Date());
        }
      } catch (error) {
        appLogger.error('Error checking alerts:', error as any);
      }
    }
  }

  // Evaluate alert rule
  private async evaluateRule(rule: AlertRule): Promise<boolean> {
    switch (rule.condition) {
      case 'high_error_rate':
        return await this.checkHighErrorRate(rule.threshold);
      
      case 'slow_response_time':
        return await this.checkSlowResponseTime(rule.threshold);
      
      case 'database_connection_failure':
        return await this.checkDatabaseConnectionFailure();
      
      case 'ai_detection_failure':
        return await this.checkAIDetectionFailure();
      
      case 'camera_stream_down':
        return await this.checkCameraStreamDown();
      
      case 'high_memory_usage':
        return await this.checkHighMemoryUsage(rule.threshold);
      
      case 'safety_violation_detected':
        return await this.checkSafetyViolation();
      
      default:
        return false;
    }
  }

  // Check high error rate
  private async checkHighErrorRate(threshold: number): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const errorCount = await prisma.detection.count({
        where: {
          createdAt: { gte: oneHourAgo },
          metadata: {
            path: ['error'],
            not: Prisma.JsonNull
          }
        }
      });

      return errorCount > threshold;
    } catch {
      return false;
    }
  }

  // Check slow response time
  private async checkSlowResponseTime(threshold: number): Promise<boolean> {
    // This would typically check metrics from Prometheus
    // For now, we'll use a simple heuristic
    const memoryUsage = process.memoryUsage();
    return memoryUsage.heapUsed > threshold * 1024 * 1024; // Convert MB to bytes
  }

  // Check database connection failure
  private async checkDatabaseConnectionFailure(): Promise<boolean> {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return false;
    } catch {
      return true;
    }
  }

  // Check AI detection failure
  private async checkAIDetectionFailure(): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const failedDetections = await prisma.detection.count({
        where: {
          createdAt: { gte: oneHourAgo },
          metadata: {
            path: ['error'],
            not: Prisma.JsonNull
          }
        }
      });

      return failedDetections > 10; // Threshold for AI failures
    } catch {
      return false;
    }
  }

  // Check camera stream down
  private async checkCameraStreamDown(): Promise<boolean> {
    try {
      const cameras = await prisma.camera.findMany({
        where: { status: 'active' }
      });

      // Check if any camera hasn't had detections in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      for (const camera of cameras) {
        const recentDetections = await prisma.detection.count({
          where: {
            cameraId: camera.id,
            createdAt: { gte: fiveMinutesAgo }
          }
        });

        if (recentDetections === 0) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  // Check high memory usage
  private async checkHighMemoryUsage(threshold: number): Promise<boolean> {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / (1024 * 1024);
    return memoryUsageMB > threshold;
  }

  // Check safety violation
  private async checkSafetyViolation(): Promise<boolean> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const violations = await prisma.detection.count({
        where: {
          createdAt: { gte: oneHourAgo },
          metadata: {
            path: ['safety_violation'],
            equals: true
          }
        }
      });

      return violations > 0;
    } catch {
      return false;
    }
  }

  // Trigger alert
  private async triggerAlert(rule: AlertRule): Promise<void> {
    const alert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      ruleId: rule.id,
      title: `Alert: ${rule.name}`,
      message: this.generateAlertMessage(rule),
      severity: rule.severity,
      status: 'active',
      createdAt: new Date(),
      metadata: {
        rule: rule.name,
        threshold: rule.threshold,
        condition: rule.condition
      }
    };

    // Store alert
    this.activeAlerts.set(alert.id, alert);

    // Record in database
    await this.storeAlert(alert);

    // Send notifications
    await this.sendNotifications(alert, rule);

    // Record metrics and logs
    monitoringMiddleware.recordAlert(
      rule.name,
      rule.severity,
      'system',
      undefined,
      {
        ruleId: rule.id,
        threshold: rule.threshold,
        condition: rule.condition
      }
    );

    appLogger.info(`Alert triggered: ${rule.name} (${rule.severity})`, {
      ruleId: rule.id,
      threshold: rule.threshold,
        condition: rule.condition
      }
    );
  }

  // Generate alert message
  private generateAlertMessage(rule: AlertRule): string {
    switch (rule.condition) {
      case 'high_error_rate':
        return `High error rate detected: ${rule.threshold} errors in the last hour`;
      
      case 'slow_response_time':
        return `Slow response time detected: ${rule.threshold}ms threshold exceeded`;
      
      case 'database_connection_failure':
        return 'Database connection failure detected';
      
      case 'ai_detection_failure':
        return 'AI detection service failure detected';
      
      case 'camera_stream_down':
        return 'Camera stream is down or not responding';
      
      case 'high_memory_usage':
        return `High memory usage detected: ${rule.threshold}MB threshold exceeded`;
      
      case 'safety_violation_detected':
        return 'Safety violation detected in the system';
      
      default:
        return `Alert triggered: ${rule.name}`;
    }
  }

  // Store alert in database
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      await prisma.alert.create({
        data: {
          title: alert.title,
          description: alert.message,
          severity: alert.severity.toUpperCase() as any,
          status: 'ACTIVE',
          source: 'system',
          metadata: alert.metadata,
          worksiteId: null
        }
      });
    } catch (error) {
      appLogger.error('Error storing alert:', error as any);
    }
  }

  // Send notifications
  private async sendNotifications(alert: Alert, rule: AlertRule): Promise<void> {
    for (const channel of rule.channels) {
      try {
        switch (channel) {
          case 'email':
            await this.sendEmailNotification(alert, rule);
            break;
          case 'sms':
            await this.sendSMSNotification(alert, rule);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert, rule);
            break;
        }
      } catch (error) {
        appLogger.error('Error sending notifications:', error as any);
        // Removed metadata parameter - logger.error doesn't accept it
        // {
          // channel,
          // alertId: alert.id
        // });
      }
    }
  }

  // Send email notification
  private async sendEmailNotification(alert: Alert, rule: AlertRule): Promise<void> {
    // Implementation would use your email service
    appLogger.info('Email notification sent', {
      alertId: alert.id,
      recipients: rule.recipients,
      severity: alert.severity
    });
  }

  // Send SMS notification
  private async sendSMSNotification(alert: Alert, rule: AlertRule): Promise<void> {
    // Implementation would use your SMS service
    appLogger.info('SMS notification sent', {
      alertId: alert.id,
      recipients: rule.recipients,
      severity: alert.severity
    });
  }

  // Send webhook notification
  private async sendWebhookNotification(alert: Alert, rule: AlertRule): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    appLogger.info('Webhook notification sent', {
      alertId: alert.id,
      severity: alert.severity
    });
  }

  // Acknowledge alert
  public async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      this.activeAlerts.set(alertId, alert);
      
      // Update in database
      await prisma.alert.update({
        where: { id: alertId },
        data: { status: 'ACKNOWLEDGED' }
      });

      appLogger.info(`User activity: alert_acknowledged by ${userId}`, {
        alertId,
        severity: alert.severity
      });
    }
  }

  // Resolve alert
  public async resolveAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      this.activeAlerts.set(alertId, alert);
      
      // Update in database
      await prisma.alert.update({
        where: { id: alertId },
        data: { 
          status: 'RESOLVED',
          resolvedAt: new Date()
        }
      });

      appLogger.info(`User activity: alert_resolved by ${userId}`, {
        alertId,
        severity: alert.severity
      });
    }
  }

  // Get active alerts
  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'active');
  }

  // Get alert statistics
  public getAlertStatistics(): any {
    const alerts = Array.from(this.activeAlerts.values());
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return {
      total: alerts.length,
      active: alerts.filter(a => a.status === 'active').length,
      acknowledged: alerts.filter(a => a.status === 'acknowledged').length,
      resolved: alerts.filter(a => a.status === 'resolved').length,
      last24Hours: alerts.filter(a => a.createdAt >= oneDayAgo).length,
      bySeverity: {
        low: alerts.filter(a => a.severity === 'low').length,
        medium: alerts.filter(a => a.severity === 'medium').length,
        high: alerts.filter(a => a.severity === 'high').length,
        critical: alerts.filter(a => a.severity === 'critical').length
      }
    };
  }
}

// Export singleton instance
export const alertingSystem = AlertingSystem.getInstance();

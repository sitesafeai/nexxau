import { prisma } from './prisma';
import notificationService from './notification-service';
import { broadcastSystemStatus } from './websocket';

export interface ErrorNotificationRule {
  id: string;
  name: string;
  description: string;
  conditions: NotificationCondition[];
  actions: NotificationAction[];
  isActive: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  cooldownPeriod: number; // in minutes
  escalationDelay: number; // in minutes
  maxNotifications: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
  logic?: 'AND' | 'OR';
}

export interface NotificationAction {
  type: 'email' | 'sms' | 'webhook' | 'slack' | 'teams';
  recipients: string[];
  template: string;
  delay: number; // in minutes
  retryAttempts: number;
  isEnabled: boolean;
}

export interface ErrorNotificationContext {
  errorId: string;
  severity: string;
  category: string;
  message: string;
  endpoint?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class ErrorNotificationManager {
  private static instance: ErrorNotificationManager;
  private rules: Map<string, ErrorNotificationRule> = new Map();
  private notificationHistory: Map<string, Date> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultRules();
  }

  public static getInstance(): ErrorNotificationManager {
    if (!ErrorNotificationManager.instance) {
      ErrorNotificationManager.instance = new ErrorNotificationManager();
    }
    return ErrorNotificationManager.instance;
  }

  private initializeDefaultRules() {
    // Critical System Errors
    this.addRule({
      id: 'critical-system-errors',
      name: 'Critical System Errors',
      description: 'Notify immediately for critical system errors',
      conditions: [
        { field: 'severity', operator: 'equals', value: 'critical' },
        { field: 'category', operator: 'in', value: ['system', 'database', 'external'] }
      ],
      actions: [
        {
          type: 'email',
          recipients: ['admin@nexxau.com', 'cto@nexxau.com'],
          template: 'critical-error',
          delay: 0,
          retryAttempts: 3,
          isEnabled: true
        },
        {
          type: 'sms',
          recipients: ['+1234567890'], // Emergency contact
          template: 'critical-error-sms',
          delay: 0,
          retryAttempts: 2,
          isEnabled: true
        }
      ],
      isActive: true,
      priority: 'critical',
      cooldownPeriod: 5,
      escalationDelay: 15,
      maxNotifications: 10
    });

    // Database Errors
    this.addRule({
      id: 'database-errors',
      name: 'Database Errors',
      description: 'Notify for database-related errors',
      conditions: [
        { field: 'category', operator: 'equals', value: 'database' },
        { field: 'severity', operator: 'in', value: ['high', 'critical'] }
      ],
      actions: [
        {
          type: 'email',
          recipients: ['admin@nexxau.com', 'dba@nexxau.com'],
          template: 'database-error',
          delay: 0,
          retryAttempts: 3,
          isEnabled: true
        },
        {
          type: 'slack',
          recipients: ['#alerts'],
          template: 'database-error-slack',
          delay: 2,
          retryAttempts: 2,
          isEnabled: true
        }
      ],
      isActive: true,
      priority: 'high',
      cooldownPeriod: 10,
      escalationDelay: 30,
      maxNotifications: 5
    });

    // AI Detection Service Errors
    this.addRule({
      id: 'ai-service-errors',
      name: 'AI Detection Service Errors',
      description: 'Notify for AI service failures',
      conditions: [
        { field: 'category', operator: 'equals', value: 'external' },
        { field: 'message', operator: 'contains', value: 'ai' },
        { field: 'severity', operator: 'in', value: ['medium', 'high', 'critical'] }
      ],
      actions: [
        {
          type: 'email',
          recipients: ['admin@nexxau.com', 'ai-team@nexxau.com'],
          template: 'ai-service-error',
          delay: 0,
          retryAttempts: 3,
          isEnabled: true
        },
        {
          type: 'teams',
          recipients: ['AI Team Channel'],
          template: 'ai-service-error-teams',
          delay: 5,
          retryAttempts: 2,
          isEnabled: true
        }
      ],
      isActive: true,
      priority: 'high',
      cooldownPeriod: 15,
      escalationDelay: 45,
      maxNotifications: 3
    });

    // Safety Monitoring Errors
    this.addRule({
      id: 'safety-monitoring-errors',
      name: 'Safety Monitoring Errors',
      description: 'Notify for safety monitoring system errors',
      conditions: [
        { field: 'category', operator: 'equals', value: 'business' },
        { field: 'message', operator: 'contains', value: 'safety' },
        { field: 'severity', operator: 'in', value: ['high', 'critical'] }
      ],
      actions: [
        {
          type: 'email',
          recipients: ['admin@nexxau.com', 'safety-team@nexxau.com'],
          template: 'safety-error',
          delay: 0,
          retryAttempts: 5,
          isEnabled: true
        },
        {
          type: 'sms',
          recipients: ['+1234567890'], // Safety manager
          template: 'safety-error-sms',
          delay: 0,
          retryAttempts: 3,
          isEnabled: true
        }
      ],
      isActive: true,
      priority: 'critical',
      cooldownPeriod: 0,
      escalationDelay: 10,
      maxNotifications: 20
    });

    // Authentication Errors
    this.addRule({
      id: 'auth-errors',
      name: 'Authentication Errors',
      description: 'Notify for authentication and authorization errors',
      conditions: [
        { field: 'category', operator: 'in', value: ['authentication', 'authorization'] },
        { field: 'severity', operator: 'in', value: ['medium', 'high'] }
      ],
      actions: [
        {
          type: 'email',
          recipients: ['security@nexxau.com'],
          template: 'auth-error',
          delay: 5,
          retryAttempts: 2,
          isEnabled: true
        }
      ],
      isActive: true,
      priority: 'medium',
      cooldownPeriod: 30,
      escalationDelay: 60,
      maxNotifications: 3
    });

    // High Frequency Errors
    this.addRule({
      id: 'high-frequency-errors',
      name: 'High Frequency Errors',
      description: 'Notify when error rate exceeds threshold',
      conditions: [
        { field: 'frequency', operator: 'greater_than', value: 10 }, // More than 10 errors in 5 minutes
        { field: 'severity', operator: 'in', value: ['medium', 'high'] }
      ],
      actions: [
        {
          type: 'email',
          recipients: ['admin@nexxau.com'],
          template: 'high-frequency-error',
          delay: 0,
          retryAttempts: 2,
          isEnabled: true
        },
        {
          type: 'slack',
          recipients: ['#alerts'],
          template: 'high-frequency-error-slack',
          delay: 0,
          retryAttempts: 1,
          isEnabled: true
        }
      ],
      isActive: true,
      priority: 'high',
      cooldownPeriod: 60,
      escalationDelay: 120,
      maxNotifications: 2
    });
  }

  public addRule(rule: ErrorNotificationRule) {
    this.rules.set(rule.id, rule);
  }

  public async processErrorNotification(context: ErrorNotificationContext) {
    const applicableRules = this.findApplicableRules(context);
    
    for (const rule of applicableRules) {
      if (!rule.isActive) continue;
      
      // Check cooldown period
      const ruleKey = `${rule.id}_${context.category}_${context.severity}`;
      const lastNotification = this.notificationHistory.get(ruleKey);
      
      if (lastNotification) {
        const cooldownMs = rule.cooldownPeriod * 60 * 1000;
        if (Date.now() - lastNotification.getTime() < cooldownMs) {
          continue;
        }
      }
      
      // Check notification count
      const notificationCount = await this.getNotificationCount(ruleKey, rule.maxNotifications);
      if (notificationCount >= rule.maxNotifications) {
        continue;
      }
      
      // Execute notification actions
      await this.executeNotificationActions(rule, context);
      
      // Update notification history
      this.notificationHistory.set(ruleKey, new Date());
      
      // Set up escalation if needed
      if (rule.escalationDelay > 0) {
        this.setupEscalation(rule, context);
      }
    }
  }

  private findApplicableRules(context: ErrorNotificationContext): ErrorNotificationRule[] {
    const applicable: ErrorNotificationRule[] = [];
    
    for (const rule of this.rules.values()) {
      if (this.evaluateConditions(rule.conditions, context)) {
        applicable.push(rule);
      }
    }
    
    return applicable;
  }

  private evaluateConditions(
    conditions: NotificationCondition[],
    context: ErrorNotificationContext
  ): boolean {
    if (conditions.length === 0) return true;
    
    let result = true;
    let logicOperator: 'AND' | 'OR' = 'AND';
    
    for (let i = 0; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, context);
      
      if (i === 0) {
        result = conditionResult;
      } else {
        if (logicOperator === 'AND') {
          result = result && conditionResult;
        } else {
          result = result || conditionResult;
        }
      }
      
      logicOperator = condition.logic || 'AND';
    }
    
    return result;
  }

  private evaluateCondition(
    condition: NotificationCondition,
    context: ErrorNotificationContext
  ): boolean {
    const fieldValue = this.getFieldValue(condition.field, context);
    
    switch (condition.operator) {
      case 'equals':
        return fieldValue === condition.value;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(condition.value);
      case 'less_than':
        return Number(fieldValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(fieldValue);
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
      default:
        return false;
    }
  }

  private getFieldValue(field: string, context: ErrorNotificationContext): any {
    switch (field) {
      case 'severity':
        return context.severity;
      case 'category':
        return context.category;
      case 'message':
        return context.message;
      case 'endpoint':
        return context.endpoint;
      case 'userId':
        return context.userId;
      case 'frequency':
        return this.getErrorFrequency(context);
      default:
        return context.metadata?.[field];
    }
  }

  private getErrorFrequency(context: ErrorNotificationContext): number {
    // This would typically query the database for error frequency
    // For now, return a mock value
    return Math.floor(Math.random() * 20);
  }

  private async executeNotificationActions(
    rule: ErrorNotificationRule,
    context: ErrorNotificationContext
  ) {
    for (const action of rule.actions) {
      if (!action.isEnabled) continue;
      
      // Apply delay if specified
      if (action.delay > 0) {
        setTimeout(async () => {
          await this.executeNotificationAction(action, context);
        }, action.delay * 60 * 1000);
      } else {
        await this.executeNotificationAction(action, context);
      }
    }
  }

  private async executeNotificationAction(
    action: NotificationAction,
    context: ErrorNotificationContext
  ) {
    const notificationData = {
      to: action.recipients,
      type: action.type as 'email' | 'sms',
      template: action.template,
      data: {
        errorId: context.errorId,
        severity: context.severity,
        category: context.category,
        message: context.message,
        endpoint: context.endpoint,
        userId: context.userId,
        timestamp: context.timestamp.toISOString(),
        metadata: context.metadata
      },
      priority: this.getPriorityFromSeverity(context.severity)
    };

    // Execute with retries
    for (let attempt = 1; attempt <= action.retryAttempts; attempt++) {
      try {
        const success = await notificationService.sendNotification(notificationData);
        if (success) {
          console.log(`Notification sent successfully: ${action.type} to ${action.recipients.join(', ')}`);
          break;
        }
      } catch (error) {
        console.error(`Notification attempt ${attempt} failed:`, error);
        if (attempt === action.retryAttempts) {
          console.error(`All notification attempts failed for ${action.type}`);
        } else {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  private setupEscalation(rule: ErrorNotificationRule, context: ErrorNotificationContext) {
    const escalationKey = `${rule.id}_${context.errorId}`;
    
    // Clear existing escalation timer
    const existingTimer = this.escalationTimers.get(escalationKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set up new escalation timer
    const timer = setTimeout(async () => {
      await this.executeEscalation(rule, context);
      this.escalationTimers.delete(escalationKey);
    }, rule.escalationDelay * 60 * 1000);
    
    this.escalationTimers.set(escalationKey, timer);
  }

  private async executeEscalation(rule: ErrorNotificationRule, context: ErrorNotificationContext) {
    console.log(`Executing escalation for rule: ${rule.name}`);
    
    // Send escalation notification
    await notificationService.sendNotification({
      to: ['admin@nexxau.com', 'escalation@nexxau.com'],
      type: 'email',
      template: 'error-escalation',
      data: {
        ruleName: rule.name,
        errorId: context.errorId,
        severity: context.severity,
        category: context.category,
        message: context.message,
        timestamp: context.timestamp.toISOString(),
        escalationTime: new Date().toISOString()
      },
      priority: 'urgent'
    });

    // Log escalation
    await prisma.errorLog.create({
      data: {
        message: `Error escalation triggered: ${rule.name}`,
        severity: 'high',
        category: 'system',
        metadata: {
          ruleId: rule.id,
          ruleName: rule.name,
          errorId: context.errorId,
          escalationTime: new Date().toISOString()
        }
      }
    });
  }

  private getPriorityFromSeverity(severity: string): 'low' | 'normal' | 'high' | 'urgent' {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'normal';
      case 'low': return 'low';
      default: return 'normal';
    }
  }

  private async getNotificationCount(ruleKey: string, maxNotifications: number): Promise<number> {
    // This would typically query the database for notification count
    // For now, return a mock value
    return Math.floor(Math.random() * maxNotifications);
  }

  public getRules(): Map<string, ErrorNotificationRule> {
    return this.rules;
  }

  public getNotificationHistory(): Map<string, Date> {
    return this.notificationHistory;
  }

  public async getNotificationStats() {
    const stats = await prisma.errorLog.groupBy({
      by: ['severity', 'category'],
      where: {
        metadata: {
          path: ['notificationSent'],
          equals: true
        }
      },
      _count: true
    });

    return {
      totalRules: this.rules.size,
      activeRules: Array.from(this.rules.values()).filter(rule => rule.isActive).length,
      notificationHistory: this.notificationHistory.size,
      escalationTimers: this.escalationTimers.size,
      stats
    };
  }
}

// Global notification manager instance
export const notificationManager = ErrorNotificationManager.getInstance();

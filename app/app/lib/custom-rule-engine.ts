// Custom Rule Engine for Computer Vision Detection
import { prisma } from './prisma';
import { logInfo, logError, logWarning } from './logger';
import { multiSmsService } from './multi-sms-service';

interface DetectionData {
  objects: Array<{
    class: string;
    confidence: number;
    bbox: [number, number, number, number]; // [x, y, width, height]
    id?: string;
  }>;
  timestamp: Date;
  cameraId: string;
  frameData?: string;
  metadata?: any;
}

interface RuleEvaluationResult {
  triggered: boolean;
  confidence: number;
  matchedCriteria: any;
  violationData?: any;
}

interface CustomRuleConfig {
  id: string;
  name: string;
  ruleType: string;
  category: string;
  severity: string;
  isActive: boolean;
  priority: number;
  detectionCriteria: any;
  triggerConditions: any;
  alertSettings: any;
  timeConstraints?: any;
  locationConstraints?: any;
  aiModelType?: string;
  confidenceThreshold: number;
  customModelPath?: string;
  smsEnabled: boolean;
  emailEnabled: boolean;
  dashboardEnabled: boolean;
  smsRecipients?: string[];
  emailRecipients?: string[];
  cooldownMinutes: number;
  maxAlertsPerHour: number;
  worksiteId?: string;
  cameraId?: string;
  triggerCount: number;
  lastTriggeredAt?: Date;
}

export class CustomRuleEngine {
  private static instance: CustomRuleEngine;
  private activeRules: Map<string, CustomRuleConfig> = new Map();
  private cooldownTimers: Map<string, Date> = new Map();
  private hourlyAlertCounts: Map<string, number> = new Map();
  private lastHourReset: Date = new Date();

  private constructor() {
    this.loadActiveRules();
    this.startPeriodicTasks();
  }

  public static getInstance(): CustomRuleEngine {
    if (!CustomRuleEngine.instance) {
      CustomRuleEngine.instance = new CustomRuleEngine();
    }
    return CustomRuleEngine.instance;
  }

  private async loadActiveRules(): Promise<void> {
    try {
      const rules = await prisma.customRule.findMany({
        where: { isActive: true },
        include: {
          worksite: { select: { name: true, worksiteName: true } },
          camera: { select: { name: true } },
          creator: { select: { name: true, email: true } }
        }
      });

      this.activeRules.clear();
      rules.forEach(rule => {
        this.activeRules.set(rule.id, {
          id: rule.id,
          name: rule.name,
          ruleType: rule.ruleType,
          category: rule.category,
          severity: rule.severity,
          isActive: rule.isActive,
          priority: rule.priority,
          detectionCriteria: rule.detectionCriteria as any,
          triggerConditions: rule.triggerConditions as any,
          alertSettings: rule.alertSettings as any,
          timeConstraints: rule.timeConstraints as any,
          locationConstraints: rule.locationConstraints as any,
          aiModelType: rule.aiModelType,
          confidenceThreshold: rule.confidenceThreshold,
          customModelPath: rule.customModelPath,
          smsEnabled: rule.smsEnabled,
          emailEnabled: rule.emailEnabled,
          dashboardEnabled: rule.dashboardEnabled,
          smsRecipients: rule.smsRecipients as string[],
          emailRecipients: rule.emailRecipients as string[],
          cooldownMinutes: rule.cooldownMinutes,
          maxAlertsPerHour: rule.maxAlertsPerHour,
          worksiteId: rule.worksiteId,
          cameraId: rule.cameraId,
          triggerCount: rule.triggerCount,
          lastTriggeredAt: rule.lastTriggeredAt
        });
      });

      logInfo(`Loaded ${this.activeRules.size} active custom rules`);
    } catch (error) {
      logError('Failed to load custom rules:', error);
    }
  }

  private startPeriodicTasks(): void {
    // Reload rules every 5 minutes
    setInterval(() => {
      this.loadActiveRules();
    }, 5 * 60 * 1000);

    // Reset hourly alert counts every hour
    setInterval(() => {
      this.hourlyAlertCounts.clear();
      this.lastHourReset = new Date();
      logInfo('Reset hourly alert counts');
    }, 60 * 60 * 1000);
  }

  public async processDetection(detectionData: DetectionData): Promise<void> {
    try {
      // Filter rules that apply to this camera/worksite
      const applicableRules = Array.from(this.activeRules.values()).filter(rule => {
        if (rule.cameraId && rule.cameraId !== detectionData.cameraId) return false;
        if (rule.worksiteId) {
          // Check if camera belongs to this worksite
          // This would need to be implemented with a database query
        }
        return true;
      });

      // Sort by priority (lower number = higher priority)
      applicableRules.sort((a, b) => a.priority - b.priority);

      // Evaluate each rule
      for (const rule of applicableRules) {
        try {
          const result = await this.evaluateRule(rule, detectionData);
          if (result.triggered) {
            await this.handleRuleTrigger(rule, detectionData, result);
          }
        } catch (error) {
          logError(`Error evaluating rule ${rule.name}:`, error);
        }
      }
    } catch (error) {
      logError('Error processing detection:', error);
    }
  }

  private async evaluateRule(rule: CustomRuleConfig, detectionData: DetectionData): Promise<RuleEvaluationResult> {
    // Check time constraints
    if (rule.timeConstraints && !this.checkTimeConstraints(rule.timeConstraints)) {
      return { triggered: false, confidence: 0, matchedCriteria: null };
    }

    // Check location constraints
    if (rule.locationConstraints && !this.checkLocationConstraints(rule.locationConstraints, detectionData)) {
      return { triggered: false, confidence: 0, matchedCriteria: null };
    }

    // Check cooldown
    if (this.isInCooldown(rule.id)) {
      return { triggered: false, confidence: 0, matchedCriteria: null };
    }

    // Check hourly rate limit
    if (this.isRateLimited(rule.id)) {
      return { triggered: false, confidence: 0, matchedCriteria: null };
    }

    // Evaluate based on rule type
    switch (rule.ruleType) {
      case 'object_detection':
        return this.evaluateObjectDetectionRule(rule, detectionData);
      case 'behavior_analysis':
        return this.evaluateBehaviorAnalysisRule(rule, detectionData);
      case 'area_monitoring':
        return this.evaluateAreaMonitoringRule(rule, detectionData);
      case 'time_based':
        return this.evaluateTimeBasedRule(rule, detectionData);
      default:
        logWarning(`Unknown rule type: ${rule.ruleType}`);
        return { triggered: false, confidence: 0, matchedCriteria: null };
    }
  }

  private evaluateObjectDetectionRule(rule: CustomRuleConfig, detectionData: DetectionData): RuleEvaluationResult {
    const criteria = rule.detectionCriteria;
    const triggerConditions = rule.triggerConditions;

    // Check if required objects are detected
    const requiredObjects = criteria.requiredObjects || [];
    const detectedObjects = detectionData.objects.filter(obj => 
      requiredObjects.includes(obj.class) && obj.confidence >= rule.confidenceThreshold
    );

    if (detectedObjects.length === 0) {
      return { triggered: false, confidence: 0, matchedCriteria: null };
    }

    // Check trigger conditions
    let triggered = false;
    let confidence = 0;
    let matchedCriteria: any = {};

    switch (triggerConditions.type) {
      case 'object_count':
        const minCount = triggerConditions.minCount || 1;
        const maxCount = triggerConditions.maxCount || Infinity;
        if (detectedObjects.length >= minCount && detectedObjects.length <= maxCount) {
          triggered = true;
          confidence = Math.max(...detectedObjects.map(obj => obj.confidence));
          matchedCriteria = { objectCount: detectedObjects.length, objects: detectedObjects };
        }
        break;

      case 'object_in_area':
        const restrictedArea = triggerConditions.restrictedArea;
        const objectsInArea = detectedObjects.filter(obj => 
          this.isObjectInArea(obj.bbox, restrictedArea)
        );
        if (objectsInArea.length > 0) {
          triggered = true;
          confidence = Math.max(...objectsInArea.map(obj => obj.confidence));
          matchedCriteria = { objectsInArea, restrictedArea };
        }
        break;

      case 'object_combination':
        const requiredCombination = triggerConditions.requiredCombination;
        const hasAllObjects = requiredCombination.every((objClass: string) =>
          detectedObjects.some(obj => obj.class === objClass)
        );
        if (hasAllObjects) {
          triggered = true;
          confidence = Math.max(...detectedObjects.map(obj => obj.confidence));
          matchedCriteria = { combination: requiredCombination, detectedObjects };
        }
        break;

      case 'object_missing':
        const requiredObject = triggerConditions.requiredObject;
        const hasRequiredObject = detectedObjects.some(obj => obj.class === requiredObject);
        if (!hasRequiredObject) {
          triggered = true;
          confidence = 1.0; // High confidence for missing object
          matchedCriteria = { missingObject: requiredObject };
        }
        break;
    }

    return { triggered, confidence, matchedCriteria };
  }

  private evaluateBehaviorAnalysisRule(rule: CustomRuleConfig, detectionData: DetectionData): RuleEvaluationResult {
    // This would integrate with behavior analysis AI models
    // For now, return a placeholder implementation
    const criteria = rule.detectionCriteria;
    const triggerConditions = rule.triggerConditions;

    // Placeholder: Check for specific behavior patterns
    const behaviorPatterns = criteria.behaviorPatterns || [];
    const detectedBehaviors = detectionData.metadata?.behaviors || [];

    const matchingBehaviors = detectedBehaviors.filter((behavior: any) =>
      behaviorPatterns.includes(behavior.type) && behavior.confidence >= rule.confidenceThreshold
    );

    if (matchingBehaviors.length > 0) {
      return {
        triggered: true,
        confidence: Math.max(...matchingBehaviors.map((b: any) => b.confidence)),
        matchedCriteria: { behaviors: matchingBehaviors }
      };
    }

    return { triggered: false, confidence: 0, matchedCriteria: null };
  }

  private evaluateAreaMonitoringRule(rule: CustomRuleConfig, detectionData: DetectionData): RuleEvaluationResult {
    const criteria = rule.detectionCriteria;
    const triggerConditions = rule.triggerConditions;

    // Check if any objects are in restricted areas
    const restrictedAreas = criteria.restrictedAreas || [];
    const violations = [];

    for (const area of restrictedAreas) {
      const objectsInArea = detectionData.objects.filter(obj =>
        obj.confidence >= rule.confidenceThreshold &&
        this.isObjectInArea(obj.bbox, area)
      );

      if (objectsInArea.length > 0) {
        violations.push({
          area,
          objects: objectsInArea,
          count: objectsInArea.length
        });
      }
    }

    if (violations.length > 0) {
      return {
        triggered: true,
        confidence: Math.max(...violations.flatMap(v => v.objects.map(o => o.confidence))),
        matchedCriteria: { violations }
      };
    }

    return { triggered: false, confidence: 0, matchedCriteria: null };
  }

  private evaluateTimeBasedRule(rule: CustomRuleConfig, detectionData: DetectionData): RuleEvaluationResult {
    const criteria = rule.detectionCriteria;
    const triggerConditions = rule.triggerConditions;

    // Check if current time matches trigger conditions
    const now = new Date();
    const timeConditions = triggerConditions.timeConditions || [];

    for (const condition of timeConditions) {
      if (this.matchesTimeCondition(now, condition)) {
        return {
          triggered: true,
          confidence: 1.0,
          matchedCriteria: { timeCondition: condition, timestamp: now }
        };
      }
    }

    return { triggered: false, confidence: 0, matchedCriteria: null };
  }

  private async handleRuleTrigger(
    rule: CustomRuleConfig, 
    detectionData: DetectionData, 
    result: RuleEvaluationResult
  ): Promise<void> {
    try {
      // Create rule trigger record
      const trigger = await prisma.customRuleTrigger.create({
        data: {
          ruleId: rule.id,
          triggerType: this.getTriggerType(rule.ruleType),
          confidence: result.confidence,
          detectionData: {
            objects: detectionData.objects,
            timestamp: detectionData.timestamp,
            metadata: detectionData.metadata,
            matchedCriteria: result.matchedCriteria
          },
          cameraId: detectionData.cameraId,
          worksiteId: rule.worksiteId,
          location: detectionData.metadata?.location,
          timestamp: detectionData.timestamp
        }
      });

      // Create violation record
      const violation = await prisma.customRuleViolation.create({
        data: {
          ruleId: rule.id,
          triggerId: trigger.id,
          violationType: this.getViolationType(rule),
          severity: rule.severity,
          description: this.generateViolationDescription(rule, result),
          detectionData: {
            objects: detectionData.objects,
            matchedCriteria: result.matchedCriteria,
            confidence: result.confidence
          },
          imageUrl: detectionData.frameData ? this.saveFrameImage(detectionData.frameData, trigger.id) : null,
          cameraId: detectionData.cameraId,
          worksiteId: rule.worksiteId,
          location: detectionData.metadata?.location,
          detectedAt: detectionData.timestamp
        }
      });

      // Update rule trigger count
      await prisma.customRule.update({
        where: { id: rule.id },
        data: {
          triggerCount: { increment: 1 },
          lastTriggeredAt: new Date()
        }
      });

      // Set cooldown
      this.setCooldown(rule.id, rule.cooldownMinutes);

      // Increment hourly alert count
      this.incrementHourlyAlertCount(rule.id);

      // Send notifications
      await this.sendNotifications(rule, violation, result);

      logInfo(`Rule "${rule.name}" triggered: ${violation.description}`);

    } catch (error) {
      logError(`Error handling rule trigger for ${rule.name}:`, error);
    }
  }

  private async sendNotifications(
    rule: CustomRuleConfig, 
    violation: any, 
    result: RuleEvaluationResult
  ): Promise<void> {
    try {
      const message = this.formatNotificationMessage(rule, violation, result);

      // Send SMS if enabled
      if (rule.smsEnabled && rule.smsRecipients && rule.smsRecipients.length > 0) {
        for (const phoneNumber of rule.smsRecipients) {
          try {
            const smsResult = await multiSmsService.sendSafetyViolationSMS(phoneNumber, {
              violationType: violation.violationType,
              severity: rule.severity,
              location: violation.location || 'Unknown Location',
              description: violation.description,
              timestamp: violation.detectedAt,
              worksiteId: rule.worksiteId,
              cameraId: rule.cameraId
            });

            if (smsResult.success) {
              await prisma.customRuleTrigger.update({
                where: { id: violation.triggerId },
                data: { smsSent: true }
              });
              await prisma.customRuleViolation.update({
                where: { id: violation.id },
                data: { smsSent: true }
              });
            }
          } catch (error) {
            logError(`Failed to send SMS for rule ${rule.name}:`, error);
          }
        }
      }

      // Send email if enabled (placeholder)
      if (rule.emailEnabled && rule.emailRecipients && rule.emailRecipients.length > 0) {
        // Email implementation would go here
        logInfo(`Email notification sent for rule ${rule.name}`);
      }

      // Dashboard notification is always enabled
      logInfo(`Dashboard notification created for rule ${rule.name}`);

    } catch (error) {
      logError(`Error sending notifications for rule ${rule.name}:`, error);
    }
  }

  private formatNotificationMessage(rule: CustomRuleConfig, violation: any, result: RuleEvaluationResult): string {
    const emoji = this.getSeverityEmoji(rule.severity);
    const timestamp = violation.detectedAt.toLocaleString();
    
    return `
${emoji} CUSTOM RULE VIOLATION ALERT ${emoji}

Rule: ${rule.name}
Type: ${violation.violationType}
Severity: ${rule.severity.toUpperCase()}
Location: ${violation.location || 'Unknown'}
Time: ${timestamp}
Confidence: ${(result.confidence * 100).toFixed(1)}%

Description: ${violation.description}

This is an automated alert from Nexxau Safety Monitoring System.
    `.trim();
  }

  // Helper methods
  private checkTimeConstraints(constraints: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentDay = now.getDay(); // 0 = Sunday, 1 = Monday, etc.

    if (constraints.allowedHours) {
      const [startHour, endHour] = constraints.allowedHours;
      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    if (constraints.allowedDays) {
      if (!constraints.allowedDays.includes(currentDay)) {
        return false;
      }
    }

    return true;
  }

  private checkLocationConstraints(constraints: any, detectionData: DetectionData): boolean {
    // This would check GPS coordinates or area names
    // For now, return true (no location constraints)
    return true;
  }

  private isInCooldown(ruleId: string): boolean {
    const lastTriggered = this.cooldownTimers.get(ruleId);
    if (!lastTriggered) return false;

    const rule = this.activeRules.get(ruleId);
    if (!rule) return false;

    const cooldownMs = rule.cooldownMinutes * 60 * 1000;
    return (Date.now() - lastTriggered.getTime()) < cooldownMs;
  }

  private setCooldown(ruleId: string, cooldownMinutes: number): void {
    this.cooldownTimers.set(ruleId, new Date());
  }

  private isRateLimited(ruleId: string): boolean {
    const rule = this.activeRules.get(ruleId);
    if (!rule) return false;

    const currentCount = this.hourlyAlertCounts.get(ruleId) || 0;
    return currentCount >= rule.maxAlertsPerHour;
  }

  private incrementHourlyAlertCount(ruleId: string): void {
    const currentCount = this.hourlyAlertCounts.get(ruleId) || 0;
    this.hourlyAlertCounts.set(ruleId, currentCount + 1);
  }

  private isObjectInArea(bbox: [number, number, number, number], area: any): boolean {
    // Simple bounding box intersection check
    // This would be more sophisticated in a real implementation
    return true; // Placeholder
  }

  private matchesTimeCondition(timestamp: Date, condition: any): boolean {
    // Check if timestamp matches the time condition
    // This would be more sophisticated in a real implementation
    return false; // Placeholder
  }

  private getTriggerType(ruleType: string): string {
    switch (ruleType) {
      case 'object_detection': return 'object_detected';
      case 'behavior_analysis': return 'behavior_detected';
      case 'area_monitoring': return 'area_violation';
      case 'time_based': return 'time_violation';
      default: return 'unknown';
    }
  }

  private getViolationType(rule: CustomRuleConfig): string {
    return `${rule.category}_${rule.ruleType}`;
  }

  private generateViolationDescription(rule: CustomRuleConfig, result: RuleEvaluationResult): string {
    return `Custom rule "${rule.name}" triggered: ${JSON.stringify(result.matchedCriteria)}`;
  }

  private saveFrameImage(frameData: string, triggerId: string): string {
    // This would save the frame image and return the URL
    // For now, return a placeholder
    return `/api/images/violations/${triggerId}.jpg`;
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity.toLowerCase()) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚠️';
    }
  }

  // Public methods for rule management
  public async createRule(ruleData: any): Promise<any> {
    try {
      const rule = await prisma.customRule.create({
        data: ruleData
      });
      
      // Reload active rules
      await this.loadActiveRules();
      
      return rule;
    } catch (error) {
      logError('Failed to create custom rule:', error);
      throw error;
    }
  }

  public async updateRule(ruleId: string, ruleData: any): Promise<any> {
    try {
      const rule = await prisma.customRule.update({
        where: { id: ruleId },
        data: ruleData
      });
      
      // Reload active rules
      await this.loadActiveRules();
      
      return rule;
    } catch (error) {
      logError('Failed to update custom rule:', error);
      throw error;
    }
  }

  public async deleteRule(ruleId: string): Promise<void> {
    try {
      await prisma.customRule.delete({
        where: { id: ruleId }
      });
      
      // Reload active rules
      await this.loadActiveRules();
    } catch (error) {
      logError('Failed to delete custom rule:', error);
      throw error;
    }
  }

  public getActiveRules(): CustomRuleConfig[] {
    return Array.from(this.activeRules.values());
  }

  public getRuleStatus(ruleId: string): any {
    const rule = this.activeRules.get(ruleId);
    if (!rule) return null;

    return {
      ...rule,
      isInCooldown: this.isInCooldown(ruleId),
      hourlyAlertCount: this.hourlyAlertCounts.get(ruleId) || 0,
      isRateLimited: this.isRateLimited(ruleId)
    };
  }
}

// Export singleton instance
export const customRuleEngine = CustomRuleEngine.getInstance();

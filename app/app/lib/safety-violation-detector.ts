import { prisma } from './prisma';
import { smsService } from './sms-service';
import { broadcastNotification } from './websocket';
import { 
  getWorksiteSettings, 
  checkViolationRateLimit,
  shouldSendNotification 
} from './worksite-settings';

export interface ViolationDetection {
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  location: string;
  description: string;
  cameraId?: string;
  worksiteId?: string;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface SafetyRule {
  id: string;
  name: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidenceThreshold: number;
  smsEnabled: boolean;
  smsRecipients: string[];
  isActive: boolean;
  worksiteId?: string;
}

export class SafetyViolationDetector {
  private static instance: SafetyViolationDetector;
  private safetyRules: Map<string, SafetyRule> = new Map();
  private violationHistory: Map<string, Date> = new Map();
  private cooldownPeriods: Map<string, number> = new Map(); // in minutes

  constructor() {
    this.initializeDefaultRules();
    this.loadSafetyRules();
  }

  public static getInstance(): SafetyViolationDetector {
    if (!SafetyViolationDetector.instance) {
      SafetyViolationDetector.instance = new SafetyViolationDetector();
    }
    return SafetyViolationDetector.instance;
  }

  private initializeDefaultRules() {
    // Hard hat violation rule
    this.addSafetyRule({
      id: 'hard-hat-violation',
      name: 'Hard Hat Violation',
      violationType: 'hard_hat_violation',
      severity: 'high',
      confidenceThreshold: 80,
      smsEnabled: true,
      smsRecipients: [],
      isActive: true,
      worksiteId: undefined
    });

    // Safety equipment missing rule
    this.addSafetyRule({
      id: 'safety-equipment-missing',
      name: 'Safety Equipment Missing',
      violationType: 'safety_equipment_missing',
      severity: 'medium',
      confidenceThreshold: 75,
      smsEnabled: true,
      smsRecipients: [],
      isActive: true,
      worksiteId: undefined
    });

    // Unsafe behavior rule
    this.addSafetyRule({
      id: 'unsafe-behavior',
      name: 'Unsafe Behavior',
      violationType: 'unsafe_behavior',
      severity: 'critical',
      confidenceThreshold: 85,
      smsEnabled: true,
      smsRecipients: [],
      isActive: true,
      worksiteId: undefined
    });

    // Restricted area access rule
    this.addSafetyRule({
      id: 'restricted-area-access',
      name: 'Restricted Area Access',
      violationType: 'restricted_area_access',
      severity: 'critical',
      confidenceThreshold: 90,
      smsEnabled: true,
      smsRecipients: [],
      isActive: true,
      worksiteId: undefined
    });

    // Set cooldown periods (in minutes)
    this.cooldownPeriods.set('hard_hat_violation', 15);
    this.cooldownPeriods.set('safety_equipment_missing', 30);
    this.cooldownPeriods.set('unsafe_behavior', 5);
    this.cooldownPeriods.set('restricted_area_access', 0); // No cooldown for critical violations
  }

  private async loadSafetyRules() {
    try {
      // Load custom safety rules from database
      const customRules = await prisma.safetyRule.findMany({
        where: { isActive: true }
      });

      for (const rule of customRules) {
        this.addSafetyRule({
          id: rule.id,
          name: rule.name,
          violationType: rule.violationType,
          severity: rule.severity as any,
          confidenceThreshold: rule.confidenceThreshold,
          smsEnabled: rule.smsEnabled,
          smsRecipients: rule.smsRecipients as string[],
          isActive: rule.isActive,
          worksiteId: rule.worksiteId || undefined
        });
      }
    } catch (error) {
      console.error('Failed to load safety rules:', error);
    }
  }

  public addSafetyRule(rule: SafetyRule) {
    this.safetyRules.set(rule.id, rule);
  }

  public async processViolationDetection(detection: ViolationDetection): Promise<boolean> {
    try {
      // Check if this violation type has a cooldown period
      const cooldownMinutes = this.cooldownPeriods.get(detection.violationType) || 0;
      const lastViolation = this.violationHistory.get(detection.violationType);
      
      if (lastViolation && cooldownMinutes > 0) {
        const timeSinceLastViolation = Date.now() - lastViolation.getTime();
        const cooldownMs = cooldownMinutes * 60 * 1000;
        
        if (timeSinceLastViolation < cooldownMs) {
          console.log(`Violation ${detection.violationType} is in cooldown period`);
          return false;
        }
      }

      // Find applicable safety rules
      const applicableRules = this.findApplicableRules(detection);
      
      if (applicableRules.length === 0) {
        console.log(`No safety rules found for violation type: ${detection.violationType}`);
        return false;
      }

      // Check confidence threshold
      const rule = applicableRules[0]; // Use first applicable rule
      if (detection.confidence < rule.confidenceThreshold) {
        console.log(`Confidence ${detection.confidence} below threshold ${rule.confidenceThreshold}`);
        return false;
      }

      // Process the violation
      const violationProcessed = await this.processViolation(detection, rule);
      
      if (violationProcessed) {
        // Update violation history
        this.violationHistory.set(detection.violationType, detection.detectedAt);
      }

      return violationProcessed;
    } catch (error) {
      console.error('Failed to process violation detection:', error);
      return false;
    }
  }

  private findApplicableRules(detection: ViolationDetection): SafetyRule[] {
    const applicable: SafetyRule[] = [];
    
    for (const rule of this.safetyRules.values()) {
      if (!rule.isActive) continue;
      
      // Check if rule applies to this violation type
      if (rule.violationType === detection.violationType) {
        // Check worksite match if specified
        if (rule.worksiteId && detection.worksiteId && rule.worksiteId !== detection.worksiteId) {
          continue;
        }
        
        applicable.push(rule);
      }
    }
    
    return applicable;
  }

  private async processViolation(
    detection: ViolationDetection, 
    rule: SafetyRule
  ): Promise<boolean> {
    try {
      // Load worksite settings if available
      let worksiteSettings = null;
      if (detection.worksiteId) {
        worksiteSettings = await getWorksiteSettings(detection.worksiteId);
        
        // Check violation rate limit
        const withinRateLimit = await checkViolationRateLimit(
          detection.worksiteId,
          worksiteSettings.safety.maxViolationsPerHour
        );

        if (!withinRateLimit) {
          console.log(`Violation rate limit exceeded for worksite ${detection.worksiteId}. Skipping violation.`);
          
          // Auto-escalate if enabled
          if (worksiteSettings.safety.autoEscalate) {
            await prisma.alert.create({
              data: {
                title: 'Violation Rate Limit Exceeded',
                description: `Maximum violations per hour (${worksiteSettings.safety.maxViolationsPerHour}) exceeded.`,
                severity: 'HIGH',
                source: 'SYSTEM',
                location: detection.location,
                worksiteId: detection.worksiteId,
                metadata: {
                  type: 'rate_limit_exceeded',
                  autoEscalated: true
                }
              }
            });
          }
          return false;
        }
      }

      // Create safety violation record
      const violation = await prisma.safetyViolation.create({
        data: {
          violationType: detection.violationType,
          severity: detection.severity,
          location: detection.location,
          description: detection.description,
          worksiteId: detection.worksiteId,
          cameraId: detection.cameraId,
          detectedAt: detection.detectedAt,
          metadata: detection.metadata
        }
      });

      // Send SMS notifications if enabled in both rule and worksite settings
      const smsEnabled = rule.smsEnabled && 
        smsService.isEnabled() &&
        (!worksiteSettings || worksiteSettings.notifications.smsEnabled);
      
      if (smsEnabled) {
        // Check notification frequency
        const shouldSend = worksiteSettings && detection.worksiteId
          ? await shouldSendNotification(worksiteSettings, detection.worksiteId)
          : true;
        
        if (shouldSend) {
          await this.sendViolationSMS(detection, rule);
        }
      }

      // Broadcast real-time notification
      await broadcastNotification('safety-violation', {
        type: 'safety_violation',
        data: {
          id: violation.id,
          violationType: detection.violationType,
          severity: detection.severity,
          location: detection.location,
          description: detection.description,
          detectedAt: detection.detectedAt.toISOString(),
          confidence: detection.confidence
        }
      });

      // Log the violation
      console.log(`Safety violation processed: ${detection.violationType} at ${detection.location}`);

      return true;
    } catch (error) {
      console.error('Failed to process violation:', error);
      return false;
    }
  }

  private async sendViolationSMS(detection: ViolationDetection, rule: SafetyRule) {
    try {
      // Get manager contacts
      const managerContacts = await smsService.getManagerContacts(detection.worksiteId);
      
      // Get emergency contacts
      const emergencyContacts = await smsService.getEmergencyContacts();
      
      // Combine all contacts
      const allContacts = [
        ...managerContacts,
        ...emergencyContacts,
        ...rule.smsRecipients
      ].filter((contact, index, array) => array.indexOf(contact) === index); // Remove duplicates

      if (allContacts.length === 0) {
        console.warn('No contacts found for SMS notification');
        return;
      }

      // Send SMS notification
      const smsResult = await smsService.sendSafetyViolationAlert({
        violationType: detection.violationType,
        severity: detection.severity,
        location: detection.location,
        timestamp: detection.detectedAt,
        description: detection.description,
        cameraId: detection.cameraId,
        worksiteId: detection.worksiteId,
        managerContacts: allContacts
      });

      if (smsResult) {
        // Update violation record with SMS status
        await prisma.safetyViolation.update({
          where: { id: (await prisma.safetyViolation.findFirst({
            where: {
              violationType: detection.violationType,
              location: detection.location,
              detectedAt: detection.detectedAt
            },
            orderBy: { createdAt: 'desc' }
          }))?.id || '' },
          data: {
            smsSent: true,
            smsSentAt: new Date()
          }
        });

        console.log(`SMS notification sent for violation: ${detection.violationType}`);
      }
    } catch (error) {
      console.error('Failed to send violation SMS:', error);
    }
  }

  public async addCustomSafetyRule(ruleData: Omit<SafetyRule, 'id'>): Promise<string> {
    try {
      const rule = await prisma.safetyRule.create({
        data: {
          name: ruleData.name,
          violationType: ruleData.violationType,
          severity: ruleData.severity,
          confidenceThreshold: ruleData.confidenceThreshold,
          smsEnabled: ruleData.smsEnabled,
          smsRecipients: ruleData.smsRecipients,
          isActive: ruleData.isActive,
          worksiteId: ruleData.worksiteId
        }
      });

      // Add to in-memory rules
      this.addSafetyRule({
        id: rule.id,
        ...ruleData
      });

      return rule.id;
    } catch (error) {
      console.error('Failed to add custom safety rule:', error);
      throw error;
    }
  }

  public getSafetyRules(): Map<string, SafetyRule> {
    return this.safetyRules;
  }

  public getViolationHistory(): Map<string, Date> {
    return this.violationHistory;
  }

  public async getViolationStats(worksiteId?: string) {
    const where = worksiteId ? { worksiteId } : {};
    
    const [
      totalViolations,
      criticalViolations,
      highViolations,
      mediumViolations,
      lowViolations,
      smsSent,
      resolved
    ] = await Promise.all([
      prisma.safetyViolation.count({ where }),
      prisma.safetyViolation.count({ where: { ...where, severity: 'critical' } }),
      prisma.safetyViolation.count({ where: { ...where, severity: 'high' } }),
      prisma.safetyViolation.count({ where: { ...where, severity: 'medium' } }),
      prisma.safetyViolation.count({ where: { ...where, severity: 'low' } }),
      prisma.safetyViolation.count({ where: { ...where, smsSent: true } }),
      prisma.safetyViolation.count({ where: { ...where, resolved: true } })
    ]);

    return {
      totalViolations,
      criticalViolations,
      highViolations,
      mediumViolations,
      lowViolations,
      smsSent,
      resolved,
      unresolved: totalViolations - resolved
    };
  }
}

// Global safety violation detector instance
export const safetyViolationDetector = SafetyViolationDetector.getInstance();

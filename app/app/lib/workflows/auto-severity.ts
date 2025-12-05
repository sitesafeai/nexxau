/**
 * Auto-Tag By Severity - Automatic alert classification
 * 
 * Classifies alerts into Minor, Moderate, Severe based on detection type,
 * confidence, context, and location
 */

import { prisma } from '../prisma';

export type SeverityLevel = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';

export interface ClassificationResult {
  severity: SeverityLevel;
  reason: string;
  autoEscalate: boolean;
  requiresAcknowledgment: boolean;
  generateReport: boolean;
}

export class AutoSeverityClassifier {
  /**
   * Classify an alert using deterministic rules (not scoring)
   */
  async classify(alert: any): Promise<ClassificationResult> {
    console.log(`[Auto-Severity] Classifying alert: ${alert.id}`);

    const violationType = (alert.violationType || alert.title || '').toLowerCase();
    const isCriticalZone = this.isHighRiskZone(alert.location);
    const isRepeated = await this.isRepeatedViolation(alert);
    const isAfterHours = await this.isAfterHours(alert.worksiteId, alert.createdAt);

    let severity: SeverityLevel;
    let reasons: string[] = [];

    // DETERMINISTIC RULES (not scoring)

    // Rule 1: Hard hat missing + active zone = SEVERE (always)
    if (violationType.includes('hard hat') || violationType.includes('hardhat') || violationType.includes('helmet')) {
      if (isCriticalZone) {
        severity = 'SEVERE';
        reasons.push('Hard hat missing in critical zone = SEVERE');
      } else {
        severity = 'MODERATE';
        reasons.push('Hard hat missing = MODERATE');
      }
    }
    // Rule 2: Any violation in critical zone = SEVERE
    else if (isCriticalZone) {
      severity = 'SEVERE';
      reasons.push('Violation in critical zone = SEVERE');
    }
    // Rule 3: Safety vest missing = MODERATE (unless in critical zone)
    else if (violationType.includes('safety vest') || violationType.includes('high visibility')) {
      severity = 'MODERATE';
      reasons.push('Safety vest missing = MODERATE');
    }
    // Rule 4: Restricted zone = SEVERE
    else if (violationType.includes('restricted') || violationType.includes('unauthorized')) {
      severity = 'SEVERE';
      reasons.push('Restricted zone violation = SEVERE');
    }
    // Rule 5: Fall/height hazard = CRITICAL
    else if (violationType.includes('fall') || violationType.includes('height') || violationType.includes('edge')) {
      severity = 'CRITICAL';
      reasons.push('Fall/height hazard = CRITICAL');
    }
    // Rule 6: Equipment violation = MODERATE
    else if (violationType.includes('equipment') || violationType.includes('machinery')) {
      severity = 'MODERATE';
      reasons.push('Equipment violation = MODERATE');
    }
    // Rule 7: Generic person detection = MINOR
    else {
      severity = 'MINOR';
      reasons.push('Generic detection = MINOR');
    }

    // Rule 8: Repeated violation escalates by one level
    if (isRepeated) {
      if (severity === 'MINOR') {
        severity = 'MODERATE';
        reasons.push('Repeated violation: MINOR → MODERATE');
      } else if (severity === 'MODERATE') {
        severity = 'SEVERE';
        reasons.push('Repeated violation: MODERATE → SEVERE');
      } else if (severity === 'SEVERE') {
        severity = 'CRITICAL';
        reasons.push('Repeated violation: SEVERE → CRITICAL');
      }
    }

    // Rule 9: After-hours overrides (except PPE)
    if (isAfterHours && !violationType.includes('hard hat') && !violationType.includes('safety vest')) {
      if (severity === 'MINOR' || severity === 'MODERATE') {
        severity = 'SEVERE';
        reasons.push('After-hours: Escalated to SEVERE');
      }
    }

    // Determine actions based on severity
    const autoEscalate = severity === 'SEVERE' || severity === 'CRITICAL';
    const requiresAcknowledgment = severity === 'MODERATE' || severity === 'SEVERE' || severity === 'CRITICAL';
    const generateReport = severity === 'SEVERE' || severity === 'CRITICAL';

    console.log(`[Auto-Severity] Alert ${alert.id} classified as ${severity}`);
    console.log(`[Auto-Severity] Rules applied:`, reasons);

    return {
      severity,
      reason: reasons.join('; '),
      autoEscalate,
      requiresAcknowledgment,
      generateReport
    };
  }

  /**
   * Check if after-hours mode (for severity overrides)
   */
  private async isAfterHours(worksiteId: string, timestamp: Date): Promise<boolean> {
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: { metadata: true }
    });

    const hour = timestamp.getHours();
    // Default: after-hours = 6 PM - 6 AM
    const afterHoursStart = 18; // 6 PM
    const afterHoursEnd = 6;     // 6 AM

    if (worksite?.metadata && (worksite.metadata as any).operatingHours) {
      const hours = (worksite.metadata as any).operatingHours;
      // Use worksite-specific hours if configured
      return hour < hours.start || hour >= hours.end;
    }

    return hour >= afterHoursStart || hour < afterHoursEnd;
  }

  /**
   * Check if location is high-risk zone
   */
  private isHighRiskZone(location: string | null): boolean {
    if (!location) return false;

    const loc = location.toLowerCase();
    const highRiskKeywords = [
      'restricted', 'danger', 'edge', 'height', 'scaffold',
      'confined', 'hazard', 'excavation', 'trench', 'roof'
    ];

    return highRiskKeywords.some(keyword => loc.includes(keyword));
  }

  /**
   * Check if this is a repeated violation
   */
  private async isRepeatedViolation(alert: any): Promise<boolean> {
    if (!alert.cameraId || !alert.location) return false;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const similar = await prisma.alert.findFirst({
      where: {
        worksiteId: alert.worksiteId,
        cameraId: alert.cameraId,
        location: alert.location,
        createdAt: {
          gte: oneDayAgo
        },
        id: {
          not: alert.id
        }
      }
    });

    return !!similar;
  }

  /**
   * Apply classification to alert
   */
  async applyClassification(alertId: string): Promise<void> {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) {
      throw new Error(`Alert ${alertId} not found`);
    }

    const classification = await this.classify(alert);

    // Update alert with classification
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        severity: classification.severity as any,
        metadata: {
          ...(alert.metadata as any),
          autoClassification: {
            score: classification.reason,
            timestamp: new Date().toISOString(),
            requiresAcknowledgment: classification.requiresAcknowledgment
          }
        } as any
      }
    });

    console.log(`[Auto-Severity] Updated alert ${alertId} to ${classification.severity}`);
  }
}

export const autoSeverityClassifier = new AutoSeverityClassifier();


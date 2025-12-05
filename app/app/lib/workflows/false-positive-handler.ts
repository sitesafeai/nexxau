/**
 * False-Positive / Uncertainty Handler
 * 
 * Handles low-confidence detections and false positives
 * Prevents noise from reaching supervisors
 */

import { prisma } from '../prisma';

export const CONFIDENCE_THRESHOLDS = {
  LOW_CONFIDENCE: 0.65,        // Below 65% = low confidence
  MINIMUM_ALERT: 0.70,         // Below 70% = don't alert anyone
  HIGH_CONFIDENCE: 0.90,       // Above 90% = high confidence
};

export class FalsePositiveHandler {
  /**
   * Check if alert should be flagged as low confidence
   */
  async checkConfidence(alert: any): Promise<{ 
    isLowConfidence: boolean; 
    shouldSuppress: boolean;
    shouldMarkForReview: boolean;
  }> {
    const confidence = alert.detectionData?.confidence || alert.metadata?.confidence || null;
    const violationType = (alert.violationType || alert.title || '').toLowerCase();

    // Check if PPE-related and low confidence
    const isPPE = violationType.includes('hard hat') || 
                  violationType.includes('helmet') ||
                  violationType.includes('safety vest') ||
                  violationType.includes('ppe');

    if (!confidence) {
      // No confidence data = assume moderate, allow through
      return {
        isLowConfidence: false,
        shouldSuppress: false,
        shouldMarkForReview: false
      };
    }

    const isLowConfidence = confidence < CONFIDENCE_THRESHOLDS.LOW_CONFIDENCE;
    const shouldSuppress = confidence < CONFIDENCE_THRESHOLDS.MINIMUM_ALERT && isPPE;
    const shouldMarkForReview = isLowConfidence && isPPE;

    if (shouldSuppress) {
      console.log(`[False-Positive] Suppressing alert ${alert.id}: Low confidence (${confidence}) PPE detection`);
    }

    if (shouldMarkForReview) {
      console.log(`[False-Positive] Marking alert ${alert.id} for human review: Low confidence (${confidence})`);
    }

    return {
      isLowConfidence,
      shouldSuppress,
      shouldMarkForReview
    };
  }

  /**
   * Mark alert for human review queue
   */
  async markForReview(alertId: string, reason: string): Promise<void> {
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'ACTIVE', // Keep active but mark for review
        metadata: {
          reviewQueue: true,
          reviewReason: reason,
          reviewTimestamp: new Date().toISOString()
        } as any
      }
    });

    console.log(`[False-Positive] Alert ${alertId} marked for review: ${reason}`);
  }

  /**
   * Handle false positive feedback
   */
  async handleFalsePositive(alertId: string, userId: string, feedback: {
    isFalsePositive: boolean;
    reason?: string;
    zone?: string;
    violationType?: string;
  }): Promise<void> {
    const alert = await prisma.alert.findUnique({
      where: { id: alertId }
    });

    if (!alert) return;

    // Update alert
    await prisma.alert.update({
      where: { id: alertId },
      data: {
        status: 'RESOLVED',
        resolutionType: 'FALSE_POSITIVE',
        resolutionNotes: feedback.reason || 'Marked as false positive by supervisor',
        resolvedBy: userId,
        resolvedAt: new Date(),
        metadata: {
          ...(alert.metadata as any),
          falsePositive: true,
          falsePositiveReason: feedback.reason,
          falsePositiveBy: userId,
          falsePositiveAt: new Date().toISOString()
        } as any
      }
    });

    // Log for model improvement
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'MARK_FALSE_POSITIVE',
        entityType: 'Alert',
        entityId: alertId,
        worksiteId: alert.worksiteId,
        changes: {
          falsePositive: true,
          reason: feedback.reason,
          zone: feedback.zone || alert.location,
          violationType: feedback.violationType || alert.violationType
        } as any,
        metadata: {
          confidence: alert.detectionData?.confidence,
          cameraId: alert.cameraId
        } as any
      }
    });

    console.log(`[False-Positive] Alert ${alertId} marked as false positive by ${userId}`);
  }

  /**
   * Get false positive rate for zone/violation type
   */
  async getFalsePositiveRate(worksiteId: string, zone?: string, violationType?: string): Promise<number> {
    const where: any = {
      worksiteId,
      resolutionType: 'FALSE_POSITIVE'
    };

    if (zone) where.location = zone;
    if (violationType) where.violationType = violationType;

    const falsePositives = await prisma.alert.count({ where });

    const totalWhere: any = { worksiteId };
    if (zone) totalWhere.location = zone;
    if (violationType) totalWhere.violationType = violationType;

    const total = await prisma.alert.count({ where: totalWhere });

    if (total === 0) return 0;

    return (falsePositives / total) * 100;
  }
}

export const falsePositiveHandler = new FalsePositiveHandler();


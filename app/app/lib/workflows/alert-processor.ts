/**
 * Alert Processor - Main entry point for alert automation
 * 
 * Orchestrates:
 * - Auto-severity classification
 * - Storm mode detection
 * - Escalation ladder
 * - Auto-report generation
 * - Pattern detection
 */

import { workflowEngine } from './workflow-engine';
import { autoSeverityClassifier } from './auto-severity';
import { stormModeDetector } from './storm-mode';
import { escalationProcessor } from './escalation-processor';
import { patternDetector } from './pattern-detection';
import { cooldownManager } from './cooldown-manager';
import { falsePositiveHandler } from './false-positive-handler';
import { multiCameraCorrelator } from './multi-camera-correlation';
import { shiftGracePeriodHandler } from './shift-grace-period';
import { prisma } from '../prisma';

export class AlertProcessor {
  /**
   * Process a new alert through all automation systems
   */
  async processNewAlert(alertId: string): Promise<void> {
    try {
      console.log(`[Alert Processor] Processing new alert: ${alertId}`);

      // Fetch alert
      const alert = await prisma.alert.findUnique({
        where: { id: alertId },
        include: {
          worksite: {
            select: {
              id: true,
              name: true
            }
          },
          camera: {
            select: {
              id: true,
              name: true,
              location: true
            }
          }
        }
      });

      if (!alert) {
        console.error('[Alert Processor] Alert not found:', alertId);
        return;
      }

      // Step 0: Check false-positive / low confidence
      const confidenceCheck = await falsePositiveHandler.checkConfidence(alert);
      if (confidenceCheck.shouldSuppress) {
        console.log(`[Alert Processor] Suppressing low-confidence alert: ${alert.id}`);
        await falsePositiveHandler.markForReview(alertId, `Low confidence (${alert.detectionData?.confidence || 'unknown'})`);
        return; // Don't process further
      }

      // Step 0.5: Check cooldown
      const cooldownCheck = await cooldownManager.shouldSuppress(alert);
      if (cooldownCheck.suppress) {
        console.log(`[Alert Processor] Suppressing due to cooldown: ${cooldownCheck.reason}`);
        await prisma.alert.update({
          where: { id: alertId },
          data: {
            status: 'ACTIVE',
            metadata: {
              ...(alert.metadata as any),
              suppressed: true,
              suppressionReason: cooldownCheck.reason
            } as any
          }
        });
        return; // Don't process further
      }

      // Step 0.6: Multi-camera correlation
      const correlated = await multiCameraCorrelator.findCorrelatedAlerts(alert);
      if (correlated.length > 0) {
        await multiCameraCorrelator.stitchEvent(alert, correlated);
        console.log(`[Alert Processor] Stitched ${correlated.length + 1} alerts into event group`);
        // Continue processing primary alert
      }

      // Step 0.7: Apply shift grace period (downgrade PPE alerts)
      const gracePeriod = await shiftGracePeriodHandler.applyGracePeriod(alert);
      if (gracePeriod.downgraded) {
        console.log(`[Alert Processor] Grace period applied: ${gracePeriod.originalSeverity} → MINOR`);
        // Alert already updated, fetch fresh
        alert = await prisma.alert.findUnique({ where: { id: alertId } });
      }

      // Step 1: Auto-classify severity (deterministic rules)
      const classification = await autoSeverityClassifier.classify(alert);
      
      // Update alert with classification
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          severity: classification.severity as any,
          metadata: {
            ...(alert.metadata as any),
            autoClassification: {
              severity: classification.severity,
              reason: classification.reason,
              timestamp: new Date().toISOString(),
              requiresRootCause: classification.severity === 'MODERATE' || classification.severity === 'SEVERE'
            }
          } as any
        }
      });

      console.log(`[Alert Processor] Classified as ${classification.severity}`);

      // Step 2: Check storm mode
      const inStormMode = await stormModeDetector.isStormMode(alert.worksiteId);
      const shouldBatch = await stormModeDetector.shouldBatch(alert.worksiteId, alert);

      if (shouldBatch) {
        console.log('[Alert Processor] Storm mode active - adding to batch');
        await stormModeDetector.addToBatch(alert.worksiteId, alertId, alert);
        return; // Don't send individual notifications in storm mode
      }

      // Step 3: Generate incident report for severe events
      if (classification.generateReport) {
        console.log('[Alert Processor] Generating incident report');
        await this.generateIncidentReport(alert);
      }

      // Step 4: Start escalation if needed
      if (classification.autoEscalate || classification.severity === 'SEVERE' || classification.severity === 'CRITICAL') {
        console.log('[Alert Processor] Starting escalation chain');
        await this.startEscalation(alert);
      }

      // Step 5: Execute workflows
      await workflowEngine.processAlert(alert);

      // Step 6: Update metrics
      await this.updateMetrics(alert);

      console.log(`[Alert Processor] Completed processing alert: ${alertId}`);

    } catch (error) {
      console.error('[Alert Processor] Error processing alert:', error);
    }
  }

  /**
   * Generate incident report for severe alert
   */
  private async generateIncidentReport(alert: any): Promise<void> {
    // Check if report already exists
    const existing = await prisma.incidentReport.findUnique({
      where: { alertId: alert.id }
    });

    if (existing) {
      console.log('[Alert Processor] Incident report already exists');
      return;
    }

    // Generate report number
    const count = await prisma.incidentReport.count();
    const reportNumber = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // FIELD VERSION (short, actionable)
    const fieldSummary = `${alert.violationType || 'Violation'} at ${alert.location || 'Unknown'}\n\nWhat happened: ${alert.description}\nWhat needs to happen: Immediate supervisor review required`;

    // COMPLIANCE VERSION (detailed, for insurance/OSHA)
    const complianceDetails = {
      camera: {
        id: alert.cameraId,
        name: alert.camera?.name,
        location: alert.camera?.location
      },
      location: alert.location,
      timestamp: alert.createdAt,
      detectionData: alert.detectionData,
      metadata: alert.metadata,
      violationType: alert.violationType,
      severity: alert.severity,
      confidence: alert.detectionData?.confidence,
      fullContext: alert.description
    };

    // Create report (stores both versions)
    await prisma.incidentReport.create({
      data: {
        worksiteId: alert.worksiteId,
        alertId: alert.id,
        reportNumber,
        severity: alert.severity,
        title: alert.title || `${alert.severity} Safety Incident`,
        summary: fieldSummary, // Short field version
        details: complianceDetails as any, // Full compliance version
        snapshots: alert.detectionSnapshot 
          ? [{ url: alert.detectionSnapshot, timestamp: alert.createdAt, cameraId: alert.cameraId }] 
          : [] as any,
        videoClips: alert.detectionVideo 
          ? [{ url: alert.detectionVideo, duration: null, cameraId: alert.cameraId }] 
          : null as any,
        createdAt: new Date()
      }
    });

    console.log(`[Alert Processor] Created incident report: ${reportNumber} (field + compliance versions)`);

    // Queue notification to safety manager (field version)
    await prisma.notificationLog.create({
      data: {
        worksiteId: alert.worksiteId,
        alertId: alert.id,
        channel: 'email',
        recipient: 'safety-manager@worksite.com', // TODO: Get from worksite config
        subject: `Incident Report: ${reportNumber}`,
        body: fieldSummary, // Short version for quick action
        status: 'pending'
      }
    });
  }

  /**
   * Start escalation chain for alert
   */
  private async startEscalation(alert: any): Promise<void> {
    // Find escalation chain for this worksite
    const chain = await prisma.escalationChain.findFirst({
      where: {
        worksiteId: alert.worksiteId,
        enabled: true,
        severity: {
          has: alert.severity
        }
      }
    });

    if (!chain) {
      console.log('[Alert Processor] No escalation chain configured');
      return;
    }

    // Check if escalation already exists
    const existing = await prisma.escalation.findFirst({
      where: {
        alertId: alert.id,
        status: {
          in: ['pending', 'in_progress']
        }
      }
    });

    if (existing) {
      console.log('[Alert Processor] Escalation already in progress');
      return;
    }

    // Create escalation
    await prisma.escalation.create({
      data: {
        alertId: alert.id,
        chainId: chain.id,
        currentLevel: 1,
        status: 'pending',
        notifications: [] as any,
        createdAt: new Date()
      }
    });

    console.log('[Alert Processor] Escalation started for alert:', alert.id);
  }

  /**
   * Update worksite metrics
   */
  private async updateMetrics(alert: any): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find or create today's metrics
    const metrics = await prisma.worksiteMetrics.upsert({
      where: {
        worksiteId_date: {
          worksiteId: alert.worksiteId,
          date: today
        }
      },
      create: {
        worksiteId: alert.worksiteId,
        date: today,
        totalAlerts: 1,
        alertsByType: { [alert.violationType || 'unknown']: 1 } as any,
        alertsBySeverity: { [alert.severity]: 1 } as any,
        alertsByHour: { [new Date(alert.createdAt).getHours()]: 1 } as any,
        camerasOnline: 0,
        camerasOffline: 0
      },
      update: {
        totalAlerts: {
          increment: 1
        },
        alertsByType: {}, // TODO: Proper JSON update
        alertsBySeverity: {}, // TODO: Proper JSON update
        alertsByHour: {} // TODO: Proper JSON update
      }
    });

    console.log('[Alert Processor] Updated metrics for', today.toDateString());
  }
}

export const alertProcessor = new AlertProcessor();


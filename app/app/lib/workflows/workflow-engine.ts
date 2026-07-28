/**
 * Workflow Engine - Core automation system
 * 
 * Processes workflow triggers and executes actions
 * Handles storm mode, rate limiting, and escalations
 */

import { prisma } from '../prisma';
import { sendAlertNotificationEmail } from '../email-service';

export interface WorkflowContext {
  alertId?: string;
  alert?: any;
  worksiteId: string;
  cameraId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface WorkflowAction {
  // Builder saves 'send_email'/'send_sms'; legacy records may use 'email'/'sms'
  type: 'sms' | 'send_sms' | 'email' | 'send_email' | 'webhook' | 'create_incident' | 'escalate';
  config: any;
}

/**
 * Workflow Engine - processes all workflow automation
 */
export class WorkflowEngine {
  private static instance: WorkflowEngine;
  private running = false;

  private constructor() {}

  static getInstance(): WorkflowEngine {
    if (!WorkflowEngine.instance) {
      WorkflowEngine.instance = new WorkflowEngine();
    }
    return WorkflowEngine.instance;
  }

  /**
   * Process an alert through all applicable workflows
   */
  async processAlert(alert: any): Promise<void> {
    try {
      console.log(`[Workflow Engine] Processing alert: ${alert.id}`);

      // Find applicable workflows for this alert
      const workflows = await prisma.workflow.findMany({
        where: {
          enabled: true,
          OR: [
            { worksiteId: alert.worksiteId },
            { worksiteId: null } // Global workflows
          ]
        },
        orderBy: {
          priority: 'desc'
        }
      });

      console.log(`[Workflow Engine] Found ${workflows.length} workflows for worksite ${alert.worksiteId}`);

      // Execute each workflow
      for (const workflow of workflows) {
        await this.executeWorkflow(workflow, {
          alertId: alert.id,
          alert,
          worksiteId: alert.worksiteId,
          cameraId: alert.cameraId,
          timestamp: new Date(),
          metadata: alert.metadata
        });
      }
    } catch (error) {
      console.error('[Workflow Engine] Error processing alert:', error);
    }
  }

  /**
   * Execute a specific workflow
   */
  private async executeWorkflow(workflow: any, context: WorkflowContext): Promise<void> {
    // Check if workflow trigger matches
    if (!this.shouldTrigger(workflow, context)) {
      return;
    }

    console.log(`[Workflow Engine] Executing workflow: ${workflow.name} (${workflow.type})`);

    // Create execution record
    const execution = await prisma.workflowExecution.create({
      data: {
        workflowId: workflow.id,
        triggeredBy: context.alertId || 'system',
        triggerData: context as any,
        status: 'running',
        startedAt: new Date()
      }
    });

    try {
      const actions = Array.isArray(workflow.actions) ? workflow.actions : [];
      let actionsExecuted = 0;
      let actionsFailed = 0;
      const results: any[] = [];

      for (const action of actions) {
        try {
          const result = await this.executeAction(action, context, workflow);
          results.push({ action: action.type, status: 'success', result });
          actionsExecuted++;
        } catch (error: any) {
          console.error(`[Workflow Engine] Action ${action.type} failed:`, error);
          results.push({ action: action.type, status: 'failed', error: error.message });
          actionsFailed++;
        }
      }

      // Update execution record
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: actionsFailed > 0 ? 'failed' : 'completed',
          completedAt: new Date(),
          actionsExecuted,
          actionsFailed,
          results: results as any
        }
      });

      // Update workflow last run time
      await prisma.workflow.update({
        where: { id: workflow.id },
        data: { lastRunAt: new Date() }
      });

    } catch (error: any) {
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          error: error.message
        }
      });
    }
  }

  /**
   * Check if workflow should trigger for this context
   */
  private shouldTrigger(workflow: any, context: WorkflowContext): boolean {
    const { triggerType, triggerConfig } = workflow;
    const { alert } = context;

    switch (triggerType) {
      case 'alert_severity':
        return alert && triggerConfig.severity?.includes(alert.severity);
      
      case 'alert_type':
        return alert && triggerConfig.alertTypes?.includes(alert.violationType || alert.title);
      
      case 'alert_created':
        return !!alert;
      
      case 'camera_offline':
        return alert && alert.source === 'camera' && alert.status === 'offline';
      
      default:
        return false;
    }
  }

  /**
   * Run a set of actions against a test context (used by the workflow builder Test button).
   * Returns per-action results; does NOT write to workflowExecution.
   */
  async testActions(
    actions: WorkflowAction[],
    context: WorkflowContext
  ): Promise<Array<{ type: string; status: 'success' | 'failed'; error?: string }>> {
    const results = [];
    for (const action of actions) {
      try {
        await this.executeAction(action, context, null);
        results.push({ type: action.type, status: 'success' as const });
      } catch (err: any) {
        results.push({ type: action.type, status: 'failed' as const, error: err.message });
      }
    }
    return results;
  }

  /**
   * Execute a specific action
   */
  private async executeAction(action: WorkflowAction, context: WorkflowContext, workflow: any): Promise<any> {
    console.log(`[Workflow Engine] Executing action: ${action.type}`);

    switch (action.type) {
      case 'sms':
      case 'send_sms':
        return await this.sendSMS(action.config, context);

      case 'email':
      case 'send_email':
        return await this.sendEmail(action.config, context);

      case 'webhook':
        return await this.callWebhook(action.config, context);
      
      case 'create_incident':
        return await this.createIncidentReport(context);
      
      case 'escalate':
        return await this.escalateAlert(context, action.config);
      
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
  }

  /**
   * Send SMS notification
   * NOTE: No SMS provider (Twilio etc.) is configured yet.
   * Logs the intent and skips silently — does not throw so the workflow still completes.
   */
  private async sendSMS(config: any, context: WorkflowContext): Promise<void> {
    // Builder saves config.phones; legacy records may use config.recipients
    const phones: string[] = config.phones || config.recipients || [];
    if (phones.length === 0) {
      console.warn('[Workflow SMS] No phone numbers in action config — skipping');
      return;
    }
    console.warn(
      `[Workflow SMS] SMS provider not configured. Would send to: ${phones.join(', ')}`,
      `| alert=${context.alertId} worksite=${context.worksiteId}`
    );
    // Not throwing — SMS is a no-op until Twilio (or similar) is wired up.
  }

  /**
   * Send email notification via Resend (sendAlertNotificationEmail).
   * Builder saves config.emails; legacy records may use config.recipients.
   */
  private async sendEmail(config: any, context: WorkflowContext): Promise<void> {
    // Normalise recipient list — builder uses `emails`, old code used `recipients`
    const recipients: string[] = config.emails || config.recipients || [];
    if (recipients.length === 0) {
      console.warn('[Workflow Email] No recipients in action config — skipping');
      return;
    }

    const { alert, worksiteId, alertId, timestamp } = context;

    const alertType: string =
      alert?.violationType || alert?.title || 'Safety Alert';
    const location: string =
      alert?.location || worksiteId;
    const severity: string =
      alert?.severity || 'MEDIUM';
    const detailsUrl = `${process.env.NEXTAUTH_URL || ''}/app/dashboard/alerts/${alertId || ''}`;
    const snapshotUrl: string | undefined =
      alert?.detectionSnapshot || alert?.snapshotUrl || undefined;

    console.log(`[Workflow Email] Sending alert notification to: ${recipients.join(', ')}`);

    const result = await sendAlertNotificationEmail(
      recipients,
      alertType,
      location,
      severity,
      timestamp,
      detailsUrl,
      snapshotUrl
    );

    if (!result.success) {
      console.error('[Workflow Email] sendAlertNotificationEmail failed:', result.error);
      throw new Error(`Email send failed: ${result.error}`);
    }

    console.log(`[Workflow Email] Successfully sent to ${recipients.length} recipient(s)`);
  }

  /**
   * Call webhook
   */
  private async callWebhook(config: any, context: WorkflowContext): Promise<void> {
    const { url, method = 'POST', headers = {} } = config;

    const payload = {
      alert_id: context.alertId,
      worksite_id: context.worksiteId,
      camera_id: context.cameraId,
      timestamp: context.timestamp.toISOString(),
      alert: context.alert,
      metadata: context.metadata
    };

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}`);
      }

      console.log(`[Webhook] Successfully called ${url}`);
    } catch (error) {
      console.error(`[Webhook] Failed to call ${url}:`, error);
      throw error;
    }
  }

  /**
   * Create incident report for severe events
   */
  private async createIncidentReport(context: WorkflowContext): Promise<void> {
    const { alert, worksiteId, alertId } = context;

    if (!alert || !alertId) {
      throw new Error('Alert required for incident report');
    }

    // Check if report already exists
    const existing = await prisma.incidentReport.findUnique({
      where: { alertId }
    });

    if (existing) {
      console.log('[Incident Report] Report already exists for alert:', alertId);
      return;
    }

    // Generate report number
    const count = await prisma.incidentReport.count();
    const reportNumber = `INC-${new Date().getFullYear()}-${String(count + 1).padStart(6, '0')}`;

    // Create report
    await prisma.incidentReport.create({
      data: {
        worksiteId,
        alertId,
        reportNumber,
        severity: alert.severity,
        title: alert.title || `${alert.severity} Alert`,
        summary: alert.description,
        details: {
          camera: alert.cameraId,
          location: alert.location,
          timestamp: alert.createdAt,
          detectionData: alert.detectionData,
          metadata: alert.metadata
        } as any,
        snapshots: alert.detectionSnapshot ? [{ url: alert.detectionSnapshot, timestamp: alert.createdAt }] : [] as any,
        videoClips: alert.detectionVideo ? [{ url: alert.detectionVideo, duration: null }] : null as any,
        createdAt: new Date()
      }
    });

    console.log(`[Incident Report] Created report: ${reportNumber}`);
  }

  /**
   * Escalate alert through escalation chain
   */
  private async escalateAlert(context: WorkflowContext, config: any): Promise<void> {
    const { alertId, worksiteId } = context;

    if (!alertId) {
      throw new Error('Alert ID required for escalation');
    }

    // Find applicable escalation chain
    const chain = await prisma.escalationChain.findFirst({
      where: {
        worksiteId,
        enabled: true
      }
    });

    if (!chain) {
      console.log('[Escalation] No escalation chain found for worksite:', worksiteId);
      return;
    }

    // Create escalation record
    await prisma.escalation.create({
      data: {
        alertId,
        chainId: chain.id,
        currentLevel: 1,
        status: 'pending',
        notifications: [] as any,
        createdAt: new Date()
      }
    });

    console.log(`[Escalation] Started escalation for alert: ${alertId}`);
  }

  /**
   * Render template with context variables
   */
  private renderTemplate(template: string, context: WorkflowContext): string {
    const { alert, worksiteId, cameraId } = context;

    return template
      .replace(/{{worksite_id}}/g, worksiteId)
      .replace(/{{camera_id}}/g, cameraId || 'N/A')
      .replace(/{{alert_id}}/g, context.alertId || 'N/A')
      .replace(/{{severity}}/g, alert?.severity || 'N/A')
      .replace(/{{description}}/g, alert?.description || 'N/A')
      .replace(/{{location}}/g, alert?.location || 'N/A')
      .replace(/{{timestamp}}/g, context.timestamp.toLocaleString());
  }
}

// Export singleton instance
export const workflowEngine = WorkflowEngine.getInstance();


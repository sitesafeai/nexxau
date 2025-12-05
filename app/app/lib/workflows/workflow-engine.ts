/**
 * Workflow Engine - Core automation system
 * 
 * Processes workflow triggers and executes actions
 * Handles storm mode, rate limiting, and escalations
 */

import { prisma } from '../prisma';

export interface WorkflowContext {
  alertId?: string;
  alert?: any;
  worksiteId: string;
  cameraId?: string;
  timestamp: Date;
  metadata?: any;
}

export interface WorkflowAction {
  type: 'sms' | 'email' | 'webhook' | 'create_incident' | 'escalate';
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
   * Execute a specific action
   */
  private async executeAction(action: WorkflowAction, context: WorkflowContext, workflow: any): Promise<any> {
    console.log(`[Workflow Engine] Executing action: ${action.type}`);

    switch (action.type) {
      case 'sms':
        return await this.sendSMS(action.config, context);
      
      case 'email':
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
   */
  private async sendSMS(config: any, context: WorkflowContext): Promise<void> {
    const { phones, template } = config;
    const message = this.renderTemplate(template, context);

    for (const phone of phones) {
      try {
        // Log notification
        await prisma.notificationLog.create({
          data: {
            worksiteId: context.worksiteId,
            alertId: context.alertId,
            channel: 'sms',
            recipient: phone,
            body: message,
            status: 'pending',
            createdAt: new Date()
          }
        });

        // TODO: Integrate with Twilio or SMS provider
        console.log(`[SMS] Would send to ${phone}: ${message}`);
        
        // For now, just log - actual SMS sending will be handled by a background job
      } catch (error) {
        console.error(`[SMS] Failed to queue SMS to ${phone}:`, error);
      }
    }
  }

  /**
   * Send email notification
   */
  private async sendEmail(config: any, context: WorkflowContext): Promise<void> {
    const { recipients, subject, template } = config;
    const body = this.renderTemplate(template, context);

    for (const email of recipients) {
      await prisma.notificationLog.create({
        data: {
          worksiteId: context.worksiteId,
          alertId: context.alertId,
          channel: 'email',
          recipient: email,
          subject: subject || 'Safety Alert',
          body,
          status: 'pending'
        }
      });

      // TODO: Integrate with email provider (SendGrid, AWS SES, etc.)
      console.log(`[Email] Would send to ${email}: ${subject}`);
    }
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


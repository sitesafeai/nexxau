/**
 * Default Workflow Templates
 * 
 * Pre-configured workflows that are auto-provisioned for new worksites
 */

import { prisma } from '../prisma';

export const DEFAULT_WORKFLOWS = {
  // 1. High-Severity Immediate Notification
  HIGH_SEVERITY_ALERT: {
    name: 'High Severity Alert Notification',
    description: 'Immediately notify supervisors when high or critical alerts are detected',
    type: 'ALERT_ESCALATION',
    triggerType: 'alert_severity',
    triggerConfig: {
      severity: ['HIGH']
    },
    actions: [
      {
        type: 'sms',
        config: {
          phones: [], // To be configured by user
          template: '🚨 {{severity}} ALERT at {{location}}\n\n{{description}}\n\nAlert ID: {{alert_id}}\nTime: {{timestamp}}'
        }
      },
      {
        type: 'create_incident',
        config: {}
      },
      {
        type: 'escalate',
        config: {}
      }
    ],
    priority: 10,
    enabled: true
  },

  // 2. Camera Offline Alert
  CAMERA_OFFLINE: {
    name: 'Camera Offline Notification',
    description: 'Notify when camera goes offline for more than 5 minutes',
    type: 'CAMERA_HEALTH',
    triggerType: 'camera_offline',
    triggerConfig: {
      delayMinutes: 5
    },
    actions: [
      {
        type: 'sms',
        config: {
          phones: [],
          template: '📹 Camera Offline: {{camera_id}} at {{location}}\n\nPlease check camera connection.'
        }
      }
    ],
    priority: 5,
    enabled: true
  },

  // 3. Daily Summary Report
  DAILY_SUMMARY: {
    name: 'Daily Safety Summary',
    description: 'Send daily summary of alerts and compliance metrics',
    type: 'SCHEDULED_REPORT',
    triggerType: 'scheduled',
    triggerConfig: {
      schedule: '0 18 * * *', // 6:00 PM daily (cron format)
      timezone: 'America/New_York'
    },
    actions: [
      {
        type: 'email',
        config: {
          recipients: [],
          subject: 'Daily Safety Summary - {{worksite_name}}',
          template: 'See attached daily summary report'
        }
      }
    ],
    priority: 1,
    enabled: true
  },

  // 4. Pattern Detection (Spikes & Hotspots)
  PATTERN_DETECTION: {
    name: 'Alert Pattern Detection',
    description: 'Detect spikes and hotspots automatically',
    type: 'PATTERN_DETECTION',
    triggerType: 'scheduled',
    triggerConfig: {
      schedule: '*/30 * * * *', // Every 30 minutes
    },
    actions: [
      {
        type: 'sms',
        config: {
          phones: [],
          template: '⚠️ Pattern Detected: {{description}}'
        }
      }
    ],
    priority: 3,
    enabled: true
  }
};

/**
 * Auto-provision default workflows for a new worksite
 */
export async function provisionDefaultWorkflows(worksiteId: string, supervisorPhone?: string): Promise<void> {
  console.log('[Default Workflows] Provisioning for worksite:', worksiteId);

  const workflows = Object.values(DEFAULT_WORKFLOWS);

  for (const template of workflows) {
    // Update phone numbers if provided
    const actions = template.actions.map(action => {
      if (action.type === 'sms' && supervisorPhone && action.config.phones.length === 0) {
        return {
          ...action,
          config: {
            ...action.config,
            phones: [supervisorPhone]
          }
        };
      }
      return action;
    });

    await prisma.workflow.create({
      data: {
        worksiteId,
        name: template.name,
        description: template.description || '',
        type: template.type as any,
        triggerType: template.triggerType,
        triggerConfig: template.triggerConfig as any,
        actions: actions as any,
        batchingEnabled: template.type === 'ALERT_ESCALATION', // Enable batching for alerts
        batchWindow: 5,
        rateLimitWindow: 120,
        priority: template.priority,
        enabled: template.enabled,
        createdBy: 'system'
      }
    });
  }

  console.log(`[Default Workflows] Provisioned ${workflows.length} workflows for worksite ${worksiteId}`);
}

/**
 * Create default escalation chain for worksite
 */
export async function provisionDefaultEscalationChain(worksiteId: string, contacts?: { phone?: string; email?: string }): Promise<void> {
  console.log('[Default Escalation] Provisioning for worksite:', worksiteId);

  const steps = [
    {
      level: 1,
      delayMinutes: 5,
      contacts: contacts?.phone ? [
        { type: 'sms', value: contacts.phone, role: 'Site Lead' }
      ] : [],
      message: null
    },
    {
      level: 2,
      delayMinutes: 10,
      contacts: contacts?.phone ? [
        { type: 'sms', value: contacts.phone, role: 'Site Supervisor' }
      ] : [],
      message: null
    },
    {
      level: 3,
      delayMinutes: 20,
      contacts: contacts?.email ? [
        { type: 'email', value: contacts.email, role: 'Safety Manager' }
      ] : [],
      message: null
    }
  ];

  await prisma.escalationChain.create({
    data: {
      worksiteId,
      name: 'Default Escalation Chain',
      description: 'Automatic escalation for unacknowledged severe alerts',
      severity: ['HIGH'],
      alertTypes: [],
      steps: steps as any,
      enabled: true
    }
  });

  console.log('[Default Escalation] Created escalation chain for worksite:', worksiteId);
}

/**
 * Initialize workflow system for a new worksite
 */
export async function initializeWorksiteAutomation(
  worksiteId: string,
  config?: {
    supervisorPhone?: string;
    supervisorEmail?: string;
    skipWorkflows?: boolean;
    skipEscalation?: boolean;
  }
): Promise<void> {
  console.log('[Worksite Automation] Initializing for:', worksiteId);

  try {
    if (!config?.skipWorkflows) {
      await provisionDefaultWorkflows(worksiteId, config?.supervisorPhone);
    }

    if (!config?.skipEscalation) {
      await provisionDefaultEscalationChain(worksiteId, {
        phone: config?.supervisorPhone,
        email: config?.supervisorEmail
      });
    }

    console.log('[Worksite Automation] Initialization complete for:', worksiteId);
  } catch (error) {
    console.error('[Worksite Automation] Initialization failed:', error);
    throw error;
  }
}


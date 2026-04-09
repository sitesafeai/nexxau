import { sendResendHtml, getResendFromAddress, isResendConfigured } from './resend-mail';

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface NotificationTemplate {
  subject: string;
  html: string;
  text: string;
}

interface NotificationData {
  to: string | string[];
  type: 'email' | 'sms';
  template: string;
  data: Record<string, any>;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

class NotificationService {
  private smsClient: null = null;
  private smsConfig: SMSConfig | null = null;

  constructor() {
    this.initializeSMS();
  }

  private initializeSMS() {
    // Twilio SMS notifications have been removed in favor of Resend email alerts.
    this.smsConfig = null;
    this.smsClient = null;
  }

  private getTemplate(templateName: string, data: Record<string, any>): NotificationTemplate {
    const templates: Record<string, NotificationTemplate> = {
      'safety-alert': {
        subject: `🚨 Safety Alert: ${data.alertType || 'Incident Detected'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #ef4444; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">🚨 Safety Alert</h1>
            </div>
            <div style="padding: 20px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-top: 0;">${data.alertType || 'Safety Incident'}</h2>
              <p style="color: #374151; line-height: 1.6;">
                <strong>Location:</strong> ${data.location || 'Unknown'}<br>
                <strong>Severity:</strong> <span style="color: ${this.getSeverityColor(data.severity)}; font-weight: bold;">${data.severity || 'Unknown'}</span><br>
                <strong>Time:</strong> ${data.timestamp || new Date().toLocaleString()}<br>
                <strong>Description:</strong> ${data.description || 'No description available'}
              </p>
              ${data.assignedTo ? `<p><strong>Assigned to:</strong> ${data.assignedTo}</p>` : ''}
              <div style="margin-top: 20px; padding: 15px; background-color: #fef3c7; border-left: 4px solid #f59e0b;">
                <p style="margin: 0; color: #92400e;"><strong>Action Required:</strong> Please review and respond to this alert as soon as possible.</p>
              </div>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>This is an automated safety alert from Nexxau Safety Monitoring System.</p>
            </div>
          </div>
        `,
        text: `
🚨 SAFETY ALERT: ${data.alertType || 'Incident Detected'}

Location: ${data.location || 'Unknown'}
Severity: ${data.severity || 'Unknown'}
Time: ${data.timestamp || new Date().toLocaleString()}
Description: ${data.description || 'No description available'}
${data.assignedTo ? `Assigned to: ${data.assignedTo}` : ''}

Action Required: Please review and respond to this alert as soon as possible.

This is an automated safety alert from Nexxau Safety Monitoring System.
        `
      },
      'alert-resolved': {
        subject: `✅ Alert Resolved: ${data.alertType || 'Safety Incident'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #22c55e; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">✅ Alert Resolved</h1>
            </div>
            <div style="padding: 20px; background-color: #f0fdf4;">
              <h2 style="color: #1f2937; margin-top: 0;">${data.alertType || 'Safety Incident'} - Resolved</h2>
              <p style="color: #374151; line-height: 1.6;">
                <strong>Location:</strong> ${data.location || 'Unknown'}<br>
                <strong>Resolved by:</strong> ${data.resolvedBy || 'System'}<br>
                <strong>Resolution time:</strong> ${data.resolutionTime || 'Unknown'}<br>
                <strong>Notes:</strong> ${data.notes || 'No additional notes'}
              </p>
            </div>
            <div style="background-color: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280;">
              <p>This is an automated notification from Nexxau Safety Monitoring System.</p>
            </div>
          </div>
        `,
        text: `
✅ ALERT RESOLVED: ${data.alertType || 'Safety Incident'}

Location: ${data.location || 'Unknown'}
Resolved by: ${data.resolvedBy || 'System'}
Resolution time: ${data.resolutionTime || 'Unknown'}
Notes: ${data.notes || 'No additional notes'}

This is an automated notification from Nexxau Safety Monitoring System.
        `
      },
      'system-status': {
        subject: `📊 System Status Update: ${data.status || 'System Update'}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #3b82f6; color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">📊 System Status</h1>
            </div>
            <div style="padding: 20px;">
              <h2 style="color: #1f2937; margin-top: 0;">${data.title || 'System Status Update'}</h2>
              <p style="color: #374151; line-height: 1.6;">${data.message || 'No additional information available.'}</p>
              ${data.metrics ? `
                <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 15px;">
                  <h3 style="margin-top: 0; color: #1f2937;">System Metrics</h3>
                  <ul style="color: #374151;">
                    ${Object.entries(data.metrics).map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`).join('')}
                  </ul>
                </div>
              ` : ''}
            </div>
          </div>
        `,
        text: `
📊 SYSTEM STATUS: ${data.status || 'System Update'}

${data.title || 'System Status Update'}
${data.message || 'No additional information available.'}

${data.metrics ? `System Metrics:\n${Object.entries(data.metrics).map(([key, value]) => `${key}: ${value}`).join('\n')}` : ''}
        `
      }
    };

    return templates[templateName] || {
      subject: 'Notification from Nexxau Safety System',
      html: `<p>${data.message || 'You have received a notification from the Nexxau Safety System.'}</p>`,
      text: data.message || 'You have received a notification from the Nexxau Safety System.'
    };
  }

  private getSeverityColor(severity: string): string {
    switch (severity?.toLowerCase()) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#16a34a';
      default: return '#6b7280';
    }
  }

  public async sendEmail(notification: NotificationData): Promise<boolean> {
    if (!isResendConfigured()) {
      console.warn('Email service not configured (RESEND_API_KEY)');
      return false;
    }

    try {
      const template = this.getTemplate(notification.template, notification.data);
      const recipients = Array.isArray(notification.to) ? notification.to : [notification.to];

      for (const recipient of recipients) {
        const result = await sendResendHtml({
          from: getResendFromAddress(),
          to: recipient,
          subject: template.subject,
          text: template.text,
          html: template.html,
        });
        if (!result.success) {
          console.error('Failed to send email notification:', result.error);
          return false;
        }
      }

      console.log(`Email notification sent to ${recipients.length} recipient(s)`);
      return true;
    } catch (error) {
      console.error('Failed to send email notification:', error);
      return false;
    }
  }

  public async sendSMS(notification: NotificationData): Promise<boolean> {
    if (!this.smsClient || !this.smsConfig) {
      console.warn('SMS service not configured');
      return false;
    }

    try {
      const template = this.getTemplate(notification.template, notification.data);
      const recipients = Array.isArray(notification.to) ? notification.to : [notification.to];

      for (const recipient of recipients) {
        await this.smsClient.messages.create({
          body: template.text,
          from: this.smsConfig.fromNumber,
          to: recipient
        });
      }

      console.log(`SMS notification sent to ${recipients.length} recipient(s)`);
      return true;
    } catch (error) {
      console.error('Failed to send SMS notification:', error);
      return false;
    }
  }

  public async sendNotification(notification: NotificationData): Promise<boolean> {
    switch (notification.type) {
      case 'email':
        return await this.sendEmail(notification);
      case 'sms':
        return await this.sendSMS(notification);
      default:
        console.error('Invalid notification type:', notification.type);
        return false;
    }
  }

  public async sendBulkNotification(notifications: NotificationData[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const notification of notifications) {
      const result = await this.sendNotification(notification);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  public isEmailConfigured(): boolean {
    return isResendConfigured();
  }

  public isSMSConfigured(): boolean {
    return this.smsClient !== null && this.smsConfig !== null;
  }

  public getConfigurationStatus(): {
    email: boolean;
    sms: boolean;
  } {
    return {
      email: this.isEmailConfigured(),
      sms: this.isSMSConfigured()
    };
  }
}

// Singleton instance
const notificationService = new NotificationService();

export default notificationService;
export { NotificationService };
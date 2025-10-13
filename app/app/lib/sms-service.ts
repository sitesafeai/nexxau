import twilio from 'twilio';
import { prisma } from './prisma';
import { broadcastNotification } from './websocket';

export interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  isEnabled: boolean;
}

export interface SafetyViolationSMS {
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  timestamp: Date;
  description: string;
  cameraId?: string;
  worksiteId?: string;
  managerContacts: string[];
  additionalContacts?: string[];
}

export interface SMSDeliveryStatus {
  messageId: string;
  status: 'sent' | 'delivered' | 'failed' | 'undelivered';
  errorCode?: string;
  errorMessage?: string;
  deliveredAt?: Date;
  retryCount: number;
  maxRetries: number;
}

export class SafetySMSService {
  private static instance: SafetySMSService;
  private smsClient: twilio.Twilio | null = null;
  private config: SMSConfig | null = null;
  private deliveryStatus: Map<string, SMSDeliveryStatus> = new Map();

  constructor() {
    this.initializeSMS();
  }

  public static getInstance(): SafetySMSService {
    if (!SafetySMSService.instance) {
      SafetySMSService.instance = new SafetySMSService();
    }
    return SafetySMSService.instance;
  }

  private initializeSMS() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (accountSid && authToken && fromNumber) {
      this.config = {
        accountSid,
        authToken,
        fromNumber,
        isEnabled: true
      };
      this.smsClient = twilio(accountSid, authToken);
      console.log('SMS service initialized successfully');
    } else {
      console.warn('SMS service not configured - missing Twilio credentials');
      this.config = {
        accountSid: '',
        authToken: '',
        fromNumber: '',
        isEnabled: false
      };
    }
  }

  public async sendSafetyViolationAlert(violation: SafetyViolationSMS): Promise<boolean> {
    if (!this.smsClient || !this.config?.isEnabled) {
      console.warn('SMS service not available');
      return false;
    }

    try {
      const message = this.formatSafetyViolationMessage(violation);
      const results: boolean[] = [];

      // Send to all manager contacts
      for (const phoneNumber of violation.managerContacts) {
        const result = await this.sendSMS(phoneNumber, message, violation);
        results.push(result);
      }

      // Send to additional contacts if specified
      if (violation.additionalContacts) {
        for (const phoneNumber of violation.additionalContacts) {
          const result = await this.sendSMS(phoneNumber, message, violation);
          results.push(result);
        }
      }

      // Log the violation notification
      await this.logViolationAlert(violation, results.some(r => r));

      // Broadcast to WebSocket clients
      await broadcastNotification('safety-violation', {
        type: 'safety_violation',
        data: {
          violationType: violation.violationType,
          severity: violation.severity,
          location: violation.location,
          timestamp: violation.timestamp.toISOString(),
          smsSent: results.some(r => r)
        }
      });

      return results.some(r => r);
    } catch (error) {
      console.error('Failed to send safety violation SMS:', error);
      return false;
    }
  }

  private formatSafetyViolationMessage(violation: SafetyViolationSMS): string {
    const severityEmoji = this.getSeverityEmoji(violation.severity);
    const timeStr = violation.timestamp.toLocaleString();
    
    return `🚨 SAFETY VIOLATION ALERT ${severityEmoji}

Type: ${violation.violationType}
Severity: ${violation.severity.toUpperCase()}
Location: ${violation.location}
Time: ${timeStr}

Description: ${violation.description}

${violation.cameraId ? `Camera ID: ${violation.cameraId}` : ''}

This is an automated safety alert from Nexxau Safety Monitoring System.

Reply STOP to unsubscribe from safety alerts.`;
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚠️';
    }
  }

  private async sendSMS(
    phoneNumber: string, 
    message: string, 
    violation: SafetyViolationSMS
  ): Promise<boolean> {
    if (!this.smsClient) return false;

    try {
      // Use MessagingServiceSid if available, otherwise use fromNumber
      const messageOptions: any = {
        body: message,
        to: phoneNumber,
        statusCallback: `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/status-callback`
      };

      // Check if MessagingServiceSid is configured
      if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
        messageOptions.messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
      } else {
        messageOptions.from = this.config!.fromNumber;
      }

      const twilioMessage = await this.smsClient.messages.create(messageOptions);

      // Track delivery status
      const messageId = twilioMessage.sid;
      this.deliveryStatus.set(messageId, {
        messageId,
        status: 'sent',
        retryCount: 0,
        maxRetries: 3
      });

      // Store SMS record in database
      await this.storeSMSRecord(messageId, phoneNumber, message, violation);

      console.log(`SMS sent successfully to ${phoneNumber}: ${messageId}`);
      return true;
    } catch (error) {
      console.error(`Failed to send SMS to ${phoneNumber}:`, error);
      return false;
    }
  }

  private async storeSMSRecord(
    messageId: string,
    phoneNumber: string,
    message: string,
    violation: SafetyViolationSMS
  ) {
    try {
      await prisma.smsNotification.create({
        data: {
          messageId,
          phoneNumber,
          message,
          violationType: violation.violationType,
          severity: violation.severity,
          location: violation.location,
          worksiteId: violation.worksiteId,
          cameraId: violation.cameraId,
          status: 'sent',
          sentAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to store SMS record:', error);
    }
  }

  private async logViolationAlert(violation: SafetyViolationSMS, smsSent: boolean) {
    try {
      await prisma.safetyViolation.create({
        data: {
          violationType: violation.violationType,
          severity: violation.severity,
          location: violation.location,
          description: violation.description,
          worksiteId: violation.worksiteId,
          cameraId: violation.cameraId,
          smsSent,
          smsSentAt: smsSent ? new Date() : null,
          detectedAt: violation.timestamp
        }
      });
    } catch (error) {
      console.error('Failed to log safety violation:', error);
    }
  }

  public async handleStatusCallback(
    messageId: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ) {
    const deliveryStatus = this.deliveryStatus.get(messageId);
    if (!deliveryStatus) return;

    // Update delivery status
    deliveryStatus.status = status as any;
    deliveryStatus.errorCode = errorCode;
    deliveryStatus.errorMessage = errorMessage;
    
    if (status === 'delivered') {
      deliveryStatus.deliveredAt = new Date();
    }

    // Update database
    await this.updateSMSStatus(messageId, status, errorCode, errorMessage);

    // Handle failed deliveries with retry logic
    if (status === 'failed' && deliveryStatus.retryCount < deliveryStatus.maxRetries) {
      await this.retrySMS(messageId);
    }
  }

  private async updateSMSStatus(
    messageId: string,
    status: string,
    errorCode?: string,
    errorMessage?: string
  ) {
    try {
      await prisma.smsNotification.update({
        where: { messageId },
        data: {
          status,
          errorCode,
          errorMessage,
          deliveredAt: status === 'delivered' ? new Date() : null,
          updatedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Failed to update SMS status:', error);
    }
  }

  private async retrySMS(messageId: string) {
    const deliveryStatus = this.deliveryStatus.get(messageId);
    if (!deliveryStatus) return;

    deliveryStatus.retryCount++;
    
    try {
      // Get original SMS record
      const smsRecord = await prisma.smsNotification.findUnique({
        where: { messageId }
      });

      if (smsRecord && this.smsClient) {
        // Retry sending SMS
        const twilioMessage = await this.smsClient.messages.create({
          body: smsRecord.message,
          from: this.config!.fromNumber,
          to: smsRecord.phoneNumber
        });

        // Update with new message ID
        await prisma.smsNotification.update({
          where: { messageId },
          data: {
            messageId: twilioMessage.sid,
            retryCount: deliveryStatus.retryCount,
            lastRetryAt: new Date()
          }
        });

        console.log(`SMS retry successful: ${twilioMessage.sid}`);
      }
    } catch (error) {
      console.error(`SMS retry failed for ${messageId}:`, error);
    }
  }

  public async getManagerContacts(worksiteId?: string): Promise<string[]> {
    try {
      const managers = await prisma.user.findMany({
        where: {
          role: { in: ['admin', 'manager', 'site-manager'] },
          isActive: true,
          ...(worksiteId && { worksiteId })
        },
        select: {
          phoneNumber: true
        }
      });

      return managers
        .map(manager => manager.phoneNumber)
        .filter(phone => phone && phone.trim() !== '') as string[];
    } catch (error) {
      console.error('Failed to get manager contacts:', error);
      return [];
    }
  }

  public async getEmergencyContacts(): Promise<string[]> {
    try {
      const emergencyContacts = await prisma.emergencyContact.findMany({
        where: { isActive: true },
        select: { phoneNumber: true }
      });

      return emergencyContacts
        .map(contact => contact.phoneNumber)
        .filter(phone => phone && phone.trim() !== '') as string[];
    } catch (error) {
      console.error('Failed to get emergency contacts:', error);
      return [];
    }
  }

  public async sendBulkSafetyAlert(
    violations: SafetyViolationSMS[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const violation of violations) {
      const result = await this.sendSafetyViolationAlert(violation);
      if (result) {
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed };
  }

  public getDeliveryStatus(messageId: string): SMSDeliveryStatus | undefined {
    return this.deliveryStatus.get(messageId);
  }

  public getAllDeliveryStatuses(): Map<string, SMSDeliveryStatus> {
    return this.deliveryStatus;
  }

  public isEnabled(): boolean {
    return this.config?.isEnabled || false;
  }

  public getConfiguration(): SMSConfig | null {
    return this.config;
  }
}

// Global SMS service instance
export const smsService = SafetySMSService.getInstance();

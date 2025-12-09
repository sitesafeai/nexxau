// AWS SNS SMS Service Implementation
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { logger } from './logger';

interface SMSConfig {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  enabled: boolean;
}

interface SafetyViolationSMS {
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  timestamp: Date;
  worksiteId?: string;
  cameraId?: string;
}

export class AWSSNSService {
  private snsClient: SNSClient | null = null;
  private config: SMSConfig | null = null;
  private deliveryStatus: Map<string, any> = new Map();

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const config: SMSConfig = {
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        enabled: process.env.SMS_ENABLED === 'true'
      };

      if (!config.enabled) {
        logger.warn('AWS SNS SMS service is disabled');
        return;
      }

      if (!config.accessKeyId || !config.secretAccessKey) {
        logger.warn('AWS SNS credentials not configured');
        return;
      }

      this.snsClient = new SNSClient({
        region: config.region,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey
        }
      });

      this.config = config;
      logger.info('AWS SNS SMS service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize AWS SNS SMS service:', error);
    }
  }

  public async sendSafetyViolationSMS(
    phoneNumber: string,
    violation: SafetyViolationSMS
  ): Promise<boolean> {
    if (!this.snsClient || !this.config) {
      logger.warn('AWS SNS SMS service not initialized');
      return false;
    }

    try {
      const message = this.formatSafetyViolationMessage(violation);
      return await this.sendSMS(phoneNumber, message, violation);
    } catch (error) {
      logger.error('Failed to send safety violation SMS:', error);
      return false;
    }
  }

  private formatSafetyViolationMessage(violation: SafetyViolationSMS): string {
    const emoji = this.getSeverityEmoji(violation.severity);
    const formattedTime = violation.timestamp.toLocaleString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    });

    return `
${emoji} SAFETY VIOLATION ALERT ${emoji}

Type: ${violation.violationType.replace(/_/g, ' ').toUpperCase()}
Severity: ${violation.severity.toUpperCase()}
Location: ${violation.location}
Time: ${formattedTime}

Description: ${violation.description}

This is an automated safety alert from
Nexxau Safety Monitoring System.

Reply STOP to unsubscribe from safety alerts.
    `.trim();
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

  private async sendSMS(
    phoneNumber: string, 
    message: string, 
    violation: SafetyViolationSMS
  ): Promise<boolean> {
    if (!this.snsClient) return false;

    try {
      const command = new PublishCommand({
        Message: message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          },
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'Nexxau'
          }
        }
      });

      const response = await this.snsClient.send(command);
      
      if (response.MessageId) {
        logger.info(`AWS SNS SMS sent successfully to ${phoneNumber}. MessageId: ${response.MessageId}`);
        
        // Track delivery status
        this.deliveryStatus.set(response.MessageId, {
          messageId: response.MessageId,
          phoneNumber,
          status: 'sent',
          timestamp: new Date(),
          violation
        });

        return true;
      } else {
        logger.error('AWS SNS SMS failed - no MessageId returned');
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send AWS SNS SMS to ${phoneNumber}:`, error);
      return false;
    }
  }

  public async sendTestSMS(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.snsClient) return false;

    try {
      const command = new PublishCommand({
        Message: message,
        PhoneNumber: phoneNumber,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          },
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: 'Nexxau'
          }
        }
      });

      const response = await this.snsClient.send(command);
      
      if (response.MessageId) {
        logger.info(`AWS SNS test SMS sent successfully to ${phoneNumber}. MessageId: ${response.MessageId}`);
        return true;
      } else {
        logger.error('AWS SNS test SMS failed - no MessageId returned');
        return false;
      }
    } catch (error) {
      logger.error(`Failed to send AWS SNS test SMS to ${phoneNumber}:`, error);
      return false;
    }
  }

  public getDeliveryStatus(messageId: string): any {
    return this.deliveryStatus.get(messageId);
  }

  public getAllDeliveryStatus(): Map<string, any> {
    return this.deliveryStatus;
  }

  public isEnabled(): boolean {
    return this.snsClient !== null && this.config?.enabled === true;
  }
}

// Export singleton instance
export const awsSnsService = new AWSSNSService();

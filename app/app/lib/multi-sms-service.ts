// Multi-Provider SMS Service (Twilio + AWS SNS)
import { smsService } from './sms-service';
import { awsSnsService } from './aws-sns-service';
import { logInfo, logError, logWarning } from './logger';

interface SafetyViolationSMS {
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  timestamp: Date;
  worksiteId?: string;
  cameraId?: string;
}

export class MultiSMSService {
  private providers: Array<{
    name: string;
    service: any;
    priority: number;
    enabled: boolean;
  }> = [];

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Add Twilio as primary provider
    this.providers.push({
      name: 'Twilio',
      service: smsService,
      priority: 1,
      enabled: smsService.isEnabled()
    });

    // Add AWS SNS as backup provider
    this.providers.push({
      name: 'AWS SNS',
      service: awsSnsService,
      priority: 2,
      enabled: awsSnsService.isEnabled()
    });

    // Sort by priority
    this.providers.sort((a, b) => a.priority - b.priority);

    logInfo(`Multi-SMS service initialized with ${this.providers.filter(p => p.enabled).length} enabled providers`);
  }

  public async sendSafetyViolationSMS(
    phoneNumber: string,
    violation: SafetyViolationSMS
  ): Promise<{ success: boolean; provider: string; messageId?: string; error?: string }> {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      logError('No SMS providers are enabled');
      return { success: false, provider: 'none', error: 'No providers enabled' };
    }

    // Try each provider in order of priority
    for (const provider of enabledProviders) {
      try {
        logInfo(`Attempting to send SMS via ${provider.name} to ${phoneNumber}`);
        
        let success = false;
        let messageId: string | undefined;

        if (provider.name === 'Twilio') {
          success = await provider.service.sendSafetyViolationSMS(phoneNumber, violation);
          // Get message ID from Twilio service if available
          messageId = 'twilio-message-id'; // This would need to be implemented
        } else if (provider.name === 'AWS SNS') {
          success = await provider.service.sendSafetyViolationSMS(phoneNumber, violation);
          // Get message ID from AWS SNS service if available
          messageId = 'aws-sns-message-id'; // This would need to be implemented
        }

        if (success) {
          logInfo(`SMS sent successfully via ${provider.name} to ${phoneNumber}`);
          return { success: true, provider: provider.name, messageId };
        } else {
          logWarning(`SMS failed via ${provider.name} to ${phoneNumber}, trying next provider`);
        }
      } catch (error) {
        logError(`Error sending SMS via ${provider.name} to ${phoneNumber}:`, error);
        // Continue to next provider
      }
    }

    // All providers failed
    logError(`All SMS providers failed to send message to ${phoneNumber}`);
    return { 
      success: false, 
      provider: 'all', 
      error: 'All providers failed' 
    };
  }

  public async sendTestSMS(
    phoneNumber: string, 
    message: string
  ): Promise<{ success: boolean; provider: string; messageId?: string; error?: string }> {
    const enabledProviders = this.providers.filter(p => p.enabled);
    
    if (enabledProviders.length === 0) {
      logError('No SMS providers are enabled');
      return { success: false, provider: 'none', error: 'No providers enabled' };
    }

    // Try each provider in order of priority
    for (const provider of enabledProviders) {
      try {
        logInfo(`Attempting to send test SMS via ${provider.name} to ${phoneNumber}`);
        
        let success = false;
        let messageId: string | undefined;

        if (provider.name === 'Twilio') {
          success = await provider.service.sendTestSMS(phoneNumber, message);
          messageId = 'twilio-test-message-id';
        } else if (provider.name === 'AWS SNS') {
          success = await provider.service.sendTestSMS(phoneNumber, message);
          messageId = 'aws-sns-test-message-id';
        }

        if (success) {
          logInfo(`Test SMS sent successfully via ${provider.name} to ${phoneNumber}`);
          return { success: true, provider: provider.name, messageId };
        } else {
          logWarning(`Test SMS failed via ${provider.name} to ${phoneNumber}, trying next provider`);
        }
      } catch (error) {
        logError(`Error sending test SMS via ${provider.name} to ${phoneNumber}:`, error);
        // Continue to next provider
      }
    }

    // All providers failed
    logError(`All SMS providers failed to send test message to ${phoneNumber}`);
    return { 
      success: false, 
      provider: 'all', 
      error: 'All providers failed' 
    };
  }

  public getProviderStatus(): Array<{
    name: string;
    enabled: boolean;
    priority: number;
  }> {
    return this.providers.map(p => ({
      name: p.name,
      enabled: p.enabled,
      priority: p.priority
    }));
  }

  public getEnabledProviders(): string[] {
    return this.providers
      .filter(p => p.enabled)
      .map(p => p.name);
  }

  public isAnyProviderEnabled(): boolean {
    return this.providers.some(p => p.enabled);
  }
}

// Export singleton instance
export const multiSmsService = new MultiSMSService();

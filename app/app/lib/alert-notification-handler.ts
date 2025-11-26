/**
 * Alert Notification Handler
 * Listens to alert events and sends notifications (email/SMS) based on user preferences
 */

import { onAlertCreated, type AlertEventPayload } from './alert-events';
import { prisma } from './prisma';
import { sendAlertNotificationEmail } from './email-service';
import { SafetySMSService } from './sms-service';

const smsService = new SafetySMSService();

/**
 * Initialize alert notification handler
 * This should be called once when the server starts
 */
export function initializeAlertNotifications() {
  console.log('[notifications] Initializing alert notification handler...');
  
  onAlertCreated(async (alert: AlertEventPayload) => {
    try {
      await handleAlertNotification(alert);
    } catch (error) {
      console.error('[notifications] Error handling alert notification:', error);
      // Don't throw - notification failures shouldn't break alert creation
    }
  });
  
  console.log('[notifications] Alert notification handler initialized');
}

/**
 * Handle notification for a newly created alert
 */
async function handleAlertNotification(alert: AlertEventPayload) {
  try {
    // Get worksite and company info
    const worksite = await prisma.worksite.findUnique({
      where: { id: alert.worksiteId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
          },
        },
        users: {
          where: {
            role: {
              in: ['SITE_ADMIN', 'SUPERVISOR', 'COMPANY_ADMIN'],
            },
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
          },
        },
      },
    });

    if (!worksite) {
      console.warn(`[notifications] Worksite ${alert.worksiteId} not found for alert ${alert.id}`);
      return;
    }

    // Get worksite settings to check notification preferences
    const settings = await prisma.cameraSystemConfig.findUnique({
      where: { worksiteId: alert.worksiteId },
    });

    const worksiteSettings = settings?.config as any;
    const emailEnabled = worksiteSettings?.notifications?.emailEnabled !== false; // Default to true
    const smsEnabled = worksiteSettings?.notifications?.smsEnabled === true; // Default to false

    // Get users who should receive notifications
    const recipients = worksite.users.filter((user) => {
      // Only notify users with email or phone
      return user.email || user.phone;
    });

    if (recipients.length === 0) {
      console.log(`[notifications] No recipients found for alert ${alert.id}`);
      return;
    }

    const alertUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard/alerts?id=${alert.id}`;
    const alertTimestamp = alert.createdAt ? new Date(alert.createdAt) : new Date();

    // Send email notifications
    if (emailEnabled) {
      const emailRecipients = recipients
        .filter((user) => user.email)
        .map((user) => user.email!);

      if (emailRecipients.length > 0) {
        try {
          await sendAlertNotificationEmail(
            emailRecipients,
            alert.title,
            alert.location || worksite.name || 'Unknown Location',
            alert.severity,
            alertTimestamp,
            alertUrl
          );

          // Update alert metadata to track email sent
          await prisma.alert.update({
            where: { id: alert.id },
            data: {
              metadata: {
                ...(alert.metadata || {}),
                emailSent: true,
                emailSentAt: new Date().toISOString(),
                emailRecipients: emailRecipients,
              },
            },
          });

          console.log(`[notifications] Email sent to ${emailRecipients.length} recipients for alert ${alert.id}`);
        } catch (error) {
          console.error(`[notifications] Failed to send email for alert ${alert.id}:`, error);
        }
      }
    }

    // Send SMS notifications (only for CRITICAL or HIGH severity)
    if (smsEnabled && (alert.severity === 'CRITICAL' || alert.severity === 'HIGH')) {
      const smsRecipients = recipients.filter((user) => user.phone);

      for (const user of smsRecipients) {
        if (!user.phone) continue;

        try {
          const smsResult = await smsService.sendSafetyViolationSMS(user.phone, {
            violationType: alert.title,
            severity: alert.severity,
            location: alert.location || worksite.name || 'Unknown Location',
            description: alert.description,
            timestamp: alertTimestamp.toISOString(),
            worksiteId: alert.worksiteId,
            cameraId: (alert.metadata as any)?.cameraId || null,
          });

          if (smsResult.success) {
            console.log(`[notifications] SMS sent to ${user.phone} for alert ${alert.id}`);
          }
        } catch (error) {
          console.error(`[notifications] Failed to send SMS to ${user.phone} for alert ${alert.id}:`, error);
        }
      }

      // Update alert metadata to track SMS sent
      await prisma.alert.update({
        where: { id: alert.id },
        data: {
          metadata: {
            ...(alert.metadata || {}),
            smsSent: true,
            smsSentAt: new Date().toISOString(),
          },
        },
      });
    }

    // Create in-app notifications for all users
    for (const user of recipients) {
      try {
        await prisma.notification.create({
          data: {
            userId: user.id,
            title: alert.title,
            message: alert.description || `New ${alert.severity} alert at ${alert.location || worksite.name}`,
            type: 'ALERT',
            priority: alert.severity === 'CRITICAL' ? 'URGENT' : alert.severity === 'HIGH' ? 'HIGH' : 'NORMAL',
            metadata: {
              alertId: alert.id,
              severity: alert.severity,
              location: alert.location,
            },
          },
        });
      } catch (error) {
        console.error(`[notifications] Failed to create in-app notification for user ${user.id}:`, error);
      }
    }

    console.log(`[notifications] Notifications processed for alert ${alert.id}`);
  } catch (error) {
    console.error('[notifications] Error in handleAlertNotification:', error);
    throw error;
  }
}


import { NextRequest, NextResponse } from 'next/server';
import notificationService from '@/app/lib/notification-service';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      template, 
      data, 
      recipients, 
      priority = 'normal',
      userId 
    } = body;

    // Validate required fields
    if (!type || !template || !recipients) {
      return NextResponse.json({ 
        error: 'Missing required fields: type, template, recipients' 
      }, { status: 400 });
    }

    // Validate notification type
    if (!['email', 'sms'].includes(type)) {
      return NextResponse.json({ 
        error: 'Invalid notification type. Must be "email" or "sms"' 
      }, { status: 400 });
    }

    // Validate priority
    if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
      return NextResponse.json({ 
        error: 'Invalid priority. Must be "low", "normal", "high", or "urgent"' 
      }, { status: 400 });
    }

    // Check if notification service is configured for the requested type
    const configStatus = notificationService.getConfigurationStatus();
    if (type === 'email' && !configStatus.email) {
      return NextResponse.json({ 
        error: 'Email service not configured' 
      }, { status: 503 });
    }
    if (type === 'sms' && !configStatus.sms) {
      return NextResponse.json({ 
        error: 'SMS service not configured' 
      }, { status: 503 });
    }

    // Create notification record in database
    const notification = await prisma.notification.create({
      data: {
        userId: userId || null,
        title: data.alertType || 'Safety Notification',
        message: data.description || 'Safety system notification',
        type: type === 'email' ? 'EMAIL' : 'SMS',
        priority: priority.toUpperCase() as any,
        metadata: {
          template,
          data,
          recipients: Array.isArray(recipients) ? recipients : [recipients]
        }
      }
    });

    // Send notification
    const notificationData = {
      to: recipients,
      type,
      template,
      data,
      priority
    };

    const success = await notificationService.sendNotification(notificationData);

    // Update notification record with result
    await prisma.notification.update({
      where: { id: notification.id },
      data: {
        isRead: success,
        readAt: success ? new Date() : null,
        metadata: {
          ...notification.metadata,
          sent: success,
          sentAt: success ? new Date().toISOString() : null,
          error: success ? null : 'Failed to send notification'
        }
      }
    });

    if (success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Notification sent successfully',
        notificationId: notification.id
      });
    } else {
      return NextResponse.json({ 
        error: 'Failed to send notification' 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Notification send error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const configStatus = notificationService.getConfigurationStatus();
    
    return NextResponse.json({
      status: 'active',
      configuration: configStatus,
      supportedTypes: ['email', 'sms'],
      supportedTemplates: [
        'safety-alert',
        'alert-resolved', 
        'system-status'
      ]
    });

  } catch (error) {
    console.error('Notification status error:', error);
    return NextResponse.json({ 
      error: 'Failed to get notification status' 
    }, { status: 500 });
  }
}

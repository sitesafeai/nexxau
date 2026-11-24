import { NextRequest, NextResponse } from 'next/server';
import { sendAlertNotificationEmail } from '@/app/lib/email-service';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

/**
 * POST /api/send-alert-email
 * Send alert notification emails
 * Called by AI detection service when alerts are triggered
 */
export async function POST(request: NextRequest) {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  try {
    const body = await request.json();
    const { recipients, alertType, location, severity, timestamp, alertId } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Recipients array is required' },
        { status: 400 }
      );
    }

    if (!alertType || !location || !severity) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: alertType, location, severity' },
        { status: 400 }
      );
    }

    const alertTimestamp = timestamp ? new Date(timestamp) : new Date();
    const detailsUrl = alertId 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/alerts/${alertId}`
      : `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=alerts`;

    const result = await sendAlertNotificationEmail(
      recipients,
      alertType,
      location,
      severity,
      alertTimestamp,
      detailsUrl
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Alert email sent to ${recipients.length} recipient(s)`
      });
    } else {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error sending alert email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to send alert email', details: error.message },
      { status: 500 }
    );
  }
}


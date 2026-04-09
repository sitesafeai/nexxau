import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { acknowledgeAlertSchema } from '@/app/lib/validation/alerts';
import {
  sendAcknowledgmentTeamNotifications,
  type NotificationRecipientInput,
  type NotifyChannel,
} from '@/app/lib/acknowledgment-team-notify';

/**
 * POST /api/alerts/[id]/acknowledge
 * Multi-step alert acknowledgment with audit trail
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    
    // Validate note if provided (other fields are optional)
    if (body.note !== undefined) {
      const noteValidation = acknowledgeAlertSchema.safeParse({ note: body.note });
      if (!noteValidation.success) {
        return NextResponse.json(
          {
            success: false,
            error: 'Validation failed',
            details: noteValidation.error.errors,
          },
          { status: 400 }
        );
      }
    }

    const {
      note,
      actionTaken,
      severity,
      requiresFollowUp,
      followUpDate,
      notifyOthers,
      notificationList,
      notificationRecipients,
    } = body;

    // Get existing alert
    const existingAlert = await prisma.alert.findUnique({
      where: { id },
      include: {
        worksite: true
      }
    });

    if (!existingAlert) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    if (existingAlert.status === 'ACKNOWLEDGED' || existingAlert.status === 'RESOLVED') {
      return NextResponse.json(
        { error: 'Alert has already been acknowledged or resolved' },
        { status: 400 }
      );
    }

    // Perform multi-step acknowledgment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Step 1: Update alert status
      const updatedAlert = await tx.alert.update({
        where: { id },
        data: {
          status: 'ACKNOWLEDGED',
          metadata: {
            ...(existingAlert.metadata as any || {}),
            acknowledgment: {
              acknowledgedAt: new Date().toISOString(),
              acknowledgedBy: {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email
              },
              notes: note || null,
              actionTaken: actionTaken || null,
              severityAssessment: severity || existingAlert.severity,
              requiresFollowUp: requiresFollowUp || false,
              followUpDate: followUpDate || null,
              ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
              userAgent: request.headers.get('user-agent') || 'unknown'
            }
          }
        },
        include: {
          worksite: true,
          rule: true
        }
      });

      // Step 2: Create acknowledgment log in AlertResponse table
      await tx.alertResponse.create({
        data: {
          alertId: id,
          userId: session.user.id,
          response: 'ACKNOWLEDGED',
          notes: note || null,
          // Note: metadata field doesn't exist in AlertResponse schema
          // Store additional info in notes if needed: actionTaken, severityAssessment, requiresFollowUp, followUpDate
          createdAt: new Date()
        }
      });

      // Step 3: Create audit log entry
      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          worksiteId: existingAlert.worksiteId ?? undefined,
          action: 'ACKNOWLEDGE_ALERT',
          entity: 'Alert',
          entityId: id,
          changes: {
            from: { status: existingAlert.status },
            to: { status: 'ACKNOWLEDGED' },
            note,
            actionTaken,
            severityAssessment: severity,
            requiresFollowUp,
            followUpDate: followUpDate || null,
          },
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
          userAgent: request.headers.get('user-agent'),
          createdAt: new Date() // Using createdAt instead of timestamp
        }
      });

      // Step 4: If follow-up is required, create a follow-up task/notification
      if (requiresFollowUp && followUpDate) {
        await tx.notification.create({
          data: {
            userId: session.user.id,
            title: `Follow-up Required: ${updatedAlert.title}`,
            message: `Follow-up needed for alert at ${updatedAlert.location}. ${note || ''}`,
            type: 'ALERT',
            priority: 'HIGH',
            metadata: {
              alertId: id,
              followUpDate,
              originalAlert: {
                title: updatedAlert.title,
                location: updatedAlert.location,
                severity: updatedAlert.severity
              }
            }
          }
        });
      }

      return updatedAlert;
    });

    // Team notifications (in-app, email, SMS, WhatsApp) — run after commit; external sends must not roll back ack
    if (notifyOthers && existingAlert.worksiteId) {
      let recipients: NotificationRecipientInput[] = normalizeNotificationRecipients(
        notificationRecipients,
        notificationList
      );
      recipients = await filterRecipientsByWorksite(existingAlert.worksiteId, recipients);
      if (recipients.length > 0) {
        await sendAcknowledgmentTeamNotifications({
          alertId: id,
          alertTitle: result.title,
          location: result.location,
          worksiteName: result.worksite?.name ?? null,
          note: note ?? null,
          actionTaken: actionTaken ?? null,
          acknowledgedByName: session.user.name ?? null,
          recipients,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Alert acknowledged successfully',
      alert: result,
      acknowledgment: {
        acknowledgedBy: session.user.name,
        acknowledgedAt: new Date().toISOString(),
        requiresFollowUp
      }
    });

  } catch (error: any) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert', details: error.message },
      { status: 500 }
    );
  }
}

const ALLOWED_CHANNELS = new Set<NotifyChannel>(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP']);

function normalizeNotificationRecipients(
  raw: unknown,
  legacyList: unknown
): NotificationRecipientInput[] {
  const out: NotificationRecipientInput[] = [];

  if (Array.isArray(raw)) {
    for (const row of raw) {
      if (!row || typeof row !== 'object') continue;
      const userId = (row as { userId?: string }).userId;
      const channels = (row as { channels?: unknown }).channels;
      if (!userId || !Array.isArray(channels) || channels.length === 0) continue;
      const cleaned = channels.filter(
        (c): c is NotifyChannel => typeof c === 'string' && ALLOWED_CHANNELS.has(c as NotifyChannel)
      );
      if (!cleaned.length) continue;
      const phoneOverride = (row as { phoneOverride?: unknown }).phoneOverride;
      const savePhoneToProfile = (row as { savePhoneToProfile?: unknown }).savePhoneToProfile;
      const entry: NotificationRecipientInput = { userId, channels: cleaned };
      if (typeof phoneOverride === 'string' && phoneOverride.trim()) {
        entry.phoneOverride = phoneOverride.trim();
      }
      if (savePhoneToProfile === true) {
        entry.savePhoneToProfile = true;
      }
      out.push(entry);
    }
  }

  if (out.length === 0 && Array.isArray(legacyList) && legacyList.length > 0) {
    for (const userId of legacyList) {
      if (typeof userId === 'string' && userId) {
        out.push({ userId, channels: ['IN_APP'] });
      }
    }
  }

  return out;
}

async function filterRecipientsByWorksite(
  worksiteId: string,
  recipients: NotificationRecipientInput[]
): Promise<NotificationRecipientInput[]> {
  if (recipients.length === 0) return [];
  const ids = [...new Set(recipients.map((r) => r.userId))];
  const members = await prisma.worksiteUser.findMany({
    where: { worksiteId, userId: { in: ids } },
    select: { userId: true },
  });
  const allowed = new Set(members.map((m) => m.userId));
  return recipients.filter((r) => allowed.has(r.userId));
}


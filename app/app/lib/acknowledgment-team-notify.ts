import { prisma } from '@/app/lib/prisma';
import { normalizePhoneInput } from '@/app/lib/phone-normalize';
import { sendResendHtml } from '@/app/lib/resend-mail';
import { sendSMSAlert, sendWhatsAppText } from '@/app/lib/twilio';

export type NotifyChannel = 'IN_APP' | 'EMAIL' | 'SMS' | 'WHATSAPP';

export type NotificationRecipientInput = {
  userId: string;
  channels: NotifyChannel[];
  /** Used when profile has no phone and SMS/WhatsApp selected */
  phoneOverride?: string | null;
  /** If true with phoneOverride, persist to User.phoneNumber before sending */
  savePhoneToProfile?: boolean;
};

function buildMessage(params: {
  alertTitle: string;
  location: string | null;
  worksiteName: string | null;
  note: string | null;
  actionTaken: string | null;
  acknowledgedByName: string | null;
}): string {
  const lines = [
    `Alert acknowledged: ${params.alertTitle}`,
    params.worksiteName ? `Site: ${params.worksiteName}` : null,
    params.location ? `Location: ${params.location}` : null,
    params.acknowledgedByName ? `By: ${params.acknowledgedByName}` : null,
    '',
    params.note ? `Note: ${params.note}` : null,
    params.actionTaken ? `Action taken: ${params.actionTaken}` : null,
  ].filter(Boolean);
  return lines.join('\n');
}

/**
 * Sends team notifications after an alert is acknowledged.
 * Only users who are members of the alert's worksite are notified (callers should pre-filter).
 */
export async function sendAcknowledgmentTeamNotifications(params: {
  alertId: string;
  alertTitle: string;
  location: string | null;
  worksiteName: string | null;
  note: string | null;
  actionTaken: string | null;
  acknowledgedByName: string | null;
  recipients: NotificationRecipientInput[];
}): Promise<void> {
  const plain = buildMessage(params);
  const html = `
    <p><strong>${escapeHtml(params.alertTitle)}</strong></p>
    ${params.worksiteName ? `<p>Site: ${escapeHtml(params.worksiteName)}</p>` : ''}
    ${params.location ? `<p>Location: ${escapeHtml(params.location)}</p>` : ''}
    ${params.acknowledgedByName ? `<p>Acknowledged by: ${escapeHtml(params.acknowledgedByName)}</p>` : ''}
    ${params.note ? `<p>Note: ${escapeHtml(params.note)}</p>` : ''}
    ${params.actionTaken ? `<p>Action taken: ${escapeHtml(params.actionTaken)}</p>` : ''}
  `;

  for (const r of params.recipients) {
    if (!r.channels?.length) continue;

    const user = await prisma.user.findUnique({
      where: { id: r.userId },
      select: { id: true, email: true, phoneNumber: true, name: true },
    });
    if (!user) {
      console.warn('[ack notify] skip unknown user', r.userId);
      continue;
    }

    const needsPhone = r.channels.includes('SMS') || r.channels.includes('WHATSAPP');
    let phoneForSms = user.phoneNumber?.trim() || null;
    const overrideNorm = r.phoneOverride ? normalizePhoneInput(r.phoneOverride) : null;

    if (needsPhone && !phoneForSms && overrideNorm) {
      if (r.savePhoneToProfile) {
        await prisma.user.update({
          where: { id: user.id },
          data: { phoneNumber: overrideNorm },
        });
        phoneForSms = overrideNorm;
      } else {
        phoneForSms = overrideNorm;
      }
    }

    for (const channel of r.channels) {
      try {
        if (channel === 'IN_APP') {
          await prisma.notification.create({
            data: {
              userId: user.id,
              title: `Alert acknowledged: ${params.alertTitle}`,
              message: plain,
              type: 'ALERT',
              priority: 'MEDIUM',
              metadata: {
                alertId: params.alertId,
                channel: 'IN_APP',
                acknowledgedBy: params.acknowledgedByName,
                actionTaken: params.actionTaken,
              },
            },
          });
        } else if (channel === 'EMAIL') {
          if (!user.email) {
            console.warn('[ack notify] email skipped — no email for user', user.id);
            continue;
          }
          const result = await sendResendHtml({
            to: user.email,
            subject: `Alert acknowledged: ${params.alertTitle}`,
            html,
            text: plain,
          });
          if (!result.success) {
            console.error('[ack notify] email failed', user.id, result.error);
          }
        } else if (channel === 'SMS') {
          if (!phoneForSms) {
            console.warn('[ack notify] SMS skipped — no phone for user', user.id);
            continue;
          }
          await sendSMSAlert(phoneForSms, plain);
        } else if (channel === 'WHATSAPP') {
          if (!phoneForSms) {
            console.warn('[ack notify] WhatsApp skipped — no phone for user', user.id);
            continue;
          }
          await sendWhatsAppText(phoneForSms, plain);
        }
      } catch (e) {
        console.error('[ack notify] channel error', r.userId, channel, e);
      }
    }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

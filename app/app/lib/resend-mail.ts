import { Resend } from 'resend';

let _client: Resend | null | undefined;

export function getResend(): Resend | null {
  if (_client !== undefined) return _client;
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || key === 'your_resend_api_key_here') {
    _client = null;
    return null;
  }
  _client = new Resend(key);
  return _client;
}

export function isResendConfigured(): boolean {
  return getResend() !== null;
}

/**
 * Verified sender in Resend (full "Name <email@domain.com>" string).
 * Set RESEND_FROM in production; fallbacks keep local dev working with Resend test domain.
 */
export function getResendFromAddress(): string {
  const explicit =
    process.env.RESEND_FROM?.trim() ||
    process.env.ALERT_FROM_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim();
  if (explicit) return explicit;
  return 'Nexxau <onboarding@resend.dev>';
}

export type SendResendResult =
  | { success: true; id?: string }
  | { success: false; error: string };

export async function sendResendHtml(options: {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}): Promise<SendResendResult> {
  const client = getResend();
  if (!client) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }
  const to = Array.isArray(options.to) ? options.to : [options.to];
  try {
    const { data, error } = await client.emails.send({
      from: options.from ?? getResendFromAddress(),
      to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo,
    });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return { success: false, error: message };
  }
}

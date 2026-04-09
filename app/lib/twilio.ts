import twilio, { Twilio } from 'twilio';

let _client: Twilio | null = null;

export type AlertPayload = {
  cameraName: string;
  worksiteName: string;
  violationType: string;
  confidence: number;
  timestamp: string;
};

function getClient(): Twilio | null {
  if (_client) return _client;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.warn('[Twilio] Missing credentials');
    return null;
  }
  _client = twilio(sid, token);
  return _client;
}

function payloadToMessage(payload: AlertPayload): string {
  return buildAlertMessage({
    cameraName: payload.cameraName,
    worksiteName: payload.worksiteName,
    type: payload.violationType,
    confidence: payload.confidence,
    timestamp: payload.timestamp,
  });
}

export async function sendSMSAlert(
  to: string,
  messageOrPayload: string | AlertPayload
): Promise<boolean> {
  const message =
    typeof messageOrPayload === 'string'
      ? messageOrPayload
      : payloadToMessage(messageOrPayload);
  const client = getClient();
  if (!client) return false;
  const from = process.env.TWILIO_PHONE_SMS;
  if (!from) {
    console.warn('[Twilio] TWILIO_PHONE_SMS not set');
    return false;
  }
  try {
    const msg = await client.messages.create({
      to,
      from,
      body: message,
    });
    console.log(`[Twilio] SMS sent to ${to} — SID: ${msg.sid}`);
    return true;
  } catch (err) {
    console.error(`[Twilio] SMS failed to ${to}:`, err);
    return false;
  }
}

/** WhatsApp via Twilio (from must be a WhatsApp-enabled Twilio number). */
/** Plain-text WhatsApp (same Twilio WhatsApp sandbox / sender as template alerts). */
export async function sendWhatsAppText(to: string, body: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    console.warn('[Twilio] TWILIO_WHATSAPP_FROM not set');
    return false;
  }
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
  try {
    const msg = await client.messages.create({
      to: toAddr,
      from: fromAddr,
      body,
    });
    console.log(`[Twilio] WhatsApp (text) sent to ${toAddr} — SID: ${msg.sid}`);
    return true;
  } catch (err) {
    console.error(`[Twilio] WhatsApp (text) failed to ${toAddr}:`, err);
    return false;
  }
}

export async function sendWhatsAppAlert(
  to: string,
  payload: AlertPayload
): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!from) {
    console.warn('[Twilio] TWILIO_WHATSAPP_FROM not set');
    return false;
  }
  const body = payloadToMessage(payload);
  const toAddr = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const fromAddr = from.startsWith('whatsapp:') ? from : `whatsapp:${from}`;
  try {
    const msg = await client.messages.create({
      to: toAddr,
      from: fromAddr,
      body,
    });
    console.log(`[Twilio] WhatsApp sent to ${toAddr} — SID: ${msg.sid}`);
    return true;
  } catch (err) {
    console.error(`[Twilio] WhatsApp failed to ${toAddr}:`, err);
    return false;
  }
}

export async function sendBothAlerts(
  to: string,
  payload: AlertPayload
): Promise<void> {
  await Promise.all([
    sendSMSAlert(to, payload),
    sendWhatsAppAlert(to, payload),
  ]);
}

export function buildAlertMessage(params: {
  cameraName: string;
  worksiteName: string;
  type: string;
  confidence: number;
  timestamp: string;
}): string {
  const time = new Date(params.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return (
    `🚨 NEXXAU ALERT\n` +
    `Site: ${params.worksiteName}\n` +
    `Camera: ${params.cameraName}\n` +
    `Detection: ${params.type}\n` +
    `Confidence: ${Math.round(params.confidence * 100)}%\n` +
    `Time: ${time}`
  );
}


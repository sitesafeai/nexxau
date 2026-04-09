import { sendResendHtml, getResendFromAddress } from '@/app/lib/resend-mail';

export interface AlertPayload {
  cameraName: string;
  worksiteName: string;
  type: string;
  confidence: number;
  timestamp: string;
  snapshotUrl?: string;
}

function buildHTMLEmail(p: AlertPayload): string {
  const time = new Date(p.timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  const date = new Date(p.timestamp).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:#0f172a;padding:24px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">NEXXAU</div>
                    <div style="color:#94a3b8;font-size:12px;margin-top:2px;">Safety Monitoring Platform</div>
                  </td>
                  <td align="right">
                    <div style="background:#ef4444;color:#ffffff;font-size:11px;font-weight:700;padding:4px 10px;border-radius:20px;letter-spacing:0.5px;">🚨 ALERT</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 32px 0;">
              <div style="font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">
                ${p.type} Detected
              </div>
              <div style="color:#64748b;font-size:14px;margin-top:6px;">${date} at ${time}</div>
            </td>
          </tr>

          <tr>
            <td style="padding:20px 32px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Worksite</div>
                    <div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:3px;">${p.worksiteName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Camera</div>
                    <div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:3px;">${p.cameraName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;border-bottom:1px solid #e2e8f0;">
                    <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Detection Type</div>
                    <div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:3px;">${p.type}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;">Confidence</div>
                    <div style="margin-top:8px;">
                      <div style="background:#e2e8f0;border-radius:4px;height:6px;width:100%;">
                        <div style="background:#0f172a;border-radius:4px;height:6px;width:${Math.round(p.confidence * 100)}%;"></div>
                      </div>
                      <div style="color:#0f172a;font-size:13px;font-weight:600;margin-top:4px;">${Math.round(p.confidence * 100)}%</div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          ${p.snapshotUrl ? `
          <tr>
            <td style="padding:0 32px 20px;">
              <div style="color:#64748b;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Snapshot</div>
              <img src="${p.snapshotUrl}" alt="Detection snapshot" style="width:100%;border-radius:8px;border:1px solid #e2e8f0;" />
            </td>
          </tr>
          ` : `
          <tr>
            <td style="padding:0 32px 20px;">
              <div style="color:#64748b;font-size:13px;margin-top:10px;">
                A detection snapshot will appear in the Alerts tab shortly.
              </div>
            </td>
          </tr>
          `}

          <tr>
            <td style="padding:0 32px 28px;">
              <a href="${process.env.NEXTAUTH_URL ?? 'http://localhost:3000'}/dashboard"
                 style="display:block;text-align:center;background:#0f172a;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none;">
                View in Dashboard →
              </a>
            </td>
          </tr>

          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 32px;">
              <div style="color:#94a3b8;font-size:12px;text-align:center;">
                Nexxau Safety Monitoring · Automated alert · Do not reply
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

export async function sendEmailAlert(to: string, payload: AlertPayload): Promise<boolean> {
  const result = await sendResendHtml({
    from: getResendFromAddress(),
    to,
    subject: `🚨 ${payload.type} Detected — ${payload.worksiteName}`,
    html: buildHTMLEmail(payload),
  });

  if (!result.success) {
    console.error('[Notifications] Email error:', result.error);
    return false;
  }

  console.log('[Notifications] Email sent, id:', result.id);
  return true;
}

export async function sendAlerts(to: string, payload: AlertPayload): Promise<void> {
  await sendEmailAlert(to, payload);
}

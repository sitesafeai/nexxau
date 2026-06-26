/**
 * Email Service
 * All outbound mail uses Resend (see app/lib/resend-mail.ts).
 */

import { sendResendHtml, getResendFromAddress, isResendConfigured } from './resend-mail';

const FROM_NAME = process.env.FROM_NAME || 'Nexxau';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

let resendConfigLogged = false;
function logResendConfigOnce(): void {
  if (resendConfigLogged) return;
  resendConfigLogged = true;
  console.log('[EMAIL CONFIG] Resend:', isResendConfigured() ? 'RESEND_API_KEY set' : 'RESEND_API_KEY missing');
  console.log('[EMAIL CONFIG] From:', getResendFromAddress());
}

// Email Templates
const getEmailTemplate = (title: string, content: string, buttonText?: string, buttonUrl?: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: white;
      margin: 0;
    }
    .content {
      padding: 40px 30px;
    }
    .content h1 {
      color: #1e40af;
      font-size: 24px;
      margin-top: 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: #3b82f6;
      color: white !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #2563eb;
    }
    .footer {
      background: #f9fafb;
      padding: 30px;
      text-align: center;
      font-size: 14px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .divider {
      height: 1px;
      background: #e5e7eb;
      margin: 30px 0;
    }
    .info-box {
      background: #f0f9ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="logo" style="letter-spacing:3px;font-size:28px;">NEXXAU</h1>
    </div>
    <div class="content">
      <h1>${title}</h1>
      ${content}
      ${buttonText && buttonUrl ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${buttonUrl}" class="button">${buttonText}</a>
        </div>
      ` : ''}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} Nexxau. All rights reserved.</p>
      <p>AI-Powered Construction Safety Monitoring</p>
    </div>
  </div>
</body>
</html>
`;

// Email sending functions

/**
 * Send account invitation email for worksite user onboarding
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  role: string,
  worksiteName: string,
  token: string,
  companyName?: string,
  companyId?: string,
  worksiteId?: string
): Promise<{ success: boolean; error?: string; errorDetails?: any }> {
  try {
    // Hard logging before attempting to send
    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] INVITATION EMAIL SEND ATTEMPT');
    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] Recipient email:', to);
    console.log('[EMAIL] Company ID:', companyId || 'N/A');
    console.log('[EMAIL] Worksite ID:', worksiteId || 'N/A');
    console.log('[EMAIL] Worksite Name:', worksiteName);
    console.log('[EMAIL] Role:', role);
    console.log('[EMAIL] From:', getResendFromAddress());
    console.log('[EMAIL] Timestamp:', new Date().toISOString());
    logResendConfigOnce();
    
    const inviteUrl = `${APP_URL}/onboard?token=${token}`;
    
    const content = `
      <p>Hello!</p>
      <p><strong>${inviterName}</strong> has added you to <strong>${worksiteName}</strong>${companyName ? ` (${companyName})` : ''} on Nexxau as a <strong>${role}</strong>.</p>
      <div class="info-box">
        <p><strong>What's Next?</strong></p>
        <p>Click the button below to complete your account setup and set your password. This link will expire in 24 hours.</p>
      </div>
      <p>Once you've completed your account setup, you'll have access to:</p>
      <ul>
        <li>Real-time safety monitoring dashboards</li>
        <li>AI-powered violation detection</li>
        <li>Compliance reporting and analytics</li>
        <li>Team collaboration tools</li>
      </ul>
    `;

    console.log('[EMAIL] Attempting to send via Resend...');
    const result = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: `You've been added to ${worksiteName} – Complete Your Account`,
      html: getEmailTemplate(
        `Complete Your Account Setup`,
        content,
        'Complete Account Setup',
        inviteUrl
      ),
    });

    if (!result.success) {
      console.error('[EMAIL] Resend error:', result.error);
      return { success: false, error: result.error };
    }

    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] ✅ EMAIL SENT SUCCESSFULLY');
    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] Resend id:', result.id);
    console.log('[EMAIL] Timestamp:', new Date().toISOString());

    return { success: true };
  } catch (error: any) {
    // Hard logging on failure with full error object
    console.error('[EMAIL] ========================================');
    console.error('[EMAIL] ❌ EMAIL SEND FAILED');
    console.error('[EMAIL] ========================================');
    console.error('[EMAIL] Recipient email:', to);
    console.error('[EMAIL] Company ID:', companyId || 'N/A');
    console.error('[EMAIL] Worksite ID:', worksiteId || 'N/A');
    console.error('[EMAIL] Error message:', error.message);
    console.error('[EMAIL] Error code:', error.code || 'N/A');
    console.error('[EMAIL] Error command:', error.command || 'N/A');
    console.error('[EMAIL] Error response:', error.response || 'N/A');
    console.error('[EMAIL] Error responseCode:', error.responseCode || 'N/A');
    console.error('[EMAIL] Error responseMessage:', error.responseMessage || 'N/A');
    console.error('[EMAIL] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    console.error('[EMAIL] Timestamp:', new Date().toISOString());
    
    return { 
      success: false, 
      error: error.message || 'Unknown error sending email',
      errorDetails: {
        code: error.code,
        command: error.command,
        response: error.response,
        responseCode: error.responseCode,
        responseMessage: error.responseMessage
      }
    };
  }
}

/**
 * Send safety alert notification
 */
export async function sendAlertNotificationEmail(
  to: string[],
  alertType: string,
  location: string,
  severity: string,
  timestamp: Date,
  detailsUrl: string,
  snapshotUrl?: string
): Promise<{ success: boolean; error?: string }> {
  console.log('[ALERT EMAIL] ========================================');
  console.log('[ALERT EMAIL] SAFETY ALERT EMAIL SEND ATTEMPT');
  console.log('[ALERT EMAIL] ========================================');
  console.log('[ALERT EMAIL] Recipients:', to);
  console.log('[ALERT EMAIL] Alert type:', alertType);
  console.log('[ALERT EMAIL] Location:', location);
  console.log('[ALERT EMAIL] Severity:', severity);
  console.log('[ALERT EMAIL] Timestamp:', timestamp.toISOString());
  console.log('[ALERT EMAIL] Resend configured:', isResendConfigured());
  console.log('[ALERT EMAIL] From address:', getResendFromAddress());
  logResendConfigOnce();

  try {
    const severityColor = severity === 'CRITICAL' ? '#dc2626' : severity === 'HIGH' ? '#ea580c' : '#f59e0b';

    const snapshotBlock = snapshotUrl
      ? `<div style="margin: 20px 0; text-align: center;">
           <img
             src="${snapshotUrl}"
             alt="Detection snapshot"
             style="max-width: 100%; border-radius: 8px; border: 2px solid ${severityColor};"
           />
           <p style="font-size: 12px; color: #6b7280; margin: 6px 0 0 0;">Frame captured at moment of detection</p>
         </div>`
      : '';

    const content = `
      <p><strong>A ${severity} safety alert has been detected at your worksite.</strong></p>
      <div class="info-box" style="border-left-color: ${severityColor}; background: ${severityColor}15;">
        <p style="margin: 0; font-size: 16px;"><strong>Alert Type:</strong> ${alertType}</p>
        <p style="margin: 10px 0 0 0;"><strong>Location:</strong> ${location}</p>
        <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
        <p style="margin: 10px 0 0 0;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${severity}</span></p>
      </div>
      ${snapshotBlock}
      <p>Please review this alert and take appropriate action immediately.</p>
    `;

    console.log('[ALERT EMAIL] Calling Resend...');
    const sendResult = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: `🚨 ${severity} Safety Alert: ${alertType}`,
      html: getEmailTemplate(
        'Safety Alert Notification',
        content,
        'View Alert Details',
        detailsUrl
      ),
    });

    if (!sendResult.success) {
      console.error('[ALERT EMAIL] ❌ Resend returned failure:', sendResult.error);
      return { success: false, error: sendResult.error };
    }

    console.log('[ALERT EMAIL] ✅ Email sent successfully! Resend id:', (sendResult as any).id);
    console.log('[ALERT EMAIL] ========================================');
    return { success: true };
  } catch (error: any) {
    console.error('[ALERT EMAIL] ❌ Exception sending alert email:', error.message);
    console.error('[ALERT EMAIL] Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<{ success: boolean; error?: string; errorDetails?: any }> {
  try {
    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] PASSWORD RESET EMAIL SEND ATTEMPT');
    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] Recipient email:', to);
    console.log('[EMAIL] Recipient name:', name);
    
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    
    const content = `
      <p>Hello ${name},</p>
      <p>We received a request to reset your password for your Nexxau account.</p>
      <div class="info-box">
        <p><strong>Security Notice:</strong></p>
        <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
      <p>To reset your password, click the button below. This link will expire in 1 hour.</p>
    `;

    console.log('[EMAIL] Attempting to send password reset via Resend...');
    const result = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: 'Reset Your Nexxau Password',
      html: getEmailTemplate(
        'Password Reset Request',
        content,
        'Reset Password',
        resetUrl
      ),
    });

    if (!result.success) {
      return { success: false, error: result.error, errorDetails: { message: result.error } };
    }

    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] ✅ PASSWORD RESET EMAIL SENT SUCCESSFULLY');
    console.log('[EMAIL] ========================================');
    console.log('[EMAIL] Resend id:', result.id);
    console.log('[EMAIL] Timestamp:', new Date().toISOString());

    return { success: true };
  } catch (error: any) {
    console.error('[EMAIL] ========================================');
    console.error('[EMAIL] ❌ PASSWORD RESET EMAIL SEND FAILED');
    console.error('[EMAIL] ========================================');
    console.error('[EMAIL] Recipient email:', to);
    console.error('[EMAIL] Error message:', error.message);
    console.error('[EMAIL] Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    return { 
      success: false, 
      error: error.message || 'Unknown error sending email',
      errorDetails: {
        code: error.code,
        command: error.command,
        response: error.response
      }
    };
  }
}

/**
 * Send welcome email after account creation
 */
export async function sendWelcomeEmail(
  to: string,
  name: string,
  companyName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const dashboardUrl = `${APP_URL}/dashboard`;
    
    const content = `
      <p>Welcome to Nexxau, ${name}!</p>
      <p>Your account has been successfully created for <strong>${companyName}</strong>.</p>
      <div class="info-box">
        <p><strong>Getting Started:</strong></p>
        <ul style="margin: 10px 0; padding-left: 20px;">
          <li>Explore your dashboard</li>
          <li>Set up camera feeds</li>
          <li>Configure custom alerts</li>
          <li>Invite team members</li>
        </ul>
      </div>
      <p>Our AI-powered safety monitoring system is ready to help you maintain a safer worksite.</p>
    `;

    const welcomeResult = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: `Welcome to Nexxau - ${companyName}`,
      html: getEmailTemplate(
        'Welcome to Nexxau!',
        content,
        'Go to Dashboard',
        dashboardUrl
      ),
    });

    if (!welcomeResult.success) {
      return { success: false, error: welcomeResult.error };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send daily compliance report email
 */
export async function sendComplianceReportEmail(
  to: string[],
  companyName: string,
  reportData: {
    date: Date;
    safetyScore: number;
    totalAlerts: number;
    criticalAlerts: number;
    resolvedAlerts: number;
    topViolations: string[];
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { date, safetyScore, totalAlerts, criticalAlerts, resolvedAlerts, topViolations } = reportData;
    const scoreColor = safetyScore >= 90 ? '#10b981' : safetyScore >= 70 ? '#f59e0b' : '#dc2626';
    
    const content = `
      <p>Here's your daily safety compliance report for <strong>${companyName}</strong>.</p>
      <div class="info-box">
        <h3 style="margin: 0 0 15px 0; color: #1e40af;">Daily Summary - ${date.toLocaleDateString()}</h3>
        <p style="margin: 5px 0;"><strong>Safety Score:</strong> <span style="color: ${scoreColor}; font-size: 24px; font-weight: bold;">${safetyScore}/100</span></p>
        <div class="divider"></div>
        <p style="margin: 10px 0;"><strong>Total Alerts:</strong> ${totalAlerts}</p>
        <p style="margin: 10px 0;"><strong>Critical Alerts:</strong> <span style="color: #dc2626;">${criticalAlerts}</span></p>
        <p style="margin: 10px 0;"><strong>Resolved Alerts:</strong> <span style="color: #10b981;">${resolvedAlerts}</span></p>
      </div>
      <h3>Top Violations:</h3>
      <ul>
        ${topViolations.map(v => `<li>${v}</li>`).join('')}
      </ul>
    `;

    const reportResult = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: `Daily Safety Report - ${companyName} - ${date.toLocaleDateString()}`,
      html: getEmailTemplate(
        'Daily Compliance Report',
        content,
        'View Full Report',
        `${APP_URL}/dashboard?tab=reports`
      ),
    });

    if (!reportResult.success) {
      return { success: false, error: reportResult.error };
    }
    return { success: true };
  } catch (error: any) {
    console.error('Error sending compliance report email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Test email configuration
 */
export async function testEmailConfiguration(): Promise<{ success: boolean; error?: string }> {
  if (!isResendConfigured()) {
    return { success: false, error: 'RESEND_API_KEY is not configured' };
  }
  return { success: true };
}

function escapeHtmlEmail(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Super Admin updated a user — detailed change list.
 */
export async function sendSuperAdminAccountChangeEmail(options: {
  to: string;
  recipientName: string | null;
  rows: { label: string; before: string; after: string }[];
}): Promise<{ success: boolean; error?: string }> {
  const { to, recipientName, rows } = options;
  if (!to?.trim()) {
    return { success: false, error: 'No recipient' };
  }
  try {
    const greeting = recipientName?.trim()
      ? `<p>Hello ${escapeHtmlEmail(recipientName.trim())},</p>`
      : '<p>Hello,</p>';
    const tableRows = rows
      .map(
        (r) => `
      <tr>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;font-weight:600;">${escapeHtmlEmail(r.label)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtmlEmail(r.before)}</td>
        <td style="padding:8px 12px;border:1px solid #e5e7eb;">${escapeHtmlEmail(r.after)}</td>
      </tr>`
      )
      .join('');
    const content = `
      ${greeting}
      <p>Your Nexxau account was updated by a platform administrator. Here are the details:</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px;margin:16px 0;font-size:14px;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Field</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">Before</th>
            <th style="padding:8px 12px;border:1px solid #e5e7eb;text-align:left;">After</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
      <div class="info-box">
        <p style="margin:0;"><strong>Didn't expect this?</strong> Contact your administrator or Nexxau support if these changes look wrong.</p>
      </div>
    `;

    const r = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: 'Your account was updated',
      html: getEmailTemplate('Account updated', content, 'Sign in', `${APP_URL}/login`),
    });
    if (!r.success) return { success: false, error: r.error };
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMAIL] Super Admin account change email failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Sent to the *previous* address when login email is changed (security).
 */
export async function sendSuperAdminEmailChangedAlertToOldAddress(options: {
  to: string;
  newEmail: string;
  recipientName: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const { to, newEmail, recipientName } = options;
  if (!to?.trim()) return { success: false, error: 'No recipient' };
  try {
    const greeting = recipientName?.trim()
      ? `<p>Hello ${escapeHtmlEmail(recipientName.trim())},</p>`
      : '<p>Hello,</p>';
    const content = `
      ${greeting}
      <p><strong>The login email address on your Nexxau account was changed.</strong></p>
      <div class="info-box">
        <p style="margin:0 0 8px 0;"><strong>New email:</strong> ${escapeHtmlEmail(newEmail)}</p>
        <p style="margin:0;">If you did not request this change, contact support immediately.</p>
      </div>
    `;
    const r = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: 'Security notice: your login email was changed',
      html: getEmailTemplate('Email address changed', content, 'Sign in', `${APP_URL}/login`),
    });
    if (!r.success) return { success: false, error: r.error };
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMAIL] Old-address email change alert failed:', message);
    return { success: false, error: message };
  }
}

export async function sendSuperAdminAccountRemovedEmail(options: {
  to: string;
  recipientName: string | null;
}): Promise<{ success: boolean; error?: string }> {
  const { to, recipientName } = options;
  if (!to?.trim()) return { success: false, error: 'No recipient' };
  try {
    const greeting = recipientName?.trim()
      ? `<p>Hello ${escapeHtmlEmail(recipientName.trim())},</p>`
      : '<p>Hello,</p>';
    const content = `
      ${greeting}
      <p>Your Nexxau account has been <strong>removed</strong> by a platform administrator.</p>
      <p>You will no longer be able to sign in with this account.</p>
      <div class="info-box">
        <p style="margin:0;">If you believe this was a mistake, contact your organization or Nexxau support.</p>
      </div>
    `;
    const r = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: 'Your account has been removed',
      html: getEmailTemplate('Account removed', content, 'Visit Nexxau', APP_URL),
    });
    if (!r.success) return { success: false, error: r.error };
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMAIL] Account removed email failed:', message);
    return { success: false, error: message };
  }
}

export async function sendSuperAdminWorksiteAccessEmail(options: {
  to: string;
  recipientName: string | null;
  summaryLines: string[];
}): Promise<{ success: boolean; error?: string }> {
  const { to, recipientName, summaryLines } = options;
  if (!to?.trim()) return { success: false, error: 'No recipient' };
  try {
    const greeting = recipientName?.trim()
      ? `<p>Hello ${escapeHtmlEmail(recipientName.trim())},</p>`
      : '<p>Hello,</p>';
    const list = summaryLines.map((line) => `<li>${escapeHtmlEmail(line)}</li>`).join('');
    const content = `
      ${greeting}
      <p>A platform administrator updated your worksite access:</p>
      <ul style="margin:12px 0;padding-left:20px;">${list}</ul>
      <div class="info-box">
        <p style="margin:0;">If this doesn't look right, contact your administrator.</p>
      </div>
    `;
    const r = await sendResendHtml({
      from: getResendFromAddress(),
      to,
      subject: 'Your worksite access was updated',
      html: getEmailTemplate('Worksite access updated', content, 'Sign in', `${APP_URL}/login`),
    });
    if (!r.success) return { success: false, error: r.error };
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMAIL] Worksite access email failed:', message);
    return { success: false, error: message };
  }
}

/**
 * Notify company admins that a new user has claimed their invite and is waiting for approval.
 * Called after /api/invitations/claim succeeds.
 */
export async function sendPendingApprovalNotification(options: {
  adminEmail: string;
  adminName: string | null;
  newUserName: string;
  newUserEmail: string;
  newUserRole: string;
  companyName: string;
}): Promise<{ success: boolean; error?: string }> {
  const { adminEmail, adminName, newUserName, newUserEmail, newUserRole, companyName } = options;
  if (!adminEmail?.trim()) return { success: false, error: 'No recipient' };

  const approveUrl = `${APP_URL}/admin/users`;
  const greeting = adminName?.trim()
    ? `<p>Hello ${escapeHtmlEmail(adminName.trim())},</p>`
    : '<p>Hello,</p>';

  const content = `
    ${greeting}
    <p>A new team member has accepted their invitation and is waiting for you to approve their account.</p>
    <div class="info-box">
      <p style="margin:0 0 6px 0;"><strong>Name:</strong> ${escapeHtmlEmail(newUserName)}</p>
      <p style="margin:0 0 6px 0;"><strong>Email:</strong> ${escapeHtmlEmail(newUserEmail)}</p>
      <p style="margin:0 0 6px 0;"><strong>Role:</strong> ${escapeHtmlEmail(newUserRole)}</p>
      <p style="margin:0;"><strong>Company:</strong> ${escapeHtmlEmail(companyName)}</p>
    </div>
    <p>Head to the Users section to approve their access so they can start using Nexxau.</p>
  `;

  try {
    const r = await sendResendHtml({
      from: getResendFromAddress(),
      to: adminEmail,
      subject: `Action required: ${escapeHtmlEmail(newUserName)} is waiting for approval`,
      html: getEmailTemplate(
        'New user awaiting approval',
        content,
        'Review & Approve',
        approveUrl
      ),
    });
    if (!r.success) return { success: false, error: r.error };
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[EMAIL] Pending approval notification failed:', message);
    return { success: false, error: message };
  }
}


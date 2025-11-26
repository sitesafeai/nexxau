/**
 * Email Service
 * Handles all email sending functionality for the application
 */

import nodemailer from 'nodemailer';

// Email configuration from environment variables
const EMAIL_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
};

const FROM_EMAIL = process.env.FROM_EMAIL || 'sitesafeai@gmail.com';
const FROM_NAME = process.env.FROM_NAME || 'SiteSafe';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// Create reusable transporter
let transporter: nodemailer.Transporter | null = null;

const getTransporter = () => {
  if (!transporter) {
    // Log configuration (without password) for debugging
    console.log('[email-service] Initializing transporter with:', {
      host: EMAIL_CONFIG.host,
      port: EMAIL_CONFIG.port,
      secure: EMAIL_CONFIG.secure,
      user: EMAIL_CONFIG.auth.user,
      hasPassword: !!EMAIL_CONFIG.auth.pass,
    });

    if (!EMAIL_CONFIG.auth.user || !EMAIL_CONFIG.auth.pass) {
      console.error('[email-service] Missing SMTP credentials!');
      console.error('[email-service] SMTP_USER:', EMAIL_CONFIG.auth.user ? 'Set' : 'MISSING');
      console.error('[email-service] SMTP_PASSWORD:', EMAIL_CONFIG.auth.pass ? 'Set' : 'MISSING');
      throw new Error('SMTP credentials not configured. Please set SMTP_USER and SMTP_PASSWORD in .env');
    }

    transporter = nodemailer.createTransport(EMAIL_CONFIG);
  }
  return transporter;
};

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
      <h1 class="logo">🛡️ SiteSafe</h1>
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
      <p>© ${new Date().getFullYear()} SiteSafe. All rights reserved.</p>
      <p>AI-Powered Construction Safety Monitoring</p>
    </div>
  </div>
</body>
</html>
`;

// Email sending functions

/**
 * Send account invitation email
 */
export async function sendInvitationEmail(
  to: string,
  inviterName: string,
  role: string,
  companyName: string,
  token: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('[email-service] Sending invitation email to:', to);
    console.log('[email-service] From:', FROM_EMAIL);
    
    const inviteUrl = `${APP_URL}/auth/claim-account?token=${token}`;
    
    const content = `
      <p>Hello!</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${companyName}</strong> on SiteSafe as a <strong>${role}</strong>.</p>
      <div class="info-box">
        <p><strong>What's Next?</strong></p>
        <p>Click the button below to create your account and set your password. This link will expire in 7 days.</p>
      </div>
      <p>Once you've claimed your account, you'll have access to:</p>
      <ul>
        <li>Real-time safety monitoring dashboards</li>
        <li>AI-powered violation detection</li>
        <li>Compliance reporting and analytics</li>
        <li>Team collaboration tools</li>
      </ul>
    `;

    const mailOptions = {
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: `You've been invited to join ${companyName} on SiteSafe`,
      html: getEmailTemplate(
        `Welcome to ${companyName}`,
        content,
        'Claim Your Account',
        inviteUrl
      ),
    };

    console.log('[email-service] Mail options:', {
      from: mailOptions.from,
      to: mailOptions.to,
      subject: mailOptions.subject,
    });

    const result = await getTransporter().sendMail(mailOptions);
    console.log('[email-service] ✅ Email sent successfully! MessageId:', result.messageId);

    return { success: true };
  } catch (error: any) {
    console.error('[email-service] ❌ Error sending invitation email:', error);
    console.error('[email-service] Error details:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    return { success: false, error: error.message || 'Unknown error sending email' };
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
  detailsUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const severityColor = severity === 'CRITICAL' ? '#dc2626' : severity === 'HIGH' ? '#ea580c' : '#f59e0b';
    
    const content = `
      <p><strong>A ${severity} safety alert has been detected at your worksite.</strong></p>
      <div class="info-box" style="border-left-color: ${severityColor}; background: ${severityColor}15;">
        <p style="margin: 0; font-size: 16px;"><strong>Alert Type:</strong> ${alertType}</p>
        <p style="margin: 10px 0 0 0;"><strong>Location:</strong> ${location}</p>
        <p style="margin: 10px 0 0 0;"><strong>Time:</strong> ${timestamp.toLocaleString()}</p>
        <p style="margin: 10px 0 0 0;"><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${severity}</span></p>
      </div>
      <p>Please review this alert and take appropriate action immediately.</p>
    `;

    await getTransporter().sendMail({
      from: `"${FROM_NAME} Alerts" <${FROM_EMAIL}>`,
      to: to.join(', '),
      subject: `🚨 ${severity} Safety Alert: ${alertType}`,
      html: getEmailTemplate(
        'Safety Alert Notification',
        content,
        'View Alert Details',
        detailsUrl
      ),
      priority: severity === 'CRITICAL' ? 'high' : 'normal',
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending alert notification email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}`;
    
    const content = `
      <p>We received a request to reset your password for your SiteSafe account.</p>
      <div class="info-box">
        <p><strong>Security Notice:</strong></p>
        <p>If you didn't request this password reset, please ignore this email. Your password will remain unchanged.</p>
      </div>
      <p>To reset your password, click the button below. This link will expire in 1 hour.</p>
    `;

    await getTransporter().sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: 'Reset Your SiteSafe Password',
      html: getEmailTemplate(
        'Password Reset Request',
        content,
        'Reset Password',
        resetUrl
      ),
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    return { success: false, error: error.message };
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
      <p>Welcome to SiteSafe, ${name}!</p>
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

    await getTransporter().sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to,
      subject: `Welcome to SiteSafe - ${companyName}`,
      html: getEmailTemplate(
        'Welcome to SiteSafe! 🎉',
        content,
        'Go to Dashboard',
        dashboardUrl
      ),
    });

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

    await getTransporter().sendMail({
      from: `"${FROM_NAME} Reports" <${FROM_EMAIL}>`,
      to: to.join(', '),
      subject: `Daily Safety Report - ${companyName} - ${date.toLocaleDateString()}`,
      html: getEmailTemplate(
        'Daily Compliance Report',
        content,
        'View Full Report',
        `${APP_URL}/dashboard?tab=reports`
      ),
    });

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
  try {
    await getTransporter().verify();
    return { success: true };
  } catch (error: any) {
    console.error('Email configuration test failed:', error);
    return { success: false, error: error.message };
  }
}


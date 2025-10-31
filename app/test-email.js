/**
 * Quick Email Test Script
 * Tests your SMTP configuration
 */

const nodemailer = require('nodemailer');
const fs = require('fs');

// Load .env.local first (higher priority), then .env
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

// Also check which files exist
console.log('📁 Environment files found:');
console.log('  .env:', fs.existsSync('.env') ? '✅' : '❌');
console.log('  .env.local:', fs.existsSync('.env.local') ? '✅' : '❌');
console.log('');

async function testEmail() {
  console.log('🧪 Testing SiteSafe Email Configuration...\n');
  
  // Debug: Show ALL env vars that contain SMTP or EMAIL
  console.log('🔍 Debug: All email-related environment variables:');
  Object.keys(process.env)
    .filter(key => key.includes('SMTP') || key.includes('EMAIL') || key.includes('FROM'))
    .forEach(key => {
      const value = process.env[key];
      const display = key.includes('PASSWORD') && value ? '***' + value.slice(-4) : value;
      console.log(`  ${key}:`, display);
    });
  console.log('');
  
  // Show config (hide password)
  console.log('📋 Configuration:');
  console.log('  SMTP Host:', process.env.SMTP_HOST);
  console.log('  SMTP Port:', process.env.SMTP_PORT);
  console.log('  SMTP User:', process.env.SMTP_USER);
  console.log('  SMTP Pass:', process.env.SMTP_PASSWORD ? '***' + process.env.SMTP_PASSWORD.slice(-4) : 'NOT SET');
  console.log('  From Email:', process.env.FROM_EMAIL);
  console.log('  From Name:', process.env.FROM_NAME);
  console.log('');

  // Check if required vars are set
  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('❌ Error: SMTP_USER and SMTP_PASSWORD must be set in .env file');
    process.exit(1);
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  console.log('🔌 Step 1: Testing SMTP connection...');
  
  try {
    await transporter.verify();
    console.log('✅ Connection successful!\n');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.log('\n💡 Common fixes:');
    console.log('  - For Gmail: Use App Password (not regular password)');
    console.log('  - Enable 2FA first, then generate App Password');
    console.log('  - Check SMTP_HOST and SMTP_PORT are correct');
    console.log('  - Verify firewall isn\'t blocking the connection\n');
    process.exit(1);
  }

  console.log('📧 Step 2: Sending test email...');
  console.log(`  To: ${process.env.SMTP_USER}\n`);

  try {
    const info = await transporter.sendMail({
      from: `"${process.env.FROM_NAME || 'SiteSafe'}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: '🎉 SiteSafe Email System Test - SUCCESS!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background: #f4f4f4; }
            .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
            .header { background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 30px; text-align: center; }
            .logo { font-size: 32px; font-weight: bold; color: white; margin: 0; }
            .content { padding: 40px 30px; }
            .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 4px; margin: 20px 0; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 14px; color: #6b7280; }
            .check { font-size: 48px; color: #10b981; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 class="logo">🛡️ SiteSafe</h1>
            </div>
            <div class="content">
              <div style="text-align: center; margin: 20px 0;">
                <div class="check">✅</div>
              </div>
              <h1 style="color: #1e40af; text-align: center;">Email System is Working!</h1>
              <div class="success-box">
                <p style="margin: 0; font-weight: bold;">🎉 Congratulations!</p>
                <p style="margin: 10px 0 0 0;">Your SiteSafe email system is configured correctly and ready to send emails.</p>
              </div>
              <h3 style="color: #1e40af;">What's Next?</h3>
              <ul style="line-height: 1.8;">
                <li><strong>Invite Users:</strong> Send account invitations through the UI</li>
                <li><strong>Safety Alerts:</strong> AI will email when violations are detected</li>
                <li><strong>Daily Reports:</strong> Schedule automated compliance reports</li>
                <li><strong>Password Resets:</strong> Users can recover their accounts</li>
              </ul>
              <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
                <strong>Test Details:</strong><br>
                Sent from: ${process.env.FROM_EMAIL || process.env.SMTP_USER}<br>
                SMTP Server: ${process.env.SMTP_HOST}<br>
                Time: ${new Date().toLocaleString()}
              </p>
            </div>
            <div class="footer">
              <p>© ${new Date().getFullYear()} SiteSafe. All rights reserved.</p>
              <p>AI-Powered Construction Safety Monitoring</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log('✅ Test email sent successfully!\n');
    console.log('📬 Message Details:');
    console.log('  Message ID:', info.messageId);
    console.log('  Response:', info.response);
    console.log('\n💡 Check your inbox at:', process.env.SMTP_USER);
    console.log('   (Check spam folder if not in inbox)\n');
    console.log('🎉 Email system is ready to use!\n');
    
  } catch (error) {
    console.error('❌ Failed to send email:', error.message);
    console.log('\n💡 Possible issues:');
    console.log('  - SMTP credentials might be incorrect');
    console.log('  - Email provider might be blocking the connection');
    console.log('  - Check firewall settings\n');
    process.exit(1);
  }
}

// Run the test
testEmail().catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});


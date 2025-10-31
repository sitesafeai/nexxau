# Email System Setup Guide

## 📧 Overview

SiteSafe now has a complete email system for:
- **User Invitations**: Send account creation links
- **Safety Alerts**: Notify teams of critical violations
- **Password Reset**: Secure password recovery
- **Welcome Emails**: Onboard new users
- **Compliance Reports**: Daily/weekly safety summaries

---

## 🚀 Quick Setup

### Step 1: Install Dependencies

```bash
cd /Users/luizcarneiro/nexxau/app
npm install nodemailer @types/nodemailer
```

If you get a permission error, run:
```bash
sudo chown -R $(whoami) "/Users/luizcarneiro/.npm"
npm install nodemailer @types/nodemailer
```

### Step 2: Configure Environment Variables

Add these to your `/Users/luizcarneiro/nexxau/app/.env` file:

```env
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Email Sender Info
FROM_EMAIL=noreply@sitesafe.ai
FROM_NAME=SiteSafe

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3005
```

---

## 📮 Email Provider Options

### Option 1: Gmail (Easiest for Testing)

1. **Enable 2-Factor Authentication** on your Google account
2. **Generate an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "SiteSafe"
   - Copy the 16-character password

3. **Update .env**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-gmail@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App password from step 2
FROM_EMAIL=your-gmail@gmail.com
FROM_NAME=SiteSafe
```

### Option 2: SendGrid (Production Recommended)

1. Sign up at https://sendgrid.com/
2. Create an API key
3. Update .env:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
FROM_EMAIL=noreply@yourdomain.com
FROM_NAME=SiteSafe
```

### Option 3: Resend (Modern Alternative)

1. Sign up at https://resend.com/
2. Get your API key
3. Install: `npm install resend`
4. Update email service to use Resend API

### Option 4: AWS SES (Enterprise)

```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-ses-smtp-username
SMTP_PASSWORD=your-ses-smtp-password
FROM_EMAIL=noreply@yourdomain.com
```

---

## 🧪 Testing

### Test Email Configuration

Create `/Users/luizcarneiro/nexxau/app/test-email.ts`:

```typescript
import { testEmailConfiguration, sendWelcomeEmail } from './app/lib/email-service';

async function test() {
  console.log('🧪 Testing email configuration...');
  
  // Test SMTP connection
  const configTest = await testEmailConfiguration();
  console.log('Config test:', configTest);
  
  if (configTest.success) {
    // Send a test email
    const result = await sendWelcomeEmail(
      'your-test-email@gmail.com',
      'Test User',
      'ABC Construction'
    );
    console.log('Welcome email test:', result);
  }
}

test();
```

Run it:
```bash
cd /Users/luizcarneiro/nexxau/app
npx tsx test-email.ts
```

---

## 📝 Usage Examples

### Send Invitation Email

```typescript
import { sendInvitationEmail } from '@/app/lib/email-service';

const result = await sendInvitationEmail(
  'worker@example.com',
  'John Smith', // Inviter name
  'SITE_ADMIN', // Role
  'ABC Construction', // Company name
  'invitation-token-here' // Invitation token
);
```

### Send Safety Alert Email

```typescript
import { sendAlertNotificationEmail } from '@/app/lib/email-service';

const result = await sendAlertNotificationEmail(
  ['admin@company.com', 'safety@company.com'], // Recipients
  'Missing Hardhat Detected', // Alert type
  'Zone A - North Entrance', // Location
  'HIGH', // Severity
  new Date(), // Timestamp
  'http://localhost:3005/dashboard/alerts/alert-id' // Details URL
);
```

### Send Daily Report

```typescript
import { sendComplianceReportEmail } from '@/app/lib/email-service';

const result = await sendComplianceReportEmail(
  ['manager@company.com'],
  'ABC Construction',
  {
    date: new Date(),
    safetyScore: 87,
    totalAlerts: 23,
    criticalAlerts: 2,
    resolvedAlerts: 18,
    topViolations: [
      'Missing Hardhat (8 instances)',
      'No Safety Vest (5 instances)',
      'Restricted Zone Entry (3 instances)'
    ]
  }
);
```

---

## 🔗 Integration Points

### 1. User Invitation (Already Integrated)

File: `/api/invitations/send/route.ts`

The invitation email is sent automatically when creating a new user invite.

### 2. Custom Alert Triggers

Update `/ai-detection/detection_service.py` to call your email API when alerts are triggered:

```python
# In trigger_alert function
if 'email' in alert_actions:
    requests.post(
        'http://localhost:3005/api/send-alert-email',
        json={
            'recipients': rule['emailRecipients'],
            'alertType': rule['name'],
            'location': camera_name,
            'severity': rule['severity']
        }
    )
```

### 3. Scheduled Reports

Create a cron job or scheduled task:

```typescript
// app/api/cron/daily-report/route.ts
export async function GET(request: NextRequest) {
  // Get all companies
  const companies = await prisma.company.findMany({
    where: { contactEmail: { not: null } }
  });
  
  for (const company of companies) {
    // Generate report data
    const reportData = await generateDailyReport(company.id);
    
    // Send email
    await sendComplianceReportEmail(
      [company.contactEmail!],
      company.name,
      reportData
    );
  }
  
  return NextResponse.json({ success: true });
}
```

---

## 🎨 Email Templates

All emails use a beautiful, responsive HTML template with:
- ✅ Mobile-friendly design
- ✅ SiteSafe branding
- ✅ Call-to-action buttons
- ✅ Professional styling
- ✅ Consistent formatting

Templates are in `/app/lib/email-service.ts` under `getEmailTemplate()`.

---

## 🔒 Security Best Practices

1. **Never commit credentials**: Keep `.env` out of git
2. **Use App Passwords**: Don't use your main email password
3. **Rate Limiting**: Implement email rate limits to prevent abuse
4. **Validate Recipients**: Always validate email addresses before sending
5. **SPF/DKIM**: Configure for production domains
6. **Unsubscribe Links**: Add for marketing emails (not required for transactional)

---

## 🐛 Troubleshooting

### "Authentication failed"
- Check SMTP credentials
- For Gmail: Ensure 2FA is enabled and using App Password
- Verify SMTP_HOST and SMTP_PORT are correct

### "Connection timeout"
- Check firewall settings
- Try different SMTP_PORT (465 for secure, 587 for TLS)
- Ensure SMTP_SECURE matches port (true for 465)

### "Emails not arriving"
- Check spam folder
- Verify FROM_EMAIL is valid
- Check email provider's sending limits
- Look at Node.js console for errors

### "Module not found: nodemailer"
- Run: `npm install nodemailer @types/nodemailer`
- Restart Next.js server

---

## 📊 Production Checklist

- [ ] Install nodemailer
- [ ] Configure SMTP credentials
- [ ] Test email sending
- [ ] Set up custom domain email (e.g., noreply@yourdomain.com)
- [ ] Configure SPF/DKIM records
- [ ] Implement email logging/tracking
- [ ] Add rate limiting
- [ ] Monitor bounce rates
- [ ] Set up email queue for high volume
- [ ] Add retry logic for failed sends

---

## 🚀 Next Steps

1. **Install dependencies** (see Step 1 above)
2. **Configure Gmail** (easiest for now)
3. **Test the system** with test-email.ts
4. **Integrate with alerts** (update AI service)
5. **Schedule reports** (add cron job)
6. **Go to production** (switch to SendGrid/SES)

---

**Ready to send emails!** 📧✨


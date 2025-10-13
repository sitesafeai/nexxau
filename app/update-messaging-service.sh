#!/bin/bash

# Update Twilio Configuration with MessagingServiceSid
echo "🔧 Updating Twilio configuration with MessagingServiceSid..."

# Update .env.local with MessagingServiceSid
cat > .env.local << EOF
# Twilio SMS Configuration - WITH MESSAGING SERVICE
TWILIO_ACCOUNT_SID=REDACTED
TWILIO_AUTH_TOKEN=REDACTED
TWILIO_FROM_NUMBER=+18337625910
TWILIO_MESSAGING_SERVICE_SID=REDACTED

# SMS Settings
SMS_ENABLED=true
SMS_RETRY_ATTEMPTS=3
SMS_COOLDOWN_MINUTES=15

# Safety Violation Settings
SAFETY_VIOLATION_SMS_ENABLED=true
CRITICAL_VIOLATION_SMS_IMMEDIATE=true
HIGH_VIOLATION_SMS_DELAY_MINUTES=0
MEDIUM_VIOLATION_SMS_DELAY_MINUTES=5
LOW_VIOLATION_SMS_DELAY_MINUTES=15

# Emergency Contact Settings
EMERGENCY_CONTACT_PRIORITY=1
DEFAULT_SMS_RECIPIENTS=+18337625910

# SMS Templates
SMS_CRITICAL_VIOLATION_TEMPLATE=🚨 CRITICAL SAFETY VIOLATION ALERT 🔴
SMS_HIGH_VIOLATION_TEMPLATE=⚠️ HIGH PRIORITY SAFETY VIOLATION 🟠
SMS_MEDIUM_VIOLATION_TEMPLATE=⚠️ SAFETY VIOLATION DETECTED 🟡
SMS_LOW_VIOLATION_TEMPLATE=ℹ️ SAFETY NOTICE 🟢

# Webhook URLs for SMS status callbacks
SMS_STATUS_CALLBACK_URL=http://localhost:3000/api/sms/status-callback

# Rate Limiting
SMS_RATE_LIMIT_PER_HOUR=100
SMS_RATE_LIMIT_PER_DAY=1000

# Emergency Escalation
EMERGENCY_ESCALATION_ENABLED=true
EMERGENCY_ESCALATION_DELAY_MINUTES=10
EMERGENCY_ESCALATION_RECIPIENTS=+18337625910

# Testing
SMS_TEST_MODE=false
SMS_TEST_RECIPIENTS=+18337625910
EOF

echo "✅ Twilio configuration updated with MessagingServiceSid!"
echo "📱 Configuration Details:"
echo "   🔢 From Number: +18337625910"
echo "   🆔 Account SID: REDACTED"
echo "   🔑 Auth Token: REDACTED"
echo "   📨 MessagingServiceSid: REDACTED"
echo ""
echo "🚀 Next steps:"
echo "1. Restart your Next.js application"
echo "2. Test SMS notifications with safety violations"
echo "3. Monitor SMS delivery status"
echo ""
echo "📞 Test SMS by visiting: http://localhost:3000/dashboard/sms-notifications"

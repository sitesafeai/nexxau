#!/bin/bash

echo "📧 Adding email configuration to .env..."
echo ""

# Backup current .env
cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
echo "✅ Backed up .env"

# Add email variables
cat >> .env << 'EOF'

# ============================================
# EMAIL CONFIGURATION (Added by add-email-vars.sh)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=REPLACE_WITH_YOUR_GMAIL@gmail.com
SMTP_PASSWORD=REPLACE_WITH_APP_PASSWORD
FROM_EMAIL=REPLACE_WITH_YOUR_GMAIL@gmail.com
FROM_NAME=SiteSafe
NEXT_PUBLIC_APP_URL=http://localhost:3005
EOF

echo "✅ Added email variables to .env"
echo ""
echo "⚠️  IMPORTANT: You MUST edit .env and replace:"
echo "   REPLACE_WITH_YOUR_GMAIL@gmail.com  →  your actual Gmail"
echo "   REPLACE_WITH_APP_PASSWORD          →  your Gmail App Password"
echo ""
echo "📖 How to get App Password:"
echo "   1. Visit: https://myaccount.google.com/apppasswords"
echo "   2. Create password for: Mail / Other (SiteSafe)"
echo "   3. Copy the 16-character code"
echo ""
echo "After editing .env, test with: node test-email.js"


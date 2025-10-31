#!/bin/bash

echo "🔧 Fixing email configuration in .env..."

# Create a temporary file with the corrected config
cat > /tmp/email-config.txt << 'EOF'

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sitesafeai@gmail.com
SMTP_PASSWORD=hxsbnodvjmprcztc
FROM_EMAIL=sitesafeai@gmail.com
FROM_NAME=SiteSafe
NEXT_PUBLIC_APP_URL=http://localhost:3005
EOF

# Remove old email config if exists
sed -i '' '/^SMTP_HOST=/d' .env
sed -i '' '/^SMTP_PORT=/d' .env
sed -i '' '/^SMTP_SECURE=/d' .env
sed -i '' '/^SMTP_USER=/d' .env
sed -i '' '/^SMTP_PASSWORD=/d' .env
sed -i '' '/^FROM_EMAIL=/d' .env
sed -i '' '/^FROM_NAME=/d' .env
sed -i '' '/^NEXT_PUBLIC_APP_URL=/d' .env

# Append corrected config
cat /tmp/email-config.txt >> .env

echo "✅ Fixed email configuration:"
echo "   - Removed spaces from App Password"
echo "   - Added NEXT_PUBLIC_APP_URL"
echo ""
echo "🧪 Testing now..."
node test-email.js


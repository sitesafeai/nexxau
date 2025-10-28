#!/bin/bash

echo "🔧 Fixing Supabase Database Connection..."
echo ""

# Backup current .env
echo "📦 Backing up current .env to .env.backup..."
cp .env .env.backup

# Apply the fix
echo "✍️  Updating .env with direct connection..."
cat > .env << 'EOF'
# Fixed Database URLs - Using Supabase Direct Connection
# This bypasses the pooler to avoid TLS certificate issues
DATABASE_URL="postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=require"

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=REDACTED=
EOF

echo "✅ .env updated"
echo ""

# Regenerate Prisma Client
echo "🔄 Regenerating Prisma Client..."
npx prisma generate

echo ""
echo "🚀 Testing database connection..."
npx prisma db push --skip-generate

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ SUCCESS! Database connection is working!"
    echo ""
    echo "Next steps:"
    echo "1. Run: npx tsx scripts/seed-worksites.ts"
    echo "2. Run: npx tsx scripts/seed-cameras.ts"
    echo "3. Start your app: npm run dev"
    echo "4. Visit: http://localhost:3000/dashboard/analytics"
    echo ""
else
    echo ""
    echo "❌ Connection still failing. Try these alternatives:"
    echo ""
    echo "Option 1 - Disable SSL (dev only):"
    echo 'DATABASE_URL="postgresql://postgres:REDACTED@db.REDACTED.supabase.co:5432/postgres?sslmode=disable"'
    echo ""
    echo "Option 2 - Check Supabase Dashboard:"
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your project"
    echo "3. Settings → Database → Connection String"
    echo "4. Copy the correct connection string"
    echo ""
    echo "Restoring backup..."
    cp .env.backup .env
fi


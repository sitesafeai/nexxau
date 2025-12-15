#!/bin/bash
# Restart script for Next.js dev server with Prisma client refresh

echo "🔄 Restarting server with fresh Prisma client..."

# Kill any running Next.js processes
echo "1. Stopping existing server..."
pkill -f "next dev" 2>/dev/null || echo "   No server running"

# Clear Next.js cache
echo "2. Clearing Next.js cache..."
rm -rf .next

# Regenerate Prisma client
echo "3. Regenerating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma > /dev/null 2>&1

echo "✅ Ready to start server!"
echo ""
echo "Now run: npm run dev"

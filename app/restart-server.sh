#!/bin/bash

echo "🔄 Restarting SiteSafe Development Server..."
echo ""

# Find and kill existing Next.js processes
echo "🛑 Stopping existing server..."
pkill -f "next dev" 2>/dev/null || echo "  No existing server found"
pkill -f "node.*next" 2>/dev/null

# Wait a moment
sleep 2

echo ""
echo "🧹 Clearing Next.js cache..."
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "🔧 Regenerating Prisma Client..."
npx prisma generate

echo ""
echo "🚀 Starting server on http://localhost:3001..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Server will start below. Press Ctrl+C to stop."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Start the dev server
npm run dev


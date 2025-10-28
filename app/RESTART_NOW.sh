#!/bin/bash

echo "🛑 Stopping server..."
pkill -9 node 2>/dev/null

echo "⏳ Waiting..."
sleep 3

echo "🔧 Increasing file limit..."
ulimit -n 65536

echo "🧹 Cleaning cache..."
rm -rf .next
rm -rf node_modules/.cache 2>/dev/null

echo "⚙️  Regenerating Prisma..."
npx prisma generate

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Starting server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Server will start below."
echo "After you see '✓ Ready in Xs', open:"
echo "http://localhost:3001/dashboard"
echo ""
echo "Press Ctrl+C to stop the server."
echo ""

npm run dev


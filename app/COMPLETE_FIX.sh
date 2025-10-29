#!/bin/bash

echo "🚨 COMPLETE FIX - This will restart everything properly"
echo ""

# Step 1: Kill ALL node processes
echo "1️⃣ Stopping all Node processes..."
killall -9 node 2>/dev/null || echo "   No node processes found"
sleep 2

# Step 2: Increase file limit
echo ""
echo "2️⃣ Increasing file descriptor limit..."
ulimit -n 65536
echo "   New limit: $(ulimit -n)"

# Step 3: Clean EVERYTHING
echo ""
echo "3️⃣ Cleaning all caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .turbo
echo "   ✅ Caches cleared"

# Step 4: Regenerate Prisma
echo ""
echo "4️⃣ Regenerating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "   ❌ Prisma generate failed!"
    exit 1
fi

echo "   ✅ Prisma Client generated"

# Step 5: Test Prisma connection
echo ""
echo "5️⃣ Testing database connection..."
node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.company.count()
  .then(count => {
    console.log('   ✅ Database connected! Companies:', count);
    process.exit(0);
  })
  .catch(err => {
    console.error('   ❌ Database error:', err.message);
    process.exit(1);
  });
"

if [ $? -ne 0 ]; then
    echo "   ❌ Database connection failed!"
    echo ""
    echo "   Check your .env file and run:"
    echo "   cat .env"
    exit 1
fi

# Step 6: Start server
echo ""
echo "6️⃣ Starting development server..."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Server starting below"
echo "  Wait for: ✓ Ready in Xs"
echo "  Then open: http://localhost:3001/dashboard"
echo ""
echo "  Press Ctrl+C to stop"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

npm run dev


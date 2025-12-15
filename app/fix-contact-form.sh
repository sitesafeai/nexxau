#!/bin/bash
# Complete fix for ContactInquiry table issue

echo "🔧 Fixing ContactInquiry table issue..."
echo ""

# 1. Kill server
echo "1. Stopping server..."
pkill -9 -f "next dev" 2>/dev/null || echo "   No server running"
sleep 1

# 2. Clear all caches
echo "2. Clearing caches..."
rm -rf .next
rm -rf node_modules/.prisma
rm -rf .next/cache 2>/dev/null

# 3. Regenerate Prisma client
echo "3. Regenerating Prisma client..."
npx prisma generate --schema=prisma/schema.prisma > /dev/null 2>&1

# 4. Verify table exists
echo "4. Verifying table exists..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.\$queryRawUnsafe(\`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ContactInquiry';\`)
  .then(r => {
    if (r.length > 0) {
      console.log('   ✅ ContactInquiry table exists');
      process.exit(0);
    } else {
      console.log('   ❌ Table missing - creating...');
      return p.\$executeRawUnsafe(\`
        CREATE TABLE \"ContactInquiry\" (
          \"id\" TEXT NOT NULL PRIMARY KEY,
          \"name\" TEXT NOT NULL,
          \"email\" TEXT NOT NULL,
          \"company\" TEXT,
          \"industry\" TEXT,
          \"message\" TEXT NOT NULL,
          \"sourcePage\" TEXT,
          \"status\" TEXT NOT NULL DEFAULT 'UNREAD',
          \"isRead\" BOOLEAN NOT NULL DEFAULT false,
          \"repliedAt\" TIMESTAMP(3),
          \"resolvedAt\" TIMESTAMP(3),
          \"notes\" TEXT,
          \"assignedTo\" TEXT,
          \"createdAt\" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          \"updatedAt\" TIMESTAMP(3) NOT NULL
        );
      \`);
    }
  })
  .then(() => {
    console.log('   ✅ Table created');
    process.exit(0);
  })
  .catch(e => {
    if (e.code === '42P07') {
      console.log('   ✅ Table already exists');
      process.exit(0);
    }
    console.error('   ❌ Error:', e.message);
    process.exit(1);
  });
" || echo "   ⚠️  Could not verify table"

# 5. Test Prisma client
echo "5. Testing Prisma client..."
node -e "
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.contactInquiry.findMany({ take: 1 })
  .then(() => {
    console.log('   ✅ Prisma client works');
    process.exit(0);
  })
  .catch(e => {
    console.error('   ❌ Prisma client error:', e.message);
    process.exit(1);
  });
" || echo "   ⚠️  Prisma client test failed"

echo ""
echo "✅ Setup complete!"
echo ""
echo "🚀 Now start your server:"
echo "   npm run dev"
echo ""

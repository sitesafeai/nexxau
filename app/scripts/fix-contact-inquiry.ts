/**
 * Complete fix for ContactInquiry table - ensures table exists and Prisma knows about it
 * Run: npx tsx scripts/fix-contact-inquiry.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing ContactInquiry table issue...\n');

  try {
    // 1. Check if table exists
    console.log('1. Checking if table exists...');
    const tableCheck = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ContactInquiry';
    `);

    if (tableCheck.length === 0) {
      console.log('   ❌ Table does NOT exist. Creating...');
      
      // Create table
      await prisma.$executeRawUnsafe(`
        CREATE TABLE "ContactInquiry" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "company" TEXT,
          "industry" TEXT,
          "message" TEXT NOT NULL,
          "sourcePage" TEXT,
          "status" TEXT NOT NULL DEFAULT 'UNREAD',
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "repliedAt" TIMESTAMP(3),
          "resolvedAt" TIMESTAMP(3),
          "notes" TEXT,
          "assignedTo" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `);

      // Create enum if needed
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "InquiryStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'RESOLVED', 'ARCHIVED');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
      `);

      // Update status column to use enum
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ContactInquiry" 
        ALTER COLUMN "status" TYPE "InquiryStatus" 
        USING "status"::"InquiryStatus";
      `).catch(() => {
        // Ignore if already enum type
      });

      // Create indexes
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "ContactInquiry_status_idx" ON "ContactInquiry"("status");
        CREATE INDEX IF NOT EXISTS "ContactInquiry_isRead_idx" ON "ContactInquiry"("isRead");
        CREATE INDEX IF NOT EXISTS "ContactInquiry_createdAt_idx" ON "ContactInquiry"("createdAt");
      `);

      console.log('   ✅ Table created successfully!');
    } else {
      console.log('   ✅ Table exists');
    }

    // 2. Verify Prisma client can access it
    console.log('\n2. Testing Prisma client access...');
    const testInquiry = await prisma.contactInquiry.create({
      data: {
        name: 'Verification Test',
        email: 'verify@test.com',
        message: 'This is a verification test',
      },
    });
    console.log('   ✅ Prisma client works! Created ID:', testInquiry.id);

    // Clean up
    await prisma.contactInquiry.delete({ where: { id: testInquiry.id } });
    console.log('   ✅ Test record cleaned up');

    // 3. Check migration status
    console.log('\n3. Checking migration status...');
    try {
      const migrations = await prisma.$queryRawUnsafe<Array<{ migration_name: string }>>(`
        SELECT migration_name 
        FROM _prisma_migrations 
        WHERE migration_name LIKE '%contact%' OR migration_name LIKE '%inquiry%';
      `);
      
      if (migrations.length === 0) {
        console.log('   ⚠️  No migration recorded (this is okay if using db push)');
      } else {
        console.log('   ✅ Migration recorded:', migrations.map(m => m.migration_name).join(', '));
      }
    } catch (e: any) {
      console.log('   ℹ️  Could not check migrations (table might not exist)');
    }

    console.log('\n✅ Everything is set up correctly!');
    console.log('\n💡 Next steps:');
    console.log('   1. Stop your server (Ctrl+C)');
    console.log('   2. Run: rm -rf .next');
    console.log('   3. Run: npm run dev');
    console.log('   4. Try the contact form again\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('   Code:', error.code);
    }
    process.exit(1);
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

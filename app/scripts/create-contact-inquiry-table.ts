/**
 * Create ContactInquiry table directly in the database
 * Run: npx tsx scripts/create-contact-inquiry-table.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Creating ContactInquiry table...\n');

  try {
    // Create table using raw SQL
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ContactInquiry" (
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

    console.log('✅ Table created successfully!');

    // Create indexes
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContactInquiry_status_idx" ON "ContactInquiry"("status");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContactInquiry_isRead_idx" ON "ContactInquiry"("isRead");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "ContactInquiry_createdAt_idx" ON "ContactInquiry"("createdAt");
    `);

    console.log('✅ Indexes created successfully!');

    // Verify table exists
    const result = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ContactInquiry'
      );
    `);

    if (result[0]?.exists) {
      console.log('\n✅ ContactInquiry table verified and ready to use!');
    } else {
      console.log('\n⚠️  Table creation may have failed. Please check manually.');
    }

    // Test insert
    const testInquiry = await prisma.contactInquiry.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message',
        status: 'UNREAD',
        isRead: false,
      },
    });

    console.log(`✅ Test insert successful! ID: ${testInquiry.id}`);

    // Clean up test record
    await prisma.contactInquiry.delete({
      where: { id: testInquiry.id },
    });
    console.log('✅ Test record cleaned up.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === '42P07') {
      console.log('ℹ️  Table already exists. That\'s okay!');
    } else {
      throw error;
    }
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

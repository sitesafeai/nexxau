/**
 * Fix database schema - add missing tables and columns
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing database schema...\n');

  try {
    // 1. Check if ContactInquiry table exists
    const tableCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ContactInquiry'
      );
    `);

    if (!tableCheck[0]?.exists) {
      console.log('📋 Creating ContactInquiry table...');
      
      // Create enum first
      await prisma.$executeRawUnsafe(`
        DO $$ BEGIN
          CREATE TYPE "InquiryStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'RESOLVED', 'ARCHIVED');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

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
          "status" "InquiryStatus" NOT NULL DEFAULT 'UNREAD',
          "isRead" BOOLEAN NOT NULL DEFAULT false,
          "repliedAt" TIMESTAMP(3),
          "resolvedAt" TIMESTAMP(3),
          "notes" TEXT,
          "assignedTo" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL
        );
      `);

      // Create indexes
      await prisma.$executeRawUnsafe(`CREATE INDEX "ContactInquiry_status_idx" ON "ContactInquiry"("status");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "ContactInquiry_isRead_idx" ON "ContactInquiry"("isRead");`);
      await prisma.$executeRawUnsafe(`CREATE INDEX "ContactInquiry_createdAt_idx" ON "ContactInquiry"("createdAt");`);
      
      console.log('✅ ContactInquiry table created');
    } else {
      console.log('✅ ContactInquiry table exists');
    }

    // 2. Check if Alert.overrideStatus column exists
    const columnCheck = await prisma.$queryRawUnsafe<Array<{ exists: boolean }>>(`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'Alert' 
        AND column_name = 'overrideStatus'
      );
    `);

    if (!columnCheck[0]?.exists) {
      console.log('📋 Adding overrideStatus column to Alert table...');
      
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "Alert" 
        ADD COLUMN "overrideStatus" TEXT,
        ADD COLUMN "overrideBy" TEXT,
        ADD COLUMN "overrideAt" TIMESTAMP(3),
        ADD COLUMN "overrideReason" TEXT,
        ADD COLUMN "modelVersion" TEXT,
        ADD COLUMN "isTrainingCandidate" BOOLEAN NOT NULL DEFAULT false;
      `);

      // Add foreign key for overrideBy if User table exists
      try {
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "Alert" 
          ADD CONSTRAINT "Alert_overrideBy_fkey" 
          FOREIGN KEY ("overrideBy") REFERENCES "User"("id") ON DELETE SET NULL;
        `);
      } catch (e: any) {
        if (!e.message.includes('already exists')) {
          console.log('⚠️  Could not add foreign key (may already exist):', e.message);
        }
      }

      console.log('✅ Alert.overrideStatus and related columns added');
    } else {
      console.log('✅ Alert.overrideStatus column exists');
    }

    // 3. Test queries
    console.log('\n🧪 Testing queries...');
    
    const inquiryCount = await prisma.contactInquiry.count();
    console.log(`✅ ContactInquiry query works (${inquiryCount} records)`);
    
    const alertCount = await prisma.alert.count({
      where: { overrideStatus: null }
    });
    console.log(`✅ Alert query with overrideStatus works (${alertCount} alerts with null overrideStatus)`);
    
    console.log('\n✅ Database schema fix complete!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Code:', error.code);
    if (error.meta) {
      console.error('Meta:', JSON.stringify(error.meta, null, 2));
    }
    throw error;
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

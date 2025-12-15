/**
 * Fix ContactInquiry table to use enum instead of TEXT for status
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing ContactInquiry status enum...\n');

  try {
    // Step 1: Create the enum if it doesn't exist
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
        CREATE TYPE "InquiryStatus" AS ENUM ('UNREAD', 'READ', 'REPLIED', 'RESOLVED', 'ARCHIVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('✅ InquiryStatus enum created/verified');

    // Step 2: Check current column type
    const currentType = await prisma.$queryRawUnsafe<Array<{ data_type: string }>>(`
      SELECT data_type 
      FROM information_schema.columns 
      WHERE table_name = 'ContactInquiry' 
      AND column_name = 'status';
    `);

    if (currentType.length > 0) {
      console.log(`📋 Current status column type: ${currentType[0].data_type}`);
      
      if (currentType[0].data_type === 'USER-DEFINED') {
        console.log('✅ Status column is already using enum type');
      } else {
        // Step 3: Convert TEXT to enum
        console.log('🔄 Converting status column from TEXT to enum...');
        
        // First, ensure all values are valid enum values
        await prisma.$executeRawUnsafe(`
          UPDATE "ContactInquiry" 
          SET status = 'UNREAD' 
          WHERE status NOT IN ('UNREAD', 'READ', 'REPLIED', 'RESOLVED', 'ARCHIVED');
        `);
        
        // Then alter the column type
        await prisma.$executeRawUnsafe(`
          ALTER TABLE "ContactInquiry" 
          ALTER COLUMN "status" TYPE "InquiryStatus" 
          USING "status"::"InquiryStatus";
        `);
        
        console.log('✅ Status column converted to enum type');
      }
    } else {
      console.log('⚠️  Status column not found - table may not exist');
    }

    // Step 4: Test query
    const test = await prisma.contactInquiry.findFirst();
    console.log('✅ Test query successful - Prisma can read the table');
    
    console.log('\n✅ ContactInquiry enum fix complete!');

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

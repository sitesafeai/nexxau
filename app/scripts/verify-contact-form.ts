/**
 * Verify ContactInquiry table and Prisma client setup
 * Run: npx tsx scripts/verify-contact-form.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verifying ContactInquiry setup...\n');

  try {
    // 1. Check if table exists
    const tableCheck = await prisma.$queryRawUnsafe<Array<{ table_name: string }>>(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'ContactInquiry';
    `);

    if (tableCheck.length === 0) {
      console.log('❌ ContactInquiry table does NOT exist in database');
      console.log('   Run: npx tsx scripts/create-contact-inquiry-table.ts');
      process.exit(1);
    }
    console.log('✅ ContactInquiry table exists');

    // 2. Check if Prisma client can access it
    try {
      await prisma.contactInquiry.findMany({ take: 1 });
      console.log('✅ Prisma client can access ContactInquiry model');
    } catch (error: any) {
      console.log('❌ Prisma client cannot access ContactInquiry:', error.message);
      console.log('   Run: npx prisma generate --schema=prisma/schema.prisma');
      process.exit(1);
    }

    // 3. Test insert
    const testInquiry = await prisma.contactInquiry.create({
      data: {
        name: 'Verification Test',
        email: 'verify@test.com',
        message: 'This is a test to verify the contact form works',
      },
    });
    console.log('✅ Test insert successful (ID:', testInquiry.id + ')');

    // Clean up
    await prisma.contactInquiry.delete({ where: { id: testInquiry.id } });
    console.log('✅ Test record cleaned up\n');

    console.log('🎉 Everything is set up correctly!');
    console.log('💡 If you still get errors, restart your dev server:\n');
    console.log('   1. Stop server (Ctrl+C)');
    console.log('   2. Run: rm -rf .next');
    console.log('   3. Run: npm run dev\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.code === 'P2001') {
      console.log('\n💡 Table might not exist. Run:');
      console.log('   npx tsx scripts/create-contact-inquiry-table.ts\n');
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

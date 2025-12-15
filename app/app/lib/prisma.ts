import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

// Force fresh Prisma client - clear cache on every restart in development
if (process.env.NODE_ENV !== 'production' && global.prisma) {
  // Disconnect and clear the old instance
  try {
    global.prisma.$disconnect().catch(() => {});
  } catch (e) {
    // Ignore errors
  }
  global.prisma = undefined;
}

// Create fresh Prisma client instance
export const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'query'] : ['error'],
});

// Verify ContactInquiry is accessible (helps catch issues early)
if (process.env.NODE_ENV !== 'production' && typeof prisma.contactInquiry === 'undefined') {
  console.error('❌ ContactInquiry model not found in Prisma client!');
  console.error('   Run: npx prisma generate --schema=prisma/schema.prisma');
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}


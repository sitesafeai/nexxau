import { PrismaClient } from '@prisma/client';

declare global {
  var prisma: PrismaClient | undefined;
}

/**
 * Build DB URL with connection pool options to avoid "Timed out fetching a new connection" errors.
 * - pool_timeout: wait up to 60s for a connection (Restore All + multiple tiles can create bursts).
 * - connection_limit: 20 to handle concurrent restore + page loads (Supabase pooler supports this).
 */
function getDatasourceUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  const separator = url.includes('?') ? '&' : '?';
  const params = new URLSearchParams();
  // Only set if not already in URL
  if (!url.includes('pool_timeout=')) params.set('pool_timeout', '60');
  if (!url.includes('connection_limit=')) params.set('connection_limit', '20');
  const q = params.toString();
  return q ? `${url}${separator}${q}` : url;
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
const prismaConfig: ConstructorParameters<typeof PrismaClient>[0] = {
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn', 'query'] : ['error'],
};
const datasourceUrl = getDatasourceUrl();
if (datasourceUrl) {
  prismaConfig.datasources = { db: { url: datasourceUrl } };
}
export const prisma = global.prisma || new PrismaClient(prismaConfig);

// Verify ContactInquiry is accessible (helps catch issues early)
if (process.env.NODE_ENV !== 'production' && typeof prisma.contactInquiry === 'undefined') {
  console.error('❌ ContactInquiry model not found in Prisma client!');
  console.error('   Run: npx prisma generate --schema=prisma/schema.prisma');
}

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}


/**
 * List cameras and their stream URLs. Uses same env loading as other DB scripts.
 * Run from app/: npm run db:cameras
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
  const cameras = await prisma.camera.findMany({
    select: { id: true, name: true, streamUrl: true },
    orderBy: { name: 'asc' },
  });
  console.log(`\n${cameras.length} cameras:\n`);
  cameras.forEach((c) => {
    let url = c.streamUrl || '';
    url = url.replace(/^rtsp:\/\/[^@]+@/, 'rtsp://***:***@'); // redact credentials
    url = url.replace(/\/[^/]+$/, '/...'); // truncate path
    console.log(`  ${c.name.padEnd(20)} ${url}`);
  });
}

main()
  .catch((e) => {
    console.error('DB error:', e.message);
    if (e.message?.includes('Authentication failed')) {
      console.error('\nTip: Supabase auth fails when project is paused, password changed, or credentials expired.');
      console.error('Check Supabase dashboard -> Settings -> Database for current connection string.');
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

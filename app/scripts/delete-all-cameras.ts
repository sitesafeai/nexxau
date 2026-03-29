/**
 * Delete all cameras from the database.
 * Run from app/: npx tsx scripts/delete-all-cameras.ts
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

async function main() {
  const cameras = await prisma.camera.findMany({
    select: { id: true, name: true, worksiteId: true },
  });

  if (cameras.length === 0) {
    console.log('No cameras to delete.');
    return;
  }

  console.log(`Deleting ${cameras.length} cameras...`);

  for (const camera of cameras) {
    console.log(`  Deleting: ${camera.name} (${camera.id})`);

    await prisma.detection.deleteMany({ where: { cameraId: camera.id } });
    await prisma.camera.delete({ where: { id: camera.id } });
  }

  console.log('✅ All cameras deleted.');
}

main()
  .catch((e) => {
    console.error('Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

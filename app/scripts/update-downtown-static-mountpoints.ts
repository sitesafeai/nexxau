/**
 * One-off script: Configure Downtown tEst cameras to use static Janus RTSP mountpoints.
 *
 * This script:
 * - Sets janusFeedId = 1, 2, 3 for the three Downtown cameras
 * - Adds metadata.staticMountpoint = true so the app knows to skip RTP workers
 *
 * Run from app/:
 *   npm run tsx scripts/update-downtown-static-mountpoints.ts
 * or, if you prefer npx:
 *   npx tsx scripts/update-downtown-static-mountpoints.ts
 *
 * The script loads DATABASE_URL from .env / .env.local automatically.
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables (DATABASE_URL, etc.)
config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

// Mapping of Downtown tEst camera IDs to static Janus feed IDs
const DOWNTOWN_STATIC_CAMERAS: Array<{ id: string; feedId: number }> = [
  {
    // Downtown Camera 1
    id: 'cmlgke4k00003p9dlh4a6x951',
    feedId: 1,
  },
  {
    // Downtown Camera 2
    id: 'cmlfkb8wx0001p9yriwi8r4x9',
    feedId: 2,
  },
  {
    // Downtown Camera 3
    id: 'cmlg3bux00001p9dlkgh65vk8',
    feedId: 3,
  },
];

async function main() {
  console.log('=== Updating Downtown tEst cameras to use static Janus RTSP mountpoints ===');

  const cameraIds = DOWNTOWN_STATIC_CAMERAS.map((c) => c.id);

  const cameras = await prisma.camera.findMany({
    where: {
      id: { in: cameraIds },
    },
    select: {
      id: true,
      name: true,
      metadata: true,
      janusFeedId: true,
    },
  });

  if (cameras.length === 0) {
    console.warn('No Downtown cameras found. Check IDs in DOWNTOWN_STATIC_CAMERAS.');
    return;
  }

  console.log(`Found ${cameras.length} Downtown cameras to update.\n`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const camera of cameras) {
    const mapping = DOWNTOWN_STATIC_CAMERAS.find((c) => c.id === camera.id);
    if (!mapping) {
      console.warn(`Skipping camera ${camera.id} (${camera.name}) - not in static mapping`);
      continue;
    }

    const targetFeedId = mapping.feedId;
    const currentMetadata = (camera.metadata as any) || {};
    const alreadyStatic =
      currentMetadata.staticMountpoint === true && camera.janusFeedId === targetFeedId;

    if (alreadyStatic) {
      console.log(
        `⏭️  Skipping ${camera.name} (${camera.id}) - already static with janusFeedId=${targetFeedId}`
      );
      skippedCount++;
      continue;
    }

    const newMetadata = {
      ...currentMetadata,
      staticMountpoint: true,
    };

    await prisma.camera.update({
      where: { id: camera.id },
      data: {
        janusFeedId: targetFeedId,
        metadata: newMetadata,
      },
    });

    console.log(
      `✅ Updated ${camera.name} (${camera.id}) -> janusFeedId=${targetFeedId}, metadata.staticMountpoint=true`
    );
    updatedCount++;
  }

  console.log('\n=== Downtown static mountpoints update complete ===');
  console.log(`Updated: ${updatedCount}`);
  console.log(`Skipped (already static): ${skippedCount}`);
}

main()
  .catch((error) => {
    console.error('❌ Error updating Downtown static mountpoints:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


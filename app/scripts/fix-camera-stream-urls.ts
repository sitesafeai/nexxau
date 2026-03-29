#!/usr/bin/env npx tsx
/**
 * Fix camera stream URLs that cause go2rtc 500 errors.
 *
 * Common issues:
 * 1. Expired test.rtsp.stream credentials
 * 2. 10.0.0.245 unreachable from Docker - use host.docker.internal
 *
 * Usage (from app/):
 *   npm run fix:stream-urls
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

// Credentials that work (from camera cmmat23ll - update if expired)
const VALID_TEST_RTSP_CREDENTIALS = 'tUqTomA2pHYjlFjLv4MQoBpXGBfJ8256:qDEZ6q-JXjPVD2qOCdCgN';

// Old expired credentials to replace
const OLD_CREDENTIALS = 'HDFKrq18GeYxqjCr0PCyBfRD1eskH7rW:NvBh0E4Eg5EpI-GG3g8ey';

async function main() {
  const cameras = await prisma.camera.findMany({
    where: { streamUrl: { not: null } },
    select: { id: true, name: true, streamUrl: true },
  });

  console.log(`Found ${cameras.length} cameras with stream URLs\n`);

  for (const cam of cameras) {
    const url = cam.streamUrl!;
    let newUrl: string | null = null;

    // Fix 1: Replace expired test.rtsp.stream credentials
    if (url.includes(OLD_CREDENTIALS) && url.includes('test.rtsp.stream')) {
      newUrl = url.replace(
        `rtsp://${OLD_CREDENTIALS}@`,
        `rtsp://${VALID_TEST_RTSP_CREDENTIALS}@`
      );
    }

    // Fix 2: Replace 10.0.0.245 with host.docker.internal (for Docker networking)
    if (url.includes('10.0.0.245') && !url.includes('host.docker.internal')) {
      newUrl = url.replace('10.0.0.245', 'host.docker.internal');
    }

    // Fix 3: host.docker.internal:8554/stream often returns "wrong response on DESCRIBE"
    //   (no valid RTSP server there). Use test.rtsp.stream/people as fallback. Fixes Camera B 500.
    if (url === 'rtsp://host.docker.internal:8554/stream' || url.includes('host.docker.internal:8554/stream')) {
      newUrl = `rtsp://${VALID_TEST_RTSP_CREDENTIALS}@test.rtsp.stream/people`;
    }

    if (newUrl) {
      await prisma.camera.update({
        where: { id: cam.id },
        data: { streamUrl: newUrl },
      });
      console.log(`Updated ${cam.name} (${cam.id})`);
      console.log(`  Old: ${url}`);
      console.log(`  New: ${newUrl}\n`);
    }
  }

  console.log('Done. Restart go2rtc if it caches stream config: docker restart go2rtc');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

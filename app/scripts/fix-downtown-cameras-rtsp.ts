/**
 * One-off script: Update the 3 Downtown tEst cameras to use a working RTSP URL.
 *
 * Run from app/: npm run fix:downtown-cameras
 * Optional: RTSP_URL="rtsp://192.168.64.4:8554/stream" npm run fix:downtown-cameras
 * (Loads .env.local automatically for DATABASE_URL)
 *
 * If ingest (on Mac) can't reach 10.0.0.245, try 192.168.64.4 (VM's bridged IP).
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

const DOWNTOWN_CAMERAS = [
  'cmlg3bux00001p9dlkgh65vk8',
  'cmlgke4k00003p9dlh4a6x951',
  'cmlfkb8wx0001p9yriwi8r4x9',
];

// Prefer env override (e.g. RTSP_URL=rtsp://192.168.64.4:8554/stream) if 10.0.0.245 unreachable from Mac
const LOCAL_RTSP = process.env.RTSP_URL || 'rtsp://10.0.0.245:8554/stream';

async function main() {
  console.log(`Using RTSP URL: ${LOCAL_RTSP}`);
  for (const id of DOWNTOWN_CAMERAS) {
    const cam = await prisma.camera.update({
      where: { id },
      data: { streamUrl: LOCAL_RTSP },
    });
    console.log(`Updated ${cam.name} (${id}) -> ${LOCAL_RTSP}`);
  }
  console.log('Done. Run "Restore All Cameras" in the UI to restart RTP workers.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

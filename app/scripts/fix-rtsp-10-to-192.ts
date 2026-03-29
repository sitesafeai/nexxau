/**
 * Fix: Replace rtsp://10.0.0.245:8554/stream with rtsp://192.168.64.4:8554/stream
 *
 * 10.0.0.245 is often unreachable from Mac (inside VM/Docker network).
 * 192.168.64.4 is the Janus VM's bridged IP - reachable from Mac.
 *
 * Run from app/: npm run fix:rtsp-host
 * (Loads .env.local for DATABASE_URL)
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

const OLD_RTSP = 'rtsp://10.0.0.245:8554/stream';
const NEW_RTSP = 'rtsp://192.168.64.4:8554/stream';

async function main() {
  const cameras = await prisma.camera.findMany({
    where: { streamUrl: OLD_RTSP },
    select: { id: true, name: true },
  });

  if (cameras.length === 0) {
    console.log('No cameras use 10.0.0.245 - nothing to update.');
    return;
  }

  console.log(`Updating ${cameras.length} cameras from ${OLD_RTSP} -> ${NEW_RTSP}`);

  const result = await prisma.camera.updateMany({
    where: { streamUrl: OLD_RTSP },
    data: { streamUrl: NEW_RTSP },
  });

  console.log(`Updated ${result.count} cameras.`);
  cameras.forEach((c) => console.log(`  - ${c.name} (${c.id})`));
  console.log('\nRun "Restore All Cameras" in the UI to restart RTP workers.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

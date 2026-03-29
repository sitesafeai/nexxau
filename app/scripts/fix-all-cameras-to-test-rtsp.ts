/**
 * Set ALL cameras to use test.rtsp.stream (movie or people).
 * Alternates: odd index → movie, even index → people.
 *
 * Run from app/: npm run fix:test-rtsp
 * Override: STREAM=people npm run fix:test-rtsp  (all use people)
 *           STREAM=movie npm run fix:test-rtsp   (all use movie)
 */

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

config();
config({ path: '.env.local', override: true });

const prisma = new PrismaClient();

const RTSP_MOVIE =
  'rtsp://HDFKrq18GeYxqjCr0PCyBfRD1eskH7rW:NvBh0E4Eg5EpI-GG3g8ey@test.rtsp.stream/movie';
const RTSP_PEOPLE =
  'rtsp://HDFKrq18GeYxqjCr0PCyBfRD1eskH7rW:NvBh0E4Eg5EpI-GG3g8ey@test.rtsp.stream/people';

async function main() {
  const cameras = await prisma.camera.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, streamUrl: true },
  });

  const streamPref = (process.env.STREAM || 'alternate').toLowerCase();

  console.log(`Updating ${cameras.length} cameras to test.rtsp.stream (mode: ${streamPref})\n`);

  let updated = 0;
  for (let i = 0; i < cameras.length; i++) {
    const cam = cameras[i];
    let url: string;
    if (streamPref === 'movie') url = RTSP_MOVIE;
    else if (streamPref === 'people') url = RTSP_PEOPLE;
    else url = i % 2 === 0 ? RTSP_PEOPLE : RTSP_MOVIE;

    await prisma.camera.update({
      where: { id: cam.id },
      data: { streamUrl: url },
    });
    const label = url.includes('/movie') ? 'movie' : 'people';
    console.log(`  ${cam.name.padEnd(24)} → ${label}`);
    updated++;
  }

  console.log(`\nUpdated ${updated} cameras. Run "Restore All Cameras" in the UI.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

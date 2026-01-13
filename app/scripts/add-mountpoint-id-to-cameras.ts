/**
 * Script to add mountpointId: 10 to all cameras' metadata
 * 
 * This script updates all cameras in the database to include mountpointId: 10
 * in their metadata JSONB field, which enables WebRTC streaming via Janus Gateway.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addMountpointIdToCameras() {
  console.log('🚀 Starting migration: Adding mountpointId: 10 to all cameras...\n');

  try {
    // Get all cameras
    const cameras = await prisma.camera.findMany({
      select: {
        id: true,
        name: true,
        metadata: true,
      },
    });

    console.log(`📊 Found ${cameras.length} cameras to process\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    // Update each camera
    for (const camera of cameras) {
      const metadata = (camera.metadata as any) || {};
      const currentMountpointId = metadata.mountpointId || metadata.mountpoint_id;

      // Skip if already has mountpointId: 10
      if (currentMountpointId === 10) {
        console.log(`⏭️  Skipping ${camera.name} (id: ${camera.id}) - already has mountpointId: 10`);
        skippedCount++;
        continue;
      }

      // Update camera with mountpointId: 10
      await prisma.camera.update({
        where: { id: camera.id },
        data: {
          metadata: {
            ...metadata,
            mountpointId: 10,
          },
        },
      });

      console.log(`✅ Updated ${camera.name} (id: ${camera.id}) - added mountpointId: 10`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(50));
    console.log('📈 Migration Summary:');
    console.log(`   Total cameras: ${cameras.length}`);
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped (already set): ${skippedCount}`);
    console.log('='.repeat(50) + '\n');

    // Verify the update
    const camerasWithMountpoint10 = await prisma.camera.count({
      where: {
        metadata: {
          path: ['mountpointId'],
          equals: 10,
        },
      },
    });

    console.log(`✅ Verification: ${camerasWithMountpoint10} cameras now have mountpointId: 10\n`);

    if (camerasWithMountpoint10 === cameras.length) {
      console.log('🎉 SUCCESS! All cameras now have mountpointId: 10');
    } else {
      console.log(`⚠️  WARNING: Expected ${cameras.length} cameras with mountpointId: 10, but found ${camerasWithMountpoint10}`);
    }

  } catch (error) {
    console.error('❌ Error running migration:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
addMountpointIdToCameras()
  .then(() => {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });


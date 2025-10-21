/**
 * Seed Demo Cameras for Testing
 * 
 * Run with: npx tsx scripts/seed-cameras.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEMO_CAMERAS = [
  {
    name: 'People Detection Camera',
    type: 'IP Camera',
    status: 'active',
    hlsUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    location: 'Main Entrance - Building A',
    ipAddress: '192.168.1.101',
    port: 554
  },
  {
    name: 'Construction Zone Camera',
    type: 'IP Camera',
    status: 'active',
    hlsUrl: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    location: 'Building B - Floor 2',
    ipAddress: '192.168.1.102',
    port: 554
  },
  {
    name: 'Warehouse Monitoring',
    type: 'IP Camera',
    status: 'active',
    hlsUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    location: 'Loading Dock - East Side',
    ipAddress: '192.168.1.103',
    port: 554
  },
  {
    name: 'Parking Lot Camera',
    type: 'IP Camera',
    status: 'active',
    hlsUrl: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    location: 'Main Parking Lot',
    ipAddress: '192.168.1.104',
    port: 554
  }
];

async function main() {
  console.log('🌱 Starting camera seeding...\n');

  try {
    // Check if database is accessible
    await prisma.$queryRaw`SELECT 1`;
    console.log('✅ Database connection successful\n');

    // Get or create default worksite
    let worksite = await prisma.worksite.findFirst({
      orderBy: { createdAt: 'asc' }
    });

    if (!worksite) {
      console.log('📍 Creating default worksite...');
      worksite = await prisma.worksite.create({
        data: {
          name: 'Main Construction Site',
          worksiteName: 'Downtown Development Project',
          location: 'Downtown District',
          address: '123 Construction Blvd, City, State 12345',
          status: 'active',
          startDate: new Date(),
          isActive: true
        }
      });
      console.log(`✅ Created worksite: ${worksite.name}\n`);
    } else {
      console.log(`✅ Using existing worksite: ${worksite.name}\n`);
    }

    // Check existing cameras
    const existingCameras = await prisma.camera.findMany({
      where: { worksiteId: worksite.id }
    });

    if (existingCameras.length > 0) {
      console.log(`⚠️  Found ${existingCameras.length} existing camera(s) in database`);
      console.log('Do you want to:');
      console.log('1. Keep existing cameras (exit now)');
      console.log('2. Delete existing and add demo cameras (run with --force flag)\n');
      
      if (!process.argv.includes('--force')) {
        console.log('💡 Keeping existing cameras. Use --force to replace them.');
        console.log('\nExisting cameras:');
        existingCameras.forEach((cam, i) => {
          console.log(`  ${i + 1}. ${cam.name} - ${cam.location}`);
        });
        return;
      }

      console.log('🗑️  Deleting existing cameras...');
      await prisma.camera.deleteMany({
        where: { worksiteId: worksite.id }
      });
      console.log('✅ Existing cameras deleted\n');
    }

    // Create demo cameras
    console.log('📹 Creating demo cameras...\n');

    for (const cameraData of DEMO_CAMERAS) {
      const camera = await prisma.camera.create({
        data: {
          ...cameraData,
          worksiteId: worksite.id
        }
      });

      // Create initial health record
      await prisma.cameraHealth.create({
        data: {
          cameraId: camera.id,
          status: 'ONLINE',
          streamQuality: 100,
          frameRate: 30,
          resolution: '1920x1080',
          bitrate: 4000000,
          latency: 100,
          lastCheck: new Date()
        }
      });

      console.log(`✅ Created: ${camera.name}`);
      console.log(`   Location: ${camera.location}`);
      console.log(`   Stream: ${camera.hlsUrl}`);
      console.log(`   ID: ${camera.id}\n`);
    }

    console.log('🎉 Camera seeding completed successfully!');
    console.log(`\n📊 Summary:`);
    console.log(`   - Worksite: ${worksite.name}`);
    console.log(`   - Cameras created: ${DEMO_CAMERAS.length}`);
    console.log(`   - All cameras marked as ONLINE`);
    console.log(`\n💡 Next steps:`);
    console.log(`   1. Restart your Next.js dev server`);
    console.log(`   2. Navigate to /dashboard`);
    console.log(`   3. You should see all ${DEMO_CAMERAS.length} cameras with live feeds`);
    console.log(`   4. AI detection should work on all video streams`);

  } catch (error) {
    console.error('❌ Error seeding cameras:', error);
    
    if (error instanceof Error) {
      if (error.message.includes('Can\'t reach database')) {
        console.log('\n💡 Database connection failed. Make sure:');
        console.log('   1. Your DATABASE_URL is set in .env');
        console.log('   2. The database is running');
        console.log('   3. Run: npx prisma generate');
      }
    }
    
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();


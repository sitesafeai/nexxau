const { PrismaClient } = require('./app/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function addSampleCameras() {
  try {
    console.log('🚀 Adding sample cameras to SiteSafe...\n');

    // Get the first worksite
    const worksite = await prisma.worksite.findFirst();
    
    if (!worksite) {
      console.log('❌ No worksite found. Please create a worksite first.');
      return;
    }

    console.log(`✅ Found worksite: ${worksite.name}`);

    // Sample cameras to add
    const cameras = [
      {
        name: 'Main Entrance Camera',
        location: 'Main Gate - Building A',
        streamUrl: 'http://localhost:8889/people',
        status: 'online',
        worksiteId: worksite.id,
        type: 'fixed',
        resolution: '1080p',
        frameRate: 30,
        isActive: true,
      },
      {
        name: 'Construction Zone 1',
        location: 'Building B - Floor 2',
        streamUrl: 'http://localhost:8889/construction',
        status: 'online',
        worksiteId: worksite.id,
        type: 'fixed',
        resolution: '1080p',
        frameRate: 30,
        isActive: true,
      },
      {
        name: 'Warehouse Dock',
        location: 'Loading Dock - East Side',
        streamUrl: 'http://localhost:8889/warehouse',
        status: 'online',
        worksiteId: worksite.id,
        type: 'ptz',
        resolution: '4K',
        frameRate: 30,
        isActive: true,
      },
      {
        name: 'Parking Lot Camera',
        location: 'Main Parking Lot',
        streamUrl: 'http://localhost:8889/parking',
        status: 'online',
        worksiteId: worksite.id,
        type: 'fixed',
        resolution: '720p',
        frameRate: 30,
        isActive: true,
      },
    ];

    // Add cameras one by one
    for (const cameraData of cameras) {
      // Check if camera already exists
      const existing = await prisma.camera.findFirst({
        where: { 
          name: cameraData.name,
          worksiteId: worksite.id 
        }
      });

      if (existing) {
        console.log(`⏭️  Camera "${cameraData.name}" already exists. Skipping...`);
        continue;
      }

      const camera = await prisma.camera.create({
        data: cameraData
      });

      console.log(`✅ Added camera: ${camera.name} (${camera.location})`);
    }

    console.log('\n🎉 Sample cameras added successfully!');
    console.log('\n📊 Camera Summary:');
    
    const allCameras = await prisma.camera.findMany({
      where: { worksiteId: worksite.id }
    });

    console.log(`Total cameras: ${allCameras.length}`);
    allCameras.forEach(cam => {
      console.log(`  - ${cam.name} (${cam.status})`);
    });

    console.log('\n✨ You can now view cameras in the dashboard!');
    console.log('🌐 Visit: http://localhost:3000/dashboard');

  } catch (error) {
    console.error('❌ Error adding cameras:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleCameras();


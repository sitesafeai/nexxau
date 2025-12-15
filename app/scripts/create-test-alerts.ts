/**
 * Create 5 test alerts for Highway Bridge Project
 * Run: npx tsx scripts/create-test-alerts.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKSITE_ID = 'cmha01l5h0005p98vyrfe3r0c'; // Highway Bridge Project

const testAlerts = [
  {
    title: 'Missing Hard Hat Detected',
    description: 'Worker detected without hard hat in Zone A - North Tower',
    severity: 'WARNING' as const,
    status: 'ACTIVE' as const,
    source: 'camera',
    location: 'Zone A - North Tower',
    violationType: 'missing_helmet',
    detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
    detectionVideo: null,
    detectionData: {
      confidence: 0.87,
      objects: [
        { class: 'person', confidence: 0.92, bbox: [120, 80, 200, 350] },
        { class: 'no_helmet', confidence: 0.87, bbox: [140, 85, 180, 120] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
      timestamp: new Date().toISOString()
    },
    modelVersion: 'yolo-v8-ppe-1.2.3',
  },
  {
    title: 'Missing Safety Vest Detected',
    description: 'Worker in Zone B - Bridge Deck without high-visibility vest',
    severity: 'WARNING' as const,
    status: 'ACTIVE' as const,
    source: 'camera',
    location: 'Zone B - Bridge Deck',
    violationType: 'missing_vest',
    detectionSnapshot: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
    detectionVideo: null,
    detectionData: {
      confidence: 0.65,
      objects: [
        { class: 'person', confidence: 0.78, bbox: [300, 150, 450, 500] },
        { class: 'no_vest', confidence: 0.65, bbox: [320, 160, 430, 280] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
    },
    modelVersion: 'yolo-v8-ppe-1.2.3',
  },
  {
    title: 'Restricted Zone Entry',
    description: 'Person detected entering restricted construction zone without authorization',
    severity: 'CRITICAL' as const,
    status: 'ACTIVE' as const,
    source: 'camera',
    location: 'Zone C - Restricted Area',
    violationType: 'restricted_zone',
    detectionSnapshot: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
    detectionVideo: null,
    detectionData: {
      confidence: 0.92,
      objects: [
        { class: 'person', confidence: 0.95, bbox: [500, 200, 650, 550] },
        { class: 'restricted_zone', confidence: 0.92, bbox: [480, 180, 680, 600] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
    },
    modelVersion: 'yolo-v8-ppe-1.2.3',
  },
  {
    title: 'Missing Safety Gloves',
    description: 'Worker handling materials without protective gloves in Zone D',
    severity: 'INFO' as const,
    status: 'ACTIVE' as const,
    source: 'camera',
    location: 'Zone D - Material Storage',
    violationType: 'missing_gloves',
    detectionSnapshot: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
    detectionVideo: null,
    detectionData: {
      confidence: 0.45,
      objects: [
        { class: 'person', confidence: 0.68, bbox: [200, 100, 350, 450] },
        { class: 'no_gloves', confidence: 0.45, bbox: [220, 300, 330, 380] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString() // 1 hour ago
    },
    modelVersion: 'yolo-v8-ppe-1.2.3',
  },
  {
    title: 'Missing Safety Goggles',
    description: 'Worker performing welding operations without eye protection',
    severity: 'CRITICAL' as const,
    status: 'ACTIVE' as const,
    source: 'camera',
    location: 'Zone E - Welding Station',
    violationType: 'missing_goggles',
    detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
    detectionVideo: null,
    detectionData: {
      confidence: 0.78,
      objects: [
        { class: 'person', confidence: 0.85, bbox: [400, 120, 550, 480] },
        { class: 'welding_equipment', confidence: 0.82, bbox: [420, 200, 530, 280] },
        { class: 'no_goggles', confidence: 0.78, bbox: [430, 125, 520, 180] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString() // 30 minutes ago
    },
    modelVersion: 'yolo-v8-ppe-1.2.3',
  },
];

async function main() {
  console.log('🚨 Creating 5 test alerts for Highway Bridge Project...\n');

  // Verify worksite exists
  const worksite = await prisma.worksite.findUnique({
    where: { id: WORKSITE_ID },
  });

  if (!worksite) {
    console.error(`❌ Worksite with ID ${WORKSITE_ID} not found!`);
    console.log('Available worksites:');
    const allWorksites = await prisma.worksite.findMany({
      select: { id: true, name: true, worksiteName: true },
    });
    allWorksites.forEach((ws) => {
      console.log(`  - ${ws.name} (${ws.id})`);
    });
    process.exit(1);
  }

  console.log(`✅ Found worksite: ${worksite.name}\n`);

  // Get or create a camera for this worksite
  let camera = await prisma.camera.findFirst({
    where: { worksiteId: WORKSITE_ID },
  });

  if (!camera) {
    console.log('📹 Creating test camera...');
    camera = await prisma.camera.create({
      data: {
        name: 'Bridge Camera 1',
        type: 'RTSP',
        status: 'active',
        location: 'North Tower',
        worksiteId: WORKSITE_ID,
      },
    });
    console.log(`✅ Created camera: ${camera.name}\n`);
  } else {
    console.log(`✅ Using existing camera: ${camera.name}\n`);
  }

  // Create alerts
  const createdAlerts = [];
  for (const alertData of testAlerts) {
    try {
      // Create alert with only existing fields (new fields will be added after migration)
      const alert = await prisma.alert.create({
        data: {
          title: alertData.title,
          description: alertData.description,
          severity: alertData.severity,
          status: alertData.status,
          source: alertData.source,
          location: alertData.location,
          violationType: alertData.violationType || null,
          detectionSnapshot: alertData.detectionSnapshot || null,
          detectionVideo: alertData.detectionVideo || null,
          detectionData: alertData.detectionData as any,
          worksiteId: WORKSITE_ID,
          cameraId: camera.id,
          createdAt: new Date(alertData.detectionData.timestamp),
        },
      });
      createdAlerts.push(alert);
      console.log(`✅ Created: ${alert.title} (${alert.severity})`);
    } catch (error: any) {
      console.error(`❌ Failed to create alert "${alertData.title}":`, error.message);
    }
  }

  console.log(`\n🎉 Successfully created ${createdAlerts.length} test alerts!`);
  console.log('\n📋 Alert Summary:');
  createdAlerts.forEach((alert, idx) => {
    console.log(`  ${idx + 1}. ${alert.title}`);
    console.log(`     Status: ${alert.status} | Severity: ${alert.severity}`);
    const detectionData = alert.detectionData as any;
    console.log(`     Confidence: ${(detectionData?.confidence * 100).toFixed(1)}%`);
    console.log(`     ID: ${alert.id}`);
    console.log('');
  });

  console.log('💡 You can now test the False Positives tab in Super Admin dashboard!');
}

main()
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

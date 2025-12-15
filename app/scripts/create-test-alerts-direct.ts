/**
 * Create 5 test alerts directly using raw SQL (no auth required)
 * Run: npx tsx scripts/create-test-alerts-direct.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const WORKSITE_ID = 'cmha01l5h0005p98vyrfe3r0c';

async function main() {
  console.log('🚨 Creating 5 test alerts for Highway Bridge Project...\n');

  // Get camera ID
  const camera = await prisma.camera.findFirst({
    where: { worksiteId: WORKSITE_ID },
    select: { id: true, name: true },
  });

  if (!camera) {
    console.error('❌ No camera found for worksite. Creating one...');
    const newCamera = await prisma.camera.create({
      data: {
        name: 'Bridge Camera 1',
        type: 'RTSP',
        status: 'active',
        location: 'North Tower',
        worksiteId: WORKSITE_ID,
      },
    });
    console.log(`✅ Created camera: ${newCamera.name}\n`);
  }

  const cameraId = camera?.id || (await prisma.camera.findFirst({ where: { worksiteId: WORKSITE_ID } }))?.id;

  if (!cameraId) {
    throw new Error('Could not find or create camera');
  }

  // Use raw SQL to insert alerts (bypasses Prisma type checking)
  const alerts = [
    {
      title: 'Missing Hard Hat Detected',
      description: 'Worker detected without hard hat in Zone A - North Tower',
      severity: 'WARNING',
      status: 'ACTIVE',
      source: 'camera',
      location: 'Zone A - North Tower',
      violationType: 'missing_helmet',
      detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
      detectionData: { confidence: 0.87, objects: [{ class: 'person', confidence: 0.92, bbox: [120, 80, 200, 350] }, { class: 'no_helmet', confidence: 0.87, bbox: [140, 85, 180, 120] }], modelVersion: 'yolo-v8-ppe-1.2.3' },
      hoursAgo: 0.5,
    },
    {
      title: 'Missing Safety Vest Detected',
      description: 'Worker in Zone B - Bridge Deck without high-visibility vest',
      severity: 'WARNING',
      status: 'ACTIVE',
      source: 'camera',
      location: 'Zone B - Bridge Deck',
      violationType: 'missing_vest',
      detectionSnapshot: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
      detectionData: { confidence: 0.65, objects: [{ class: 'person', confidence: 0.78, bbox: [300, 150, 450, 500] }, { class: 'no_vest', confidence: 0.65, bbox: [320, 160, 430, 280] }], modelVersion: 'yolo-v8-ppe-1.2.3' },
      hoursAgo: 2,
    },
    {
      title: 'Restricted Zone Entry',
      description: 'Person detected entering restricted construction zone without authorization',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      source: 'camera',
      location: 'Zone C - Restricted Area',
      violationType: 'restricted_zone',
      detectionSnapshot: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
      detectionData: { confidence: 0.92, objects: [{ class: 'person', confidence: 0.95, bbox: [500, 200, 650, 550] }, { class: 'restricted_zone', confidence: 0.92, bbox: [480, 180, 680, 600] }], modelVersion: 'yolo-v8-ppe-1.2.3' },
      hoursAgo: 5,
    },
    {
      title: 'Missing Safety Gloves',
      description: 'Worker handling materials without protective gloves in Zone D',
      severity: 'INFO',
      status: 'ACTIVE',
      source: 'camera',
      location: 'Zone D - Material Storage',
      violationType: 'missing_gloves',
      detectionSnapshot: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
      detectionData: { confidence: 0.45, objects: [{ class: 'person', confidence: 0.68, bbox: [200, 100, 350, 450] }, { class: 'no_gloves', confidence: 0.45, bbox: [220, 300, 330, 380] }], modelVersion: 'yolo-v8-ppe-1.2.3' },
      hoursAgo: 1,
    },
    {
      title: 'Missing Safety Goggles',
      description: 'Worker performing welding operations without eye protection',
      severity: 'CRITICAL',
      status: 'ACTIVE',
      source: 'camera',
      location: 'Zone E - Welding Station',
      violationType: 'missing_goggles',
      detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
      detectionData: { confidence: 0.78, objects: [{ class: 'person', confidence: 0.85, bbox: [400, 120, 550, 480] }, { class: 'welding_equipment', confidence: 0.82, bbox: [420, 200, 530, 280] }, { class: 'no_goggles', confidence: 0.78, bbox: [430, 125, 520, 180] }], modelVersion: 'yolo-v8-ppe-1.2.3' },
      hoursAgo: 0.25,
    },
  ];

  for (const alertData of alerts) {
    const createdAt = new Date(Date.now() - alertData.hoursAgo * 60 * 60 * 1000);
    
    await prisma.$executeRaw`
      INSERT INTO "Alert" (
        id, title, description, severity, status, source, location,
        "violationType", "detectionSnapshot", "detectionData",
        "worksiteId", "cameraId", "createdAt", "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        ${alertData.title},
        ${alertData.description},
        ${alertData.severity}::"AlertSeverity",
        ${alertData.status}::"AlertStatus",
        ${alertData.source},
        ${alertData.location},
        ${alertData.violationType},
        ${alertData.detectionSnapshot},
        ${JSON.stringify(alertData.detectionData)}::jsonb,
        ${WORKSITE_ID},
        ${cameraId},
        ${createdAt},
        ${createdAt}
      )
    `;
    
    console.log(`✅ Created: ${alertData.title} (${alertData.severity}, ${(alertData.detectionData.confidence * 100).toFixed(1)}% confidence)`);
  }

  console.log(`\n🎉 Successfully created 5 test alerts!`);
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

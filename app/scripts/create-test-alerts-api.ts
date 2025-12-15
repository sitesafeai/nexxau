/**
 * Create 5 test alerts for Highway Bridge Project using API
 * Run: npx tsx scripts/create-test-alerts-api.ts
 */

const WORKSITE_ID = 'cmha01l5h0005p98vyrfe3r0c'; // Highway Bridge Project

const testAlerts = [
  {
    title: 'Missing Hard Hat Detected',
    description: 'Worker detected without hard hat in Zone A - North Tower',
    severity: 'WARNING',
    source: 'camera',
    location: 'Zone A - North Tower',
    worksiteId: WORKSITE_ID,
    violationType: 'missing_helmet',
    detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
    detectionData: {
      confidence: 0.87,
      objects: [
        { class: 'person', confidence: 0.92, bbox: [120, 80, 200, 350] },
        { class: 'no_helmet', confidence: 0.87, bbox: [140, 85, 180, 120] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
    },
  },
  {
    title: 'Missing Safety Vest Detected',
    description: 'Worker in Zone B - Bridge Deck without high-visibility vest',
    severity: 'WARNING',
    source: 'camera',
    location: 'Zone B - Bridge Deck',
    worksiteId: WORKSITE_ID,
    violationType: 'missing_vest',
    detectionSnapshot: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
    detectionData: {
      confidence: 0.65,
      objects: [
        { class: 'person', confidence: 0.78, bbox: [300, 150, 450, 500] },
        { class: 'no_vest', confidence: 0.65, bbox: [320, 160, 430, 280] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
    },
  },
  {
    title: 'Restricted Zone Entry',
    description: 'Person detected entering restricted construction zone without authorization',
    severity: 'CRITICAL',
    source: 'camera',
    location: 'Zone C - Restricted Area',
    worksiteId: WORKSITE_ID,
    violationType: 'restricted_zone',
    detectionSnapshot: 'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=800&h=600&fit=crop',
    detectionData: {
      confidence: 0.92,
      objects: [
        { class: 'person', confidence: 0.95, bbox: [500, 200, 650, 550] },
        { class: 'restricted_zone', confidence: 0.92, bbox: [480, 180, 680, 600] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
    },
  },
  {
    title: 'Missing Safety Gloves',
    description: 'Worker handling materials without protective gloves in Zone D',
    severity: 'INFO',
    source: 'camera',
    location: 'Zone D - Material Storage',
    worksiteId: WORKSITE_ID,
    violationType: 'missing_gloves',
    detectionSnapshot: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&h=600&fit=crop',
    detectionData: {
      confidence: 0.45,
      objects: [
        { class: 'person', confidence: 0.68, bbox: [200, 100, 350, 450] },
        { class: 'no_gloves', confidence: 0.45, bbox: [220, 300, 330, 380] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
    },
  },
  {
    title: 'Missing Safety Goggles',
    description: 'Worker performing welding operations without eye protection',
    severity: 'CRITICAL',
    source: 'camera',
    location: 'Zone E - Welding Station',
    worksiteId: WORKSITE_ID,
    violationType: 'missing_goggles',
    detectionSnapshot: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=800&h=600&fit=crop',
    detectionData: {
      confidence: 0.78,
      objects: [
        { class: 'person', confidence: 0.85, bbox: [400, 120, 550, 480] },
        { class: 'welding_equipment', confidence: 0.82, bbox: [420, 200, 530, 280] },
        { class: 'no_goggles', confidence: 0.78, bbox: [430, 125, 520, 180] }
      ],
      modelVersion: 'yolo-v8-ppe-1.2.3',
    },
  },
];

async function main() {
  console.log('🚨 Creating 5 test alerts for Highway Bridge Project via API...\n');
  console.log('⚠️  Note: You need to be logged in. Make sure the server is running.\n');

  const createdAlerts = [];
  for (const alertData of testAlerts) {
    try {
      // Use fetch to call the API endpoint
      const response = await fetch('http://localhost:3000/api/alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(alertData),
      });

      if (response.ok) {
        const data = await response.json();
        createdAlerts.push(data.data);
        console.log(`✅ Created: ${alertData.title} (${alertData.severity})`);
        console.log(`   Confidence: ${(alertData.detectionData.confidence * 100).toFixed(1)}%`);
        console.log(`   ID: ${data.data.id}\n`);
      } else {
        const error = await response.json();
        console.error(`❌ Failed to create "${alertData.title}":`, error.error || error.message);
        console.log(`   Status: ${response.status}\n`);
      }
    } catch (error: any) {
      console.error(`❌ Error creating "${alertData.title}":`, error.message);
      console.log('   Make sure the server is running on http://localhost:3000\n');
    }
  }

  if (createdAlerts.length > 0) {
    console.log(`\n🎉 Successfully created ${createdAlerts.length} test alerts!`);
    console.log('\n💡 You can now test the False Positives tab in Super Admin dashboard!');
    console.log('   Go to: http://localhost:3000/super-admin → False Positives tab\n');
  } else {
    console.log('\n❌ No alerts were created. Check the errors above.');
    console.log('   Make sure:');
    console.log('   1. The server is running (npm run dev)');
    console.log('   2. You are logged in as a user with permissions');
    console.log('   3. The worksite ID is correct\n');
  }
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

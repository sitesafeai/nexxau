/**
 * Seed Worksites and Related Data
 * 
 * Run: node scripts/seed-worksites.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');

  // Get or create a company first
  let company = await prisma.company.findFirst();
  
  if (!company) {
    console.log('Creating company...');
    company = await prisma.company.create({
      data: {
        name: 'Nexxau Safety Solutions',
        companyName: 'nexxau',
        email: 'admin@nexxau.com',
        phone: '+1-555-0100',
        address: '100 Safety Blvd, New York, NY 10001'
      }
    });
    console.log('✅ Company created:', company.name);
  }

  // ============================================
  // 1. CREATE WORKSITES
  // ============================================
  console.log('\n📍 Creating worksites...');

  const worksites = [
    {
      name: 'Downtown Construction Site',
      worksiteName: 'downtown-site-a',
      address: '123 Main St, Downtown, NY 10013',
      cameraSystemType: 'hikvision'
    },
    {
      name: 'Industrial Warehouse',
      worksiteName: 'warehouse-queens',
      address: '456 Industrial Blvd, Queens, NY 11101',
      cameraSystemType: 'axis'
    },
    {
      name: 'Highway Bridge Project',
      worksiteName: 'bridge-brooklyn',
      address: '789 Bridge Rd, Brooklyn, NY 11201',
      cameraSystemType: 'mixed'
    }
  ];

  const createdWorksites = [];
  for (const wsData of worksites) {
    const existing = await prisma.worksite.findUnique({
      where: { worksiteName: wsData.worksiteName }
    });

    if (existing) {
      console.log(`  ⏭️  Skipping ${wsData.name} (already exists)`);
      createdWorksites.push(existing);
    } else {
      const worksite = await prisma.worksite.create({
        data: {
          ...wsData,
          companyId: company.id
        }
      });
      console.log(`  ✅ Created: ${worksite.name}`);
      createdWorksites.push(worksite);
    }
  }

  // ============================================
  // 2. CREATE WORKERS
  // ============================================
  console.log('\n👷 Creating workers...');

  for (const worksite of createdWorksites) {
    const workerCount = await prisma.worker.count({ where: { worksiteId: worksite.id } });
    
    if (workerCount === 0) {
      await prisma.worker.createMany({
        data: [
          {
            name: `Site Manager - ${worksite.name}`,
            email: `manager@${worksite.worksiteName}.com`,
            role: 'manager',
            worksiteId: worksite.id
          },
          {
            name: `Safety Officer - ${worksite.name}`,
            email: `safety@${worksite.worksiteName}.com`,
            role: 'safety_officer',
            worksiteId: worksite.id
          },
          {
            name: `Worker 1 - ${worksite.name}`,
            email: `worker1@${worksite.worksiteName}.com`,
            role: 'worker',
            worksiteId: worksite.id
          }
        ]
      });
      console.log(`  ✅ Created 3 workers for ${worksite.name}`);
    } else {
      console.log(`  ⏭️  ${worksite.name} already has ${workerCount} workers`);
    }
  }

  // ============================================
  // 3. CREATE SAFETY VIOLATIONS (Last 7 Days)
  // ============================================
  console.log('\n⚠️  Creating safety violations...');

  for (const worksite of createdWorksites) {
    const existingViolations = await prisma.safetyViolation.count({
      where: { worksiteId: worksite.id }
    });

    if (existingViolations === 0) {
      const violationTypes = [
        { type: 'no_hardhat', severity: 'high' },
        { type: 'no_safety_vest', severity: 'high' },
        { type: 'zone_breach', severity: 'critical' },
        { type: 'improper_ppe', severity: 'medium' },
        { type: 'unsafe_behavior', severity: 'medium' }
      ];

      const violations = [];
      for (let day = 0; day < 7; day++) {
        const date = new Date();
        date.setDate(date.getDate() - day);
        
        // Random 1-5 violations per day
        const numViolations = Math.floor(Math.random() * 5) + 1;
        
        for (let i = 0; i < numViolations; i++) {
          const vType = violationTypes[Math.floor(Math.random() * violationTypes.length)];
          const hour = Math.floor(Math.random() * 12) + 6; // 6AM - 6PM
          date.setHours(hour, Math.floor(Math.random() * 60), 0, 0);
          
          violations.push({
            worksiteId: worksite.id,
            violationType: vType.type,
            severity: vType.severity,
            description: `${vType.type.replace(/_/g, ' ')} detected`,
            location: `Zone ${Math.floor(Math.random() * 5) + 1}`,
            metadata: {
              confidence: 0.7 + Math.random() * 0.3,
              bbox: [100, 100, 200, 200]
            },
            detectedAt: new Date(date),
            resolved: false
          });
        }
      }

      await prisma.safetyViolation.createMany({ data: violations });
      console.log(`  ✅ Created ${violations.length} violations for ${worksite.name}`);
    } else {
      console.log(`  ⏭️  ${worksite.name} already has ${existingViolations} violations`);
    }
  }

  // ============================================
  // 4. CREATE SAMPLE ALERTS
  // ============================================
  console.log('\n🔔 Creating alerts...');

  for (const worksite of createdWorksites) {
    const existingAlerts = await prisma.alert.count({
      where: { worksiteId: worksite.id }
    });

    if (existingAlerts === 0) {
      const alerts = [];
      for (let i = 0; i < 5; i++) {
        const date = new Date();
        date.setHours(date.getHours() - i * 2);
        
        const statuses = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED'];
        const severities = ['CRITICAL', 'WARNING', 'INFO', 'EMERGENCY'];
        
        alerts.push({
          worksiteId: worksite.id,
          title: `Safety Alert ${i + 1}`,
          description: `Violation detected at ${worksite.name}`,
          severity: severities[i % severities.length],
          status: statuses[i % statuses.length],
          source: 'camera',
          location: `Zone ${Math.floor(Math.random() * 5) + 1}`,
          createdAt: date,
          resolvedAt: i > 1 ? new Date(date.getTime() + 600000) : null
        });
      }

      await prisma.alert.createMany({ data: alerts });
      console.log(`  ✅ Created ${alerts.length} alerts for ${worksite.name}`);
    } else {
      console.log(`  ⏭️  ${worksite.name} already has ${existingAlerts} alerts`);
    }
  }

  // ============================================
  // 5. CREATE GLOBAL SAFETY SCORE CONFIG
  // ============================================
  console.log('\n⚙️  Creating safety score config...');

  const existingConfig = await prisma.safetyScoreConfig.findFirst({
    where: { isGlobal: true }
  });

  if (!existingConfig) {
    await prisma.safetyScoreConfig.create({
      data: {
        isGlobal: true,
        alpha: 1.0,
        beta: 0.25,
        gamma: 1.0,
        alertWeightMin: 0.1,
        alertWeightMax: 2.0,
        defaultAlertWeight: 0.5,
        maxPenalty: 0.5,
        perTypeAlertCap: 50,
        lambda: 0.1,
        timeWindowSeconds: 300,
        spatialThresholdMeters: 10,
        safeDayBonusRate: 0.01,
        maxBonus: 0.10,
        safeDayThreshold: 7,
        minDetections: 100
      }
    });
    console.log('  ✅ Global safety score config created');
  } else {
    console.log('  ⏭️  Global config already exists');
  }

  console.log('\n✅ Database seeding complete!\n');
  console.log('Summary:');
  console.log(`  - ${createdWorksites.length} worksites`);
  console.log(`  - Workers, violations, and alerts added`);
  console.log(`  - Safety score config ready`);
  console.log('\n🚀 Your dashboard is ready with REAL DATA!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


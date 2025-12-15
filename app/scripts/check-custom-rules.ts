/**
 * Check all custom rules and their worksiteIds
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking all custom rules...\n');

  try {
    const allRules = await prisma.customRule.findMany({
      include: {
        worksite: {
          select: { id: true, name: true, worksiteName: true }
        },
        camera: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`Total rules found: ${allRules.length}\n`);

    if (allRules.length === 0) {
      console.log('⚠️  No custom rules found in database');
      return;
    }

    allRules.forEach((rule, index) => {
      console.log(`Rule ${index + 1}:`);
      console.log(`  ID: ${rule.id}`);
      console.log(`  Name: ${rule.name}`);
      console.log(`  Worksite ID: ${rule.worksiteId || 'NULL (no worksite assigned)'}`);
      console.log(`  Worksite: ${rule.worksite ? `${rule.worksite.name} (${rule.worksite.worksiteName})` : 'N/A'}`);
      console.log(`  Camera ID: ${rule.cameraId || 'NULL'}`);
      console.log(`  Camera: ${rule.camera ? rule.camera.name : 'N/A'}`);
      console.log(`  Active: ${rule.isActive}`);
      console.log(`  Created: ${rule.createdAt.toISOString()}`);
      console.log('');
    });

    // Group by worksiteId
    const byWorksite = allRules.reduce((acc, rule) => {
      const key = rule.worksiteId || 'NULL';
      if (!acc[key]) acc[key] = [];
      acc[key].push(rule);
      return acc;
    }, {} as Record<string, typeof allRules>);

    console.log('\n📊 Rules by Worksite:');
    Object.entries(byWorksite).forEach(([worksiteId, rules]) => {
      console.log(`  ${worksiteId}: ${rules.length} rule(s)`);
      rules.forEach(rule => {
        console.log(`    - ${rule.name} (${rule.id})`);
      });
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

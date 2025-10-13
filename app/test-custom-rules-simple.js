// Simple Test for Custom Rules Engine
const { PrismaClient } = require('@prisma/client');

async function testCustomRulesSimple() {
  console.log('🧪 Testing Custom Rules Engine (Simple)...\n');

  try {
    const prisma = new PrismaClient();

    // Test 1: Create a custom rule
    console.log('📝 Test 1: Creating a custom rule...');
    
    const customRule = {
      name: 'Hard Hat Violation Detection',
      description: 'Detects when workers are not wearing hard hats in construction areas',
      ruleType: 'object_detection',
      category: 'safety',
      severity: 'high',
      isActive: true,
      priority: 1,
      detectionCriteria: {
        requiredObjects: ['person'],
        restrictedAreas: [
          { name: 'Construction Zone A', bbox: [100, 100, 400, 300] }
        ]
      },
      triggerConditions: {
        type: 'object_missing',
        requiredObject: 'hardhat'
      },
      alertSettings: {
        smsEnabled: true,
        emailEnabled: false,
        dashboardEnabled: true
      },
      confidenceThreshold: 0.8,
      smsEnabled: true,
      smsRecipients: ['+13053315002'],
      cooldownMinutes: 15,
      maxAlertsPerHour: 10
    };

    const createdRule = await prisma.customRule.create({
      data: customRule
    });

    console.log('✅ Custom rule created successfully');
    console.log(`   Rule ID: ${createdRule.id}`);
    console.log(`   Rule: ${createdRule.name}`);
    console.log(`   Type: ${createdRule.ruleType}`);
    console.log(`   Category: ${createdRule.category}`);
    console.log(`   Severity: ${createdRule.severity}`);

    // Test 2: Create a rule trigger
    console.log('\n📝 Test 2: Creating a rule trigger...');
    
    const ruleTrigger = {
      ruleId: createdRule.id,
      triggerType: 'object_detected',
      confidence: 0.95,
      detectionData: {
        objects: [
          {
            class: 'person',
            confidence: 0.95,
            bbox: [150, 150, 200, 300],
            id: 'person-1'
          }
        ],
        timestamp: new Date(),
        metadata: {
          location: 'Construction Site A',
          cameraName: 'Main Entrance Camera'
        }
      },
      cameraId: 'test-camera-1',
      worksiteId: 'test-worksite-1',
      location: 'Construction Site A',
      timestamp: new Date()
    };

    const createdTrigger = await prisma.customRuleTrigger.create({
      data: ruleTrigger
    });

    console.log('✅ Rule trigger created successfully');
    console.log(`   Trigger ID: ${createdTrigger.id}`);
    console.log(`   Rule ID: ${createdTrigger.ruleId}`);
    console.log(`   Trigger Type: ${createdTrigger.triggerType}`);
    console.log(`   Confidence: ${createdTrigger.confidence}`);

    // Test 3: Create a rule violation
    console.log('\n📝 Test 3: Creating a rule violation...');
    
    const ruleViolation = {
      ruleId: createdRule.id,
      triggerId: createdTrigger.id,
      violationType: 'safety_object_missing',
      severity: 'high',
      description: 'Worker detected without hard hat in construction area',
      detectionData: {
        objects: [
          {
            class: 'person',
            confidence: 0.95,
            bbox: [150, 150, 200, 300],
            id: 'person-1'
          }
        ],
        matchedCriteria: {
          missingObject: 'hardhat'
        },
        confidence: 0.95
      },
      cameraId: 'test-camera-1',
      worksiteId: 'test-worksite-1',
      location: 'Construction Site A',
      detectedAt: new Date()
    };

    const createdViolation = await prisma.customRuleViolation.create({
      data: ruleViolation
    });

    console.log('✅ Rule violation created successfully');
    console.log(`   Violation ID: ${createdViolation.id}`);
    console.log(`   Rule ID: ${createdViolation.ruleId}`);
    console.log(`   Violation Type: ${createdViolation.violationType}`);
    console.log(`   Severity: ${createdViolation.severity}`);
    console.log(`   Description: ${createdViolation.description}`);

    // Test 4: Query rules with relationships
    console.log('\n📝 Test 4: Querying rules with relationships...');
    
    const rulesWithRelations = await prisma.customRule.findMany({
      include: {
        ruleTriggers: {
          orderBy: { timestamp: 'desc' },
          take: 5
        },
        ruleViolations: {
          orderBy: { detectedAt: 'desc' },
          take: 5
        },
        _count: {
          select: {
            ruleTriggers: true,
            ruleViolations: true
          }
        }
      }
    });

    console.log(`✅ Found ${rulesWithRelations.length} custom rules`);
    rulesWithRelations.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.name}`);
      console.log(`      Type: ${rule.ruleType}`);
      console.log(`      Category: ${rule.category}`);
      console.log(`      Severity: ${rule.severity}`);
      console.log(`      Triggers: ${rule._count.ruleTriggers}`);
      console.log(`      Violations: ${rule._count.ruleViolations}`);
      console.log(`      Active: ${rule.isActive}`);
    });

    // Test 5: Update rule
    console.log('\n📝 Test 5: Updating rule...');
    
    const updatedRule = await prisma.customRule.update({
      where: { id: createdRule.id },
      data: {
        triggerCount: { increment: 1 },
        lastTriggeredAt: new Date()
      }
    });

    console.log('✅ Rule updated successfully');
    console.log(`   Trigger Count: ${updatedRule.triggerCount}`);
    console.log(`   Last Triggered: ${updatedRule.lastTriggeredAt}`);

    // Test 6: Get rule statistics
    console.log('\n📝 Test 6: Getting rule statistics...');
    
    const totalRules = await prisma.customRule.count();
    const activeRules = await prisma.customRule.count({ where: { isActive: true } });
    const totalTriggers = await prisma.customRuleTrigger.count();
    const totalViolations = await prisma.customRuleViolation.count();

    console.log('✅ Rule statistics:');
    console.log(`   Total Rules: ${totalRules}`);
    console.log(`   Active Rules: ${activeRules}`);
    console.log(`   Total Triggers: ${totalTriggers}`);
    console.log(`   Total Violations: ${totalViolations}`);

    // Test 7: Clean up test data
    console.log('\n📝 Test 7: Cleaning up test data...');
    
    await prisma.customRuleViolation.deleteMany({
      where: { ruleId: createdRule.id }
    });
    
    await prisma.customRuleTrigger.deleteMany({
      where: { ruleId: createdRule.id }
    });
    
    await prisma.customRule.delete({
      where: { id: createdRule.id }
    });

    console.log('✅ Test data cleaned up successfully');

    await prisma.$disconnect();

    console.log('\n🎉 Custom Rules Engine Test Complete!');
    console.log('\n💡 What was tested:');
    console.log('   ✅ Custom rule creation');
    console.log('   ✅ Rule trigger creation');
    console.log('   ✅ Rule violation creation');
    console.log('   ✅ Database relationships');
    console.log('   ✅ Rule queries and statistics');
    console.log('   ✅ Rule updates');
    console.log('   ✅ Data cleanup');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Access the dashboard at: http://localhost:3000/dashboard/custom-rules');
    console.log('   2. Create rules through the web interface');
    console.log('   3. Test with real AI detection data');
    console.log('   4. Configure SMS notifications');
    console.log('   5. Monitor rule performance');

  } catch (error) {
    console.log('\n❌ Error during custom rules test:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testCustomRulesSimple();

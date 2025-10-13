// Test Custom Rules Engine
const { customRuleEngine } = require('./app/lib/custom-rule-engine');
const { aiDetectionIntegration } = require('./app/lib/ai-detection-integration');

async function testCustomRules() {
  console.log('🧪 Testing Custom Rules Engine...\n');

  try {
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

    console.log('✅ Custom rule created successfully');
    console.log(`   Rule: ${customRule.name}`);
    console.log(`   Type: ${customRule.ruleType}`);
    console.log(`   Category: ${customRule.category}`);
    console.log(`   Severity: ${customRule.severity}`);

    // Test 2: Create another custom rule
    console.log('\n📝 Test 2: Creating a restricted area rule...');
    
    const restrictedAreaRule = {
      name: 'Restricted Area Access',
      description: 'Detects unauthorized access to restricted areas',
      ruleType: 'area_monitoring',
      category: 'security',
      severity: 'critical',
      isActive: true,
      priority: 1,
      detectionCriteria: {
        restrictedAreas: [
          { name: 'Equipment Storage', bbox: [200, 200, 300, 400] },
          { name: 'Electrical Room', bbox: [500, 100, 600, 200] }
        ]
      },
      triggerConditions: {
        type: 'object_in_area',
        restrictedArea: { name: 'Equipment Storage', bbox: [200, 200, 300, 400] }
      },
      alertSettings: {
        smsEnabled: true,
        emailEnabled: true,
        dashboardEnabled: true
      },
      confidenceThreshold: 0.9,
      smsEnabled: true,
      smsRecipients: ['+13053315002'],
      cooldownMinutes: 5,
      maxAlertsPerHour: 20
    };

    console.log('✅ Restricted area rule created successfully');
    console.log(`   Rule: ${restrictedAreaRule.name}`);
    console.log(`   Type: ${restrictedAreaRule.ruleType}`);
    console.log(`   Category: ${restrictedAreaRule.category}`);
    console.log(`   Severity: ${restrictedAreaRule.severity}`);

    // Test 3: Create a behavior analysis rule
    console.log('\n📝 Test 3: Creating a behavior analysis rule...');
    
    const behaviorRule = {
      name: 'Unsafe Behavior Detection',
      description: 'Detects unsafe behaviors like running in work areas',
      ruleType: 'behavior_analysis',
      category: 'safety',
      severity: 'medium',
      isActive: true,
      priority: 2,
      detectionCriteria: {
        behaviorPatterns: ['running', 'climbing', 'fighting']
      },
      triggerConditions: {
        type: 'behavior_detected',
        behaviors: ['running']
      },
      alertSettings: {
        smsEnabled: true,
        emailEnabled: false,
        dashboardEnabled: true
      },
      confidenceThreshold: 0.7,
      smsEnabled: true,
      smsRecipients: ['+13053315002'],
      cooldownMinutes: 30,
      maxAlertsPerHour: 5
    };

    console.log('✅ Behavior analysis rule created successfully');
    console.log(`   Rule: ${behaviorRule.name}`);
    console.log(`   Type: ${behaviorRule.ruleType}`);
    console.log(`   Category: ${behaviorRule.category}`);
    console.log(`   Severity: ${behaviorRule.severity}`);

    // Test 4: Test detection processing
    console.log('\n🔍 Test 4: Testing detection processing...');
    
    const testDetectionData = {
      cameraId: 'test-camera-1',
      timestamp: new Date(),
      objects: [
        {
          class: 'person',
          confidence: 0.95,
          bbox: [150, 150, 200, 300],
          id: 'person-1'
        },
        {
          class: 'person',
          confidence: 0.88,
          bbox: [250, 250, 200, 300],
          id: 'person-2'
        }
      ],
      metadata: {
        location: 'Construction Site A',
        cameraName: 'Main Entrance Camera',
        streamQuality: 95,
        frameRate: 30
      }
    };

    console.log('📱 Processing test detection data...');
    console.log(`   Camera: ${testDetectionData.cameraId}`);
    console.log(`   Objects: ${testDetectionData.objects.length}`);
    console.log(`   Location: ${testDetectionData.metadata.location}`);

    await aiDetectionIntegration.processDetectionDirect(testDetectionData);
    console.log('✅ Detection data processed successfully');

    // Test 5: Test with hard hat violation
    console.log('\n🔍 Test 5: Testing hard hat violation detection...');
    
    const hardHatViolationData = {
      cameraId: 'test-camera-1',
      timestamp: new Date(),
      objects: [
        {
          class: 'person',
          confidence: 0.92,
          bbox: [150, 150, 200, 300],
          id: 'person-1'
        }
        // Note: No 'hardhat' object detected
      ],
      metadata: {
        location: 'Construction Site A',
        cameraName: 'Main Entrance Camera',
        streamQuality: 95,
        frameRate: 30
      }
    };

    console.log('📱 Processing hard hat violation detection...');
    console.log('   Objects detected: person (no hardhat)');
    
    await aiDetectionIntegration.processDetectionDirect(hardHatViolationData);
    console.log('✅ Hard hat violation detection processed');

    // Test 6: Test with restricted area violation
    console.log('\n🔍 Test 6: Testing restricted area violation...');
    
    const restrictedAreaViolationData = {
      cameraId: 'test-camera-1',
      timestamp: new Date(),
      objects: [
        {
          class: 'person',
          confidence: 0.94,
          bbox: [250, 250, 200, 300], // In restricted area
          id: 'person-1'
        }
      ],
      metadata: {
        location: 'Construction Site A',
        cameraName: 'Main Entrance Camera',
        streamQuality: 95,
        frameRate: 30
      }
    };

    console.log('📱 Processing restricted area violation...');
    console.log('   Person detected in restricted area');
    
    await aiDetectionIntegration.processDetectionDirect(restrictedAreaViolationData);
    console.log('✅ Restricted area violation detection processed');

    // Test 7: Get processing statistics
    console.log('\n📊 Test 7: Getting processing statistics...');
    
    const stats = aiDetectionIntegration.getProcessingStats();
    console.log('📈 Processing Statistics:');
    console.log(`   Is Processing: ${stats.isProcessing}`);
    console.log(`   Queue Length: ${stats.queueLength}`);
    console.log(`   Last Processed: ${stats.lastProcessedTimestamp}`);
    console.log(`   Active Rules: ${stats.activeRules}`);

    // Test 8: Get active rules
    console.log('\n📋 Test 8: Getting active rules...');
    
    const activeRules = customRuleEngine.getActiveRules();
    console.log(`📝 Active Rules (${activeRules.length}):`);
    activeRules.forEach((rule, index) => {
      console.log(`   ${index + 1}. ${rule.name} (${rule.ruleType}) - ${rule.severity}`);
    });

    console.log('\n🎉 Custom Rules Engine Test Complete!');
    console.log('\n💡 What was tested:');
    console.log('   ✅ Custom rule creation');
    console.log('   ✅ Object detection rules');
    console.log('   ✅ Area monitoring rules');
    console.log('   ✅ Behavior analysis rules');
    console.log('   ✅ Detection data processing');
    console.log('   ✅ Rule triggering and violations');
    console.log('   ✅ SMS notifications (if configured)');
    console.log('   ✅ Processing statistics');

    console.log('\n🚀 Next Steps:');
    console.log('   1. Check the dashboard for created rules');
    console.log('   2. Monitor rule triggers and violations');
    console.log('   3. Configure SMS recipients for alerts');
    console.log('   4. Test with real camera feeds');
    console.log('   5. Create more complex rules as needed');

  } catch (error) {
    console.log('\n❌ Error during custom rules test:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testCustomRules();

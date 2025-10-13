// Test Multi-Provider SMS Service
const { multiSmsService } = require('./app/lib/multi-sms-service');

async function testMultiSMS() {
  console.log('🧪 Testing Multi-Provider SMS Service...\n');

  try {
    // Check provider status
    console.log('📊 Provider Status:');
    const status = multiSmsService.getProviderStatus();
    status.forEach(provider => {
      console.log(`   ${provider.name}: ${provider.enabled ? '✅ Enabled' : '❌ Disabled'} (Priority: ${provider.priority})`);
    });

    const enabledProviders = multiSmsService.getEnabledProviders();
    console.log(`\n📱 Enabled Providers: ${enabledProviders.join(', ')}`);

    if (!multiSmsService.isAnyProviderEnabled()) {
      console.log('\n❌ No SMS providers are enabled!');
      console.log('💡 Please configure at least one SMS provider:');
      console.log('   1. Twilio: Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
      console.log('   2. AWS SNS: Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY');
      return;
    }

    // Test message
    const testMessage = '🧪 Test message from Nexxau Multi-SMS Service';
    const testPhoneNumber = '+13053315002'; // Replace with your test number

    console.log(`\n📱 Sending test SMS to ${testPhoneNumber}...`);
    console.log(`📝 Message: ${testMessage}`);

    const result = await multiSmsService.sendTestSMS(testPhoneNumber, testMessage);

    console.log('\n📊 Test Results:');
    console.log(`   Success: ${result.success ? '✅ Yes' : '❌ No'}`);
    console.log(`   Provider: ${result.provider}`);
    if (result.messageId) {
      console.log(`   Message ID: ${result.messageId}`);
    }
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }

    // Test safety violation SMS
    console.log('\n🚨 Testing Safety Violation SMS...');
    
    const violation = {
      violationType: 'hard_hat_violation',
      severity: 'high',
      location: 'Construction Site A',
      description: 'Worker detected without hard hat in restricted area',
      timestamp: new Date(),
      worksiteId: 'test-worksite',
      cameraId: 'test-camera'
    };

    const violationResult = await multiSmsService.sendSafetyViolationSMS(testPhoneNumber, violation);

    console.log('\n📊 Safety Violation SMS Results:');
    console.log(`   Success: ${violationResult.success ? '✅ Yes' : '❌ No'}`);
    console.log(`   Provider: ${violationResult.provider}`);
    if (violationResult.messageId) {
      console.log(`   Message ID: ${violationResult.messageId}`);
    }
    if (violationResult.error) {
      console.log(`   Error: ${violationResult.error}`);
    }

    console.log('\n🎉 Multi-Provider SMS Test Complete!');
    console.log('\n💡 Next Steps:');
    console.log('   1. Check your phone for the test messages');
    console.log('   2. Verify which provider successfully delivered');
    console.log('   3. Configure additional providers if needed');
    console.log('   4. Monitor delivery rates in production');

  } catch (error) {
    console.log('\n❌ Error during multi-SMS test:');
    console.log(`   Error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

// Run the test
testMultiSMS();

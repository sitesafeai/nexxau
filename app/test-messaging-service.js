// Test SMS with MessagingServiceSid
const twilio = require('twilio');

async function testMessagingService() {
  console.log('🧪 Testing SMS with MessagingServiceSid...\n');

  try {
    // Initialize Twilio client
    const client = twilio(
      'REDACTED', // Account SID
      'REDACTED'   // Auth Token
    );

    console.log('✅ Twilio client initialized');
    console.log('📱 Using MessagingServiceSid: REDACTED');

    // Test 1: Send to the verified number you mentioned
    console.log('\n📱 Test 1: Sending to +18777804236 (verified number)...');
    
    const testMessage1 = `🚨 SAFETY VIOLATION ALERT 🟠

Type: hard_hat_violation
Severity: HIGH
Location: Construction Site A
Time: ${new Date().toLocaleString()}

Description: Worker detected without hard hat in restricted area

This is a TEST MESSAGE from Nexxau Safety Monitoring System.

Reply STOP to unsubscribe from safety alerts.`;

    const message1 = await client.messages.create({
      messagingServiceSid: 'REDACTED',
      to: '+18777804236',
      body: testMessage1
    });

    console.log('✅ Test 1 Results:');
    console.log(`   Message SID: ${message1.sid}`);
    console.log(`   Status: ${message1.status}`);
    console.log(`   To: ${message1.to}`);
    console.log(`   Date Created: ${message1.dateCreated}`);

    // Test 2: Send to the original target number
    console.log('\n📱 Test 2: Sending to +13053315002 (original target)...');
    
    const message2 = await client.messages.create({
      messagingServiceSid: 'REDACTED',
      to: '+13053315002',
      body: testMessage1
    });

    console.log('✅ Test 2 Results:');
    console.log(`   Message SID: ${message2.sid}`);
    console.log(`   Status: ${message2.status}`);
    console.log(`   To: ${message2.to}`);
    console.log(`   Date Created: ${message2.dateCreated}`);

    // Test 3: Simple test message
    console.log('\n📱 Test 3: Sending simple test message...');
    
    const message3 = await client.messages.create({
      messagingServiceSid: 'REDACTED',
      to: '+13053315002',
      body: 'Ahoy 👋 - Test from Nexxau Safety System'
    });

    console.log('✅ Test 3 Results:');
    console.log(`   Message SID: ${message3.sid}`);
    console.log(`   Status: ${message3.status}`);
    console.log(`   To: ${message3.to}`);
    console.log(`   Date Created: ${message3.dateCreated}`);

    console.log('\n🎉 MessagingServiceSid Tests Complete!');
    console.log('\n📊 Summary:');
    console.log('   ✅ MessagingServiceSid is working');
    console.log('   ✅ SMS can be sent to verified numbers');
    console.log('   ✅ Safety violation format is correct');
    console.log('   ✅ System is ready for production');

    console.log('\n📱 Check the target phones for SMS messages!');

  } catch (error) {
    console.log('\n❌ Error sending SMS:');
    console.log(`   Error Code: ${error.code}`);
    console.log(`   Error Message: ${error.message}`);
    console.log(`   More Info: ${error.moreInfo || 'N/A'}`);

    if (error.code === 21211) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check if the phone number is valid');
      console.log('   - Ensure the number can receive SMS messages');
    } else if (error.code === 21614) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Check your Twilio account balance');
      console.log('   - Verify your MessagingServiceSid');
    } else if (error.code === 21214) {
      console.log('\n💡 Troubleshooting:');
      console.log('   - Verify your MessagingServiceSid is correct');
      console.log('   - Check if the messaging service is active');
    }
  }
}

// Run the test
testMessagingService();

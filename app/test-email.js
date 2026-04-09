/**
 * Quick Resend test script (same env as the app: RESEND_API_KEY, RESEND_FROM).
 */

const { Resend } = require('resend');
const fs = require('fs');

require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

async function testEmail() {
  console.log('🧪 Testing Resend configuration...\n');

  console.log('📁 Environment files found:');
  console.log('  .env:', fs.existsSync('.env') ? '✅' : '❌');
  console.log('  .env.local:', fs.existsSync('.env.local') ? '✅' : '❌');
  console.log('');

  const key = process.env.RESEND_API_KEY;
  if (!key || key === 'your_resend_api_key_here') {
    console.error('❌ Set RESEND_API_KEY in .env or .env.local');
    process.exit(1);
  }

  const from =
    process.env.RESEND_FROM?.trim() ||
    process.env.ALERT_FROM_EMAIL?.trim() ||
    process.env.FROM_EMAIL?.trim() ||
    'Nexxau <onboarding@resend.dev>';

  const to = process.env.TEST_EMAIL_TO?.trim() || process.env.RESEND_TEST_TO?.trim();
  if (!to) {
    console.error('❌ Set TEST_EMAIL_TO (or RESEND_TEST_TO) to the recipient address.');
    process.exit(1);
  }

  const resend = new Resend(key);
  const { data, error } = await resend.emails.send({
    from,
    to: [to],
    subject: 'Nexxau Resend test',
    html: '<p>If you received this, Resend is configured correctly.</p>',
  });

  if (error) {
    console.error('❌ Resend error:', error.message);
    process.exit(1);
  }

  console.log('✅ Sent. Email id:', data?.id);
  console.log('   To:', to);
}

testEmail().catch((e) => {
  console.error(e);
  process.exit(1);
});

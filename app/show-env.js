// Show what's actually in .env files
const fs = require('fs');

console.log('📋 Checking your .env files...\n');

if (fs.existsSync('.env')) {
  console.log('--- .env ---');
  const env = fs.readFileSync('.env', 'utf8');
  const lines = env.split('\n').filter(line => 
    (line.includes('SMTP') || line.includes('EMAIL') || line.includes('FROM')) && 
    !line.trim().startsWith('#')
  );
  if (lines.length > 0) {
    lines.forEach(line => console.log(line));
  } else {
    console.log('❌ No SMTP/EMAIL variables found in .env');
  }
  console.log('');
}

if (fs.existsSync('.env.local')) {
  console.log('--- .env.local ---');
  const envLocal = fs.readFileSync('.env.local', 'utf8');
  const lines = envLocal.split('\n').filter(line => 
    (line.includes('SMTP') || line.includes('EMAIL') || line.includes('FROM')) && 
    !line.trim().startsWith('#')
  );
  if (lines.length > 0) {
    lines.forEach(line => {
      // Hide password
      if (line.includes('PASSWORD')) {
        console.log(line.split('=')[0] + '=***HIDDEN***');
      } else {
        console.log(line);
      }
    });
  } else {
    console.log('❌ No SMTP/EMAIL variables found in .env.local');
  }
  console.log('');
}

console.log('💡 Add these exact variable names to your .env file:');
console.log('SMTP_HOST=smtp.gmail.com');
console.log('SMTP_PORT=587');
console.log('SMTP_SECURE=false');
console.log('SMTP_USER=your-email@gmail.com');
console.log('SMTP_PASSWORD=your-app-password');
console.log('FROM_EMAIL=your-email@gmail.com');
console.log('FROM_NAME=SiteSafe');
console.log('NEXT_PUBLIC_APP_URL=http://localhost:3005');


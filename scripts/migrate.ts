import { execSync } from 'child_process';
import { join } from 'path';

const prismaPath = join(process.cwd(), 'node_modules', '.bin', 'prisma');

try {
  // Generate Prisma Client
  console.log('Generating Prisma Client...');
  execSync(`${prismaPath} generate`, { stdio: 'inherit' });

  // Run migrations
  console.log('Running database migrations...');
  execSync(`${prismaPath} migrate deploy`, { stdio: 'inherit' });

  console.log('Database migration completed successfully!');
} catch (error) {
  console.error('Error during migration:', error);
  process.exit(1);
} 
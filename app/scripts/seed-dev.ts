/**
 * Local development seed script.
 * Run: npm run seed:dev -- --password <pw>
 *
 * Safety rules enforced here (not in an HTTP route):
 *   - Aborts if NODE_ENV === 'production'
 *   - Aborts if DATABASE_URL targets a non-local, non-supabase host unless --force is passed
 *   - Requires --password <pw> with min 12 chars; no hardcoded default
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

// ── arg parsing ───────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function flag(name: string): boolean {
  return args.includes(name);
}

function arg(name: string): string | undefined {
  const idx = args.indexOf(name);
  return idx !== -1 ? args[idx + 1] : undefined;
}

// ── guards ────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  console.error('ERROR: seed-dev.ts must not run in production (NODE_ENV=production).');
  process.exit(1);
}

const dbUrl = process.env.DATABASE_URL ?? '';
const isSafeHost =
  dbUrl.includes('localhost') ||
  dbUrl.includes('127.0.0.1') ||
  /\.supabase\.co/.test(dbUrl);

if (!isSafeHost && !flag('--force')) {
  console.error(
    'ERROR: DATABASE_URL does not appear to point to localhost or a *.supabase.co host.\n' +
      'If you intentionally want to seed a remote database, re-run with --force.\n' +
      `  DATABASE_URL starts with: ${dbUrl.slice(0, 40)}...`
  );
  process.exit(1);
}

const password = arg('--password');
if (!password) {
  console.error('ERROR: --password <pw> is required.');
  console.error('Usage: npm run seed:dev -- --password <at-least-12-chars>');
  process.exit(1);
}
if (password.length < 12) {
  console.error(`ERROR: password must be at least 12 characters (got ${password.length}).`);
  process.exit(1);
}

// ── seed ──────────────────────────────────────────────────────────────────────

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding development database...');

  const company = await prisma.company.create({
    data: {
      name: 'BuildSafe Construction Inc.',
      companyUsername: 'buildsafeinc',
      email: 'admin@buildsafeinc.com',
      phone: '+1-555-0123',
      address: '123 Construction Ave, Building City, BC 12345',
    },
  });

  const worksite = await prisma.worksite.create({
    data: {
      name: 'Downtown Office Tower',
      worksiteName: 'downtown-site-a',
      address: '456 Main Street, Downtown, BC 12345',
      cameraSystemType: 'advanced',
      companyId: company.id,
    },
  });

  await Promise.all([
    prisma.worker.create({
      data: {
        name: 'John Smith',
        email: 'john.smith@buildsafeinc.com',
        role: 'SITE_ADMIN',
        worksiteId: worksite.id,
        isClaimed: false,
      },
    }),
    prisma.worker.create({
      data: {
        name: 'Sarah Johnson',
        email: 'sarah.johnson@buildsafeinc.com',
        role: 'WORKER',
        worksiteId: worksite.id,
        isClaimed: false,
      },
    }),
    prisma.worker.create({
      data: {
        name: 'Mike Davis',
        email: 'mike.davis@buildsafeinc.com',
        role: 'WORKER',
        worksiteId: worksite.id,
        isClaimed: false,
      },
    }),
    prisma.worker.create({
      data: {
        name: 'Lisa Wilson',
        email: 'lisa.wilson@buildsafeinc.com',
        role: 'VIEWER',
        worksiteId: worksite.id,
        isClaimed: false,
      },
    }),
  ]);

  const hashedPassword = await bcrypt.hash(password, 12);
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@nexxau.com',
      password: hashedPassword,
      role: 'COMPANY_ADMIN',
      isActivated: true,
      approved: true,
    },
  });

  console.log('Done. Created:');
  console.log(`  company:   ${company.name} (${company.id})`);
  console.log(`  worksite:  ${worksite.name} (${worksite.id})`);
  console.log(`  adminUser: ${adminUser.email} (${adminUser.id})`);
}

seed()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

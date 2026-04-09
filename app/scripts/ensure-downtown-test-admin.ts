/**
 * Create or update a site admin for the Downtown Test (Main) worksite.
 *
 *   cd app && npx tsx scripts/ensure-downtown-test-admin.ts
 *
 * Optional: WORKSITE_ID=cml5... to target a specific worksite.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const EMAIL = 'admin@company.com';
const PASSWORD = 'password123';

async function main() {
  const worksiteIdEnv = process.env.WORKSITE_ID?.trim();
  const worksite = worksiteIdEnv
    ? await prisma.worksite.findUnique({ where: { id: worksiteIdEnv } })
    : await prisma.worksite.findFirst({
        where: {
          OR: [{ worksiteName: 'downtown-test' }, { name: 'Downtown Test (Main)' }],
        },
      });

  if (!worksite) {
    console.error(
      'Worksite not found. Set WORKSITE_ID or ensure a worksite named "Downtown Test (Main)" or worksiteName "downtown-test" exists.'
    );
    process.exit(1);
  }

  const hash = await bcrypt.hash(PASSWORD, 10);

  const existing = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (existing && existing.companyId && existing.companyId !== worksite.companyId) {
    console.error(
      `User ${EMAIL} already exists under another company (${existing.companyId}). Remove or change email first.`
    );
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      password: hash,
      name: 'Downtown Test Admin',
      role: 'SITE_ADMIN',
      companyId: worksite.companyId,
      worksiteId: worksite.id,
      isActivated: true,
      approved: true,
      onboardingComplete: true,
    },
    update: {
      password: hash,
      name: 'Downtown Test Admin',
      role: 'SITE_ADMIN',
      companyId: worksite.companyId,
      worksiteId: worksite.id,
      isActivated: true,
      approved: true,
      onboardingComplete: true,
    },
  });

  await prisma.worksiteUser.upsert({
    where: {
      userId_worksiteId: { userId: user.id, worksiteId: worksite.id },
    },
    create: {
      userId: user.id,
      worksiteId: worksite.id,
      role: 'ADMIN',
    },
    update: { role: 'ADMIN' },
  });

  console.log('Done.');
  console.log({
    email: EMAIL,
    role: user.role,
    worksiteUserRole: 'ADMIN',
    worksite: { id: worksite.id, name: worksite.name, worksiteName: worksite.worksiteName },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

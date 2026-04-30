import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { normalizeRole } from '@/app/lib/roles';

const WORKSITE_ADMIN_ROLES = new Set(['ADMIN']);

async function getAuthorizedUser(request: NextRequest, worksiteId: string) {
  const session = await getCachedSession(request);
  if (!session?.user) {
    return {
      denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  if (!worksiteId) {
    return {
      denied: NextResponse.json(
        { error: 'Worksite ID is required' },
        { status: 400 }
      ),
    };
  }

  const sessionRole = normalizeRole((session.user as { role?: string }).role);
  if (sessionRole === 'SUPER_ADMIN') {
    return { session, sessionRole, dbUser: null };
  }

  const userEmail = session.user.email;
  const sessionUserId = (session.user as { id?: string }).id;

  const slimSelect = {
    id: true,
    companyId: true,
    role: true,
    worksiteAccess: {
      where: { worksiteId },
      select: { worksiteId: true, role: true },
      take: 1,
    },
  } as const;

  let dbUser = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select: slimSelect,
      })
    : null;

  if (!dbUser && sessionUserId) {
    dbUser = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select: slimSelect,
    });
  }

  if (!dbUser) {
    return {
      denied: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  return {
    session,
    sessionRole: normalizeRole(dbUser.role || sessionRole),
    dbUser,
  };
}

/**
 * Returns null if the user may access the worksite, otherwise an error NextResponse.
 */
export async function enforceWorksiteAccess(
  request: NextRequest,
  worksiteId: string
): Promise<NextResponse | null> {
  const auth = await getAuthorizedUser(request, worksiteId);
  if ('denied' in auth) {
    return auth.denied;
  }

  if (auth.sessionRole === 'SUPER_ADMIN') {
    return null;
  }

  const { dbUser } = auth;
  const viaWorksiteAccess = dbUser.worksiteAccess.length > 0;
  const viaCompany =
    !!dbUser.companyId &&
    !!(await prisma.worksite.findFirst({
      where: { id: worksiteId, companyId: dbUser.companyId },
      select: { id: true },
    }));

  const hasAccess = viaWorksiteAccess || viaCompany;

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return null;
}

/**
 * Returns null if the user may mutate high-impact worksite configuration.
 */
export async function enforceWorksiteAdminAccess(
  request: NextRequest,
  worksiteId: string
): Promise<NextResponse | null> {
  const auth = await getAuthorizedUser(request, worksiteId);
  if ('denied' in auth) {
    return auth.denied;
  }

  if (auth.sessionRole === 'SUPER_ADMIN') {
    return null;
  }

  const { dbUser, sessionRole } = auth;
  const worksite = await prisma.worksite.findFirst({
    where: { id: worksiteId },
    select: { id: true, companyId: true },
  });

  if (!worksite) {
    return NextResponse.json({ error: 'Worksite not found' }, { status: 404 });
  }

  const isCompanyAdminForWorksite =
    sessionRole === 'COMPANY_ADMIN' &&
    !!dbUser.companyId &&
    dbUser.companyId === worksite.companyId;
  const worksiteRole = dbUser.worksiteAccess[0]?.role;
  const isWorksiteAdmin =
    !!worksiteRole && WORKSITE_ADMIN_ROLES.has(String(worksiteRole));

  if (!isCompanyAdminForWorksite && !isWorksiteAdmin) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return null;
}

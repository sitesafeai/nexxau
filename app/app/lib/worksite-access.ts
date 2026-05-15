import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { normalizeRole } from '@/app/lib/roles';

type EnforceWorksiteAccessOptions = {
  requireAdmin?: boolean;
  requireCompanyAdmin?: boolean;
};

/**
 * Returns null if the user may access the worksite, otherwise an error NextResponse.
 */
export async function enforceWorksiteAccess(
  request: NextRequest,
  worksiteId: string,
  options: EnforceWorksiteAccessOptions = {}
): Promise<NextResponse | null> {
  const session = await getCachedSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!worksiteId) {
    return NextResponse.json(
      { error: 'Worksite ID is required' },
      { status: 400 }
    );
  }

  const sessionRole = normalizeRole((session.user as { role?: string }).role);
  const isSuperAdmin = sessionRole === 'SUPER_ADMIN';

  if (isSuperAdmin) {
    return null;
  }

  const userEmail = session.user.email;
  const sessionUserId = (session.user as { id?: string }).id;

  const slimSelect = {
    id: true,
    companyId: true,
    worksiteId: true,
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
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const dbRole = normalizeRole(dbUser.role || sessionRole);
  const isCompanyAdmin = dbRole === 'COMPANY_ADMIN';
  const worksiteMembership = dbUser.worksiteAccess[0];
  const isWorksiteAdmin = worksiteMembership?.role === 'ADMIN';
  const worksite = await prisma.worksite.findUnique({
    where: { id: worksiteId },
    select: { id: true, companyId: true },
  });

  if (!worksite) {
    return NextResponse.json({ error: 'Worksite not found' }, { status: 404 });
  }

  const companyAdminForWorksite =
    isCompanyAdmin &&
    !!dbUser.companyId &&
    dbUser.companyId === worksite.companyId;

  if (options.requireCompanyAdmin) {
    return companyAdminForWorksite
      ? null
      : NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  if (options.requireAdmin) {
    const hasAdminAccess = companyAdminForWorksite || isWorksiteAdmin;
    return hasAdminAccess
      ? null
      : NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const hasAccess =
    !!worksiteMembership ||
    dbUser.worksiteId === worksiteId ||
    companyAdminForWorksite;

  if (!hasAccess) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  return null;
}

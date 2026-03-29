import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';

/**
 * Returns null if the user may access the worksite, otherwise an error NextResponse.
 */
export async function enforceWorksiteAccess(
  request: NextRequest,
  worksiteId: string
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

  const sessionRole = String(
    (session.user as { role?: string }).role || ''
  ).toUpperCase();
  const isSuperAdmin =
    sessionRole === 'SUPER_ADMIN' || sessionRole === 'SUPERADMIN';

  if (isSuperAdmin) {
    return null;
  }

  const userEmail = session.user.email;
  const sessionUserId = (session.user as { id?: string }).id;

  const slimSelect = {
    id: true,
    companyId: true,
    role: true,
    worksiteAccess: {
      where: { worksiteId },
      select: { worksiteId: true },
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

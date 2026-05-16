import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

type SessionLike = {
  user?: {
    id?: string | null;
    email?: string | null;
    role?: string | null;
    companyId?: string | null;
    worksiteId?: string | null;
  } | null;
} | null | undefined;

export type AccessDecision =
  | { allowed: true }
  | { allowed: false; status: 400 | 401 | 403 | 404; error: string };

export async function authorizeWorksiteAccess(
  session: SessionLike,
  worksiteId: string | null | undefined
): Promise<AccessDecision> {
  if (!session?.user) {
    return { allowed: false, status: 401, error: 'Unauthorized' };
  }

  if (!worksiteId) {
    return { allowed: false, status: 400, error: 'Worksite ID is required' };
  }

  const sessionRole = normalizeRole(session.user.role);
  if (sessionRole === 'SUPER_ADMIN') {
    return { allowed: true };
  }

  const slimSelect = {
    id: true,
    companyId: true,
    worksiteId: true,
    worksiteAccess: {
      where: { worksiteId },
      select: { worksiteId: true },
      take: 1,
    },
  } as const;

  const sessionUserId = session.user.id || undefined;
  const userEmail = session.user.email || undefined;

  let dbUser = sessionUserId
    ? await prisma.user.findUnique({
        where: { id: sessionUserId },
        select: slimSelect,
      })
    : null;

  if (!dbUser && userEmail) {
    dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      select: slimSelect,
    });
  }

  if (!dbUser) {
    return { allowed: false, status: 404, error: 'User not found' };
  }

  const directWorksiteAccess = dbUser.worksiteId === worksiteId;
  const viaWorksiteAccess = dbUser.worksiteAccess.length > 0;
  const viaCompany =
    !!dbUser.companyId &&
    !!(await prisma.worksite.findFirst({
      where: { id: worksiteId, companyId: dbUser.companyId },
      select: { id: true },
    }));

  if (!directWorksiteAccess && !viaWorksiteAccess && !viaCompany) {
    return { allowed: false, status: 403, error: 'Access denied' };
  }

  return { allowed: true };
}

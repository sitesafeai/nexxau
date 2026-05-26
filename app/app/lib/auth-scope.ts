import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

// Minimal session shape shared across getCachedSession / getServerSession / getSession
type SessionLike = {
  user?: {
    email?: string | null;
    role?: string | null;
  } | null;
};

type ScopeResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Enforces that the acting user belongs to the same company as the resource.
 * SUPER_ADMIN bypasses the check (and skips the DB lookup entirely).
 *
 * Returns { ok: true } on success, or { ok: false, status, error } to be returned
 * directly to the client.
 */
export async function enforceCompanyScope(opts: {
  session: SessionLike;
  resourceCompanyId: string | null;
}): Promise<ScopeResult> {
  const { session, resourceCompanyId } = opts;

  if (normalizeRole(session?.user?.role) === 'SUPER_ADMIN') {
    return { ok: true };
  }

  const actorCompanyId = await getActorCompanyId(session);

  if (!actorCompanyId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  if (actorCompanyId !== resourceCompanyId) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }

  return { ok: true };
}

/**
 * Returns the companyId for the acting user, or null if unresolvable.
 * Use this when you need to scope a query (rather than checking after the fetch).
 */
export async function getActorCompanyId(session: SessionLike): Promise<string | null> {
  const email = session?.user?.email;
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { companyId: true },
  });

  return user?.companyId ?? null;
}

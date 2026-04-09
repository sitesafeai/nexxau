import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * Ensures the current session is a platform super-admin (SUPER_ADMIN).
 */
export async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);
  if (!session?.user || role !== 'SUPER_ADMIN') {
    return {
      ok: false as const,
      response: NextResponse.json(
        { success: false, error: 'Forbidden — Super Admin access required' },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const, session };
}

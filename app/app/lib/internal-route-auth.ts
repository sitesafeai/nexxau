import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

const bearerToken = (request: Request) => {
  const authorization = request.headers.get('authorization') || '';
  const [scheme, token] = authorization.split(/\s+/);
  return scheme?.toLowerCase() === 'bearer' ? token : '';
};

/**
 * Protects endpoints that control local host processes or infrastructure.
 *
 * Browser callers must be platform super-admins. Server-to-server callers may
 * use INTERNAL_SERVICE_TOKEN, but only when the token is configured.
 */
export async function requireSuperAdminOrInternalToken(request: Request) {
  const configuredToken = process.env.INTERNAL_SERVICE_TOKEN;
  const suppliedToken = bearerToken(request);

  if (configuredToken && suppliedToken && suppliedToken === configuredToken) {
    return null;
  }

  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (session?.user && role === 'SUPER_ADMIN') {
    return null;
  }

  return NextResponse.json(
    { success: false, error: 'Forbidden' },
    { status: session?.user ? 403 : 401 }
  );
}

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import type { NextRequest } from 'next/server';

/** In-memory cache: session cookie value → { session, expiresAt } */
const cache = new Map<string, { session: Awaited<ReturnType<typeof getServerSession>>; expiresAt: number }>();
const TTL_MS = 60_000;

/**
 * Cache getServerSession by session cookie to avoid repeated DB hits on parallel API calls.
 */
export async function getCachedSession(req: NextRequest) {
  const token =
    req.cookies.get('next-auth.session-token')?.value ??
    req.cookies.get('__Secure-next-auth.session-token')?.value ??
    req.cookies.get('__Host-next-auth.session-token')?.value;

  if (!token) {
    return null;
  }

  const cached = cache.get(token);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.session;
  }

  const session = await getServerSession(authOptions);
  if (session) {
    cache.set(token, { session, expiresAt: Date.now() + TTL_MS });
    if (cache.size > 500) {
      const oldest = [...cache.keys()][0];
      cache.delete(oldest);
    }
  }
  return session;
}

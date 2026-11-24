import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { enforceWorksiteAccess } from '@/app/lib/worksite-access';

/**
 * Gate for /api/hls/* — the live camera video proxy.
 *
 * It used to forward any stream path to MediaMTX with the admin credentials and no
 * login check, so anyone with a camera's stream name could watch the feed.
 *
 * Players fetch a playlist/segment every 1–2 s and a DB round-trip here is ~300 ms, so
 * an allowed (session, stream) pair is remembered for 60 s. Revoking access therefore
 * takes up to a minute to bite on an already-open player — acceptable for video.
 */
const ALLOW_TTL_MS = 60_000;
const allowCache = new Map<string, number>(); // `${sessionToken}|${streamPath}` → expiresAt

function sessionToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get('__Secure-next-auth.session-token')?.value ??
    req.cookies.get('next-auth.session-token')?.value ??
    req.cookies.get('__Host-next-auth.session-token')?.value
  );
}

export async function enforceStreamAccess(
  request: NextRequest,
  streamPath: string
): Promise<NextResponse | null> {
  const token = sessionToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const key = `${token}|${streamPath}`;
  const until = allowCache.get(key);
  if (until && until > Date.now()) return null;

  const session = await getCachedSession(request);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = String((session.user as { role?: string }).role || '').toUpperCase();
  if (role !== 'SUPER_ADMIN' && role !== 'SUPERADMIN') {
    // Same three ways a stream path maps to a camera as /api/cameras/stream-event.
    const camera = await prisma.camera.findFirst({
      where: {
        OR: [
          { id: streamPath },
          { mediamtxPath: streamPath },
          { hlsUrl: { contains: `/${streamPath}/` } },
        ],
      },
      select: { worksiteId: true },
    });
    if (!camera?.worksiteId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const denied = await enforceWorksiteAccess(request, camera.worksiteId);
    if (denied) {
      return denied.status === 403 ? NextResponse.json({ error: 'Not found' }, { status: 404 }) : denied;
    }
  }

  if (allowCache.size > 5_000) allowCache.clear(); // crude bound; entries are cheap to rebuild
  allowCache.set(key, Date.now() + ALLOW_TTL_MS);
  return null;
}

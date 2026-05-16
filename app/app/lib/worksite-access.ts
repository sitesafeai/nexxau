import { NextRequest, NextResponse } from 'next/server';
import { getCachedSession } from '@/app/lib/session-cache';
import { authorizeWorksiteAccess } from '@/app/lib/access-control';

/**
 * Returns null if the user may access the worksite, otherwise an error NextResponse.
 */
export async function enforceWorksiteAccess(
  request: NextRequest,
  worksiteId: string
): Promise<NextResponse | null> {
  const session = await getCachedSession(request);
  const decision = await authorizeWorksiteAccess(session, worksiteId);
  if (decision.allowed) {
    return null;
  }
  return NextResponse.json({ error: decision.error }, { status: decision.status });
}

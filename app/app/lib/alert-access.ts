import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { enforceWorksiteAccess } from '@/app/lib/worksite-access';

/**
 * Tenant gate for every /api/alerts/[id]/* route.
 *
 * Returns null if the signed-in user may touch this alert, otherwise the response to
 * return. Before this existed, the per-alert routes only checked "is anyone logged in"
 * (and five didn't check even that), so a user from company A holding an alert id from
 * company B could read its snapshot/report or resolve it.
 *
 * - 401 if not signed in.
 * - Super admins pass.
 * - Otherwise the alert's worksite (or its camera's worksite) must pass
 *   enforceWorksiteAccess — same rule the dashboard summary routes already use.
 * - A foreign alert answers 404, not 403, so we never confirm to another tenant that
 *   an id exists.
 */
export async function enforceAlertAccess(
  request: NextRequest,
  alertId: string
): Promise<NextResponse | null> {
  const session = await getCachedSession(request);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const role = String((session.user as { role?: string }).role || '').toUpperCase();
  if (role === 'SUPER_ADMIN' || role === 'SUPERADMIN') return null;

  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { worksiteId: true, camera: { select: { worksiteId: true } } },
  });
  const worksiteId = alert?.worksiteId ?? alert?.camera?.worksiteId ?? null;
  if (!worksiteId) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }

  const denied = await enforceWorksiteAccess(request, worksiteId);
  if (denied && denied.status === 403) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
  }
  return denied;
}

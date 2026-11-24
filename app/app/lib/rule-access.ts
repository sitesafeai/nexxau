import { NextRequest, NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { enforceWorksiteAccess } from '@/app/lib/worksite-access';

/**
 * Tenant gates for /api/custom-rules.
 *
 * Before these existed the rules API had no login check at all: anyone who knew (or
 * listed) a rule id could read, edit, disable or delete another company's safety rules.
 * Foreign rules answer 404, not 403, so we never confirm an id exists to another tenant.
 */

export function isSuperAdmin(session: Session | null): boolean {
  const role = String((session?.user as { role?: string } | undefined)?.role || '').toUpperCase();
  return role === 'SUPER_ADMIN' || role === 'SUPERADMIN';
}

/** Gate for /api/custom-rules/[id]: signed in + the rule's worksite is accessible. */
export async function enforceRuleAccess(
  request: NextRequest,
  ruleId: string
): Promise<NextResponse | null> {
  const session = await getCachedSession(request);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isSuperAdmin(session)) return null;

  const rule = await prisma.customRule.findUnique({
    where: { id: ruleId },
    select: { worksiteId: true, camera: { select: { worksiteId: true } } },
  });
  const worksiteId = rule?.worksiteId ?? rule?.camera?.worksiteId ?? null;
  if (!worksiteId) return NextResponse.json({ error: 'Rule not found' }, { status: 404 });

  const denied = await enforceWorksiteAccess(request, worksiteId);
  if (denied && denied.status === 403) {
    return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
  }
  return denied;
}

/**
 * Gate for creating a rule. The target worksite is the explicit worksiteId, else the
 * worksite of the first camera given. Non-super-admins must name one they can access —
 * the old fallback ("first worksite in the database") could drop a rule into another
 * company's site.
 */
export async function enforceRuleCreateAccess(
  request: NextRequest,
  body: { worksiteId?: string | null; cameraId?: string | null; cameraIds?: unknown }
): Promise<NextResponse | null> {
  const session = await getCachedSession(request);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (isSuperAdmin(session)) return null;

  let worksiteId = body.worksiteId || null;
  const firstCamera =
    body.cameraId || (Array.isArray(body.cameraIds) ? (body.cameraIds.find(Boolean) as string | undefined) : undefined);
  if (!worksiteId && firstCamera) {
    const cam = await prisma.camera.findUnique({ where: { id: firstCamera }, select: { worksiteId: true } });
    worksiteId = cam?.worksiteId ?? null;
  }
  if (!worksiteId) {
    return NextResponse.json({ error: 'A worksite or camera is required' }, { status: 400 });
  }
  const denied = await enforceWorksiteAccess(request, worksiteId);
  if (denied) return denied;
  return enforceCamerasInWorksite(cameraIdList(body), worksiteId);
}

export function cameraIdList(body: { cameraId?: string | null; cameraIds?: unknown }): string[] {
  const ids = Array.isArray(body.cameraIds) ? (body.cameraIds.filter(Boolean) as string[]) : [];
  if (body.cameraId) ids.push(body.cameraId);
  return [...new Set(ids)];
}

/**
 * Every camera on a rule must sit in the rule's worksite. Otherwise a user could attach
 * their own rule to another company's camera and receive that company's alert emails
 * and snapshots.
 */
export async function enforceCamerasInWorksite(
  cameraIds: string[],
  worksiteId: string
): Promise<NextResponse | null> {
  if (cameraIds.length === 0) return null;
  const inSite = await prisma.camera.count({ where: { id: { in: cameraIds }, worksiteId } });
  if (inSite !== cameraIds.length) {
    return NextResponse.json({ error: 'Camera not found' }, { status: 404 });
  }
  return null;
}

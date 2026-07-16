/**
 * PATCH /api/company/users/[id]/worksite-access
 * Add or remove a company member's worksite assignments.
 * Requires COMPANY_ADMIN. Worksites must belong to the same company.
 *
 * Body: { add?: string[]; remove?: string[] }
 *   add    - worksite IDs to grant access to
 *   remove - worksite IDs to revoke access from
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { writeAuditLog } from '@/app/lib/audit';

async function requireCompanyAdmin(session: any) {
  const user = session?.user as any;
  const role = (user?.role || '').toUpperCase();
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(role)) return { ok: false, user: null };
  return { ok: true, user };
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const auth = await requireCompanyAdmin(session);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const companyId = auth.user!.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: 'No company on session' }, { status: 400 });
  }

  const { id: userId } = await params;

  let body: { add?: string[]; remove?: string[] };
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const toAdd = body.add ?? [];
  const toRemove = body.remove ?? [];

  if (toAdd.length === 0 && toRemove.length === 0) {
    return NextResponse.json({ success: false, error: 'No changes requested' }, { status: 400 });
  }

  try {
    // Verify target belongs to this company
    const target = await prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { companyId },
          { companyAccess: { some: { companyId } } },
          { worksiteAccess: { some: { worksite: { companyId } } } },
        ],
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found in your company' }, { status: 404 });
    }

    // Verify all worksites in toAdd/toRemove belong to this company
    const allWorksiteIds = [...new Set([...toAdd, ...toRemove])];
    if (allWorksiteIds.length > 0) {
      const owned = await prisma.worksite.findMany({
        where: { id: { in: allWorksiteIds }, companyId },
        select: { id: true },
      });
      const ownedIds = new Set(owned.map(w => w.id));
      const foreign = allWorksiteIds.filter(id => !ownedIds.has(id));
      if (foreign.length > 0) {
        return NextResponse.json(
          { success: false, error: 'One or more worksites do not belong to your company' },
          { status: 400 }
        );
      }
    }

    // Execute changes in a transaction
    await prisma.$transaction([
      // Remove
      ...(toRemove.length > 0
        ? [prisma.worksiteUser.deleteMany({ where: { userId, worksiteId: { in: toRemove } } })]
        : []),
      // Add (upsert via createMany + skipDuplicates)
      ...(toAdd.length > 0
        ? [
            prisma.worksiteUser.createMany({
              data: toAdd.map(worksiteId => ({
                userId,
                worksiteId,
                role: target.role,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
    ]);

    writeAuditLog({
      userId: auth.user!.id,
      action: 'USER_WORKSITE_ACCESS_CHANGED',
      entity: 'USER',
      entityId: userId,
      entityName: target.email || userId,
      companyId,
      severity: 'INFO',
      result: 'SUCCESS',
      details: { added: toAdd, removed: toRemove },
    }).catch(() => {});

    // Return fresh worksite access list
    const fresh = await prisma.worksiteUser.findMany({
      where: { userId, worksite: { companyId } },
      select: {
        worksiteId: true,
        worksite: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: fresh });
  } catch (error: any) {
    console.error('[company/users/worksite-access] PATCH failed:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to update worksite access' }, { status: 500 });
  }
}

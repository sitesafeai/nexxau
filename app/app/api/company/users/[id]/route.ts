/**
 * PATCH /api/company/users/[id]
 * Update a company member's role or activation status.
 * Requires COMPANY_ADMIN. Cannot escalate to COMPANY_ADMIN or SUPER_ADMIN.
 *
 * Body: { role?: string; isActivated?: boolean }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { writeAuditLog } from '@/app/lib/audit';

const ALLOWED_ROLES = ['SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'];

async function requireCompanyAdmin(session: any) {
  const user = session?.user as any;
  const role = (user?.role || '').toUpperCase();
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return { ok: false, user: null };
  }
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
  if (userId === auth.user!.id) {
    return NextResponse.json({ success: false, error: 'Cannot modify yourself' }, { status: 400 });
  }

  let body: any;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  // Validate
  if (body.role !== undefined && !ALLOWED_ROLES.includes(body.role)) {
    return NextResponse.json(
      { success: false, error: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` },
      { status: 400 }
    );
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
      select: { id: true, name: true, email: true, role: true, isActivated: true },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found in your company' }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    if (body.role !== undefined) updateData.role = body.role;
    if (body.isActivated !== undefined) updateData.isActivated = Boolean(body.isActivated);

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ success: false, error: 'Nothing to update' }, { status: 400 });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: { id: true, name: true, email: true, role: true, isActivated: true },
    });

    writeAuditLog({
      userId: auth.user!.id,
      action: body.role ? 'USER_ROLE_CHANGED' : 'USER_STATUS_CHANGED',
      entity: 'USER',
      entityId: userId,
      entityName: target.email || userId,
      companyId,
      severity: 'WARNING',
      result: 'SUCCESS',
      details: { before: { role: target.role, isActivated: target.isActivated }, after: updateData },
    }).catch(() => {});

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[company/users/[id]] PATCH failed:', error.message);
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

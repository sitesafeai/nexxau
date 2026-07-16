/**
 * GET /api/company/users
 * List all users in the current user's company.
 * Requires COMPANY_ADMIN role.
 *
 * DELETE /api/company/users?userId=xxx
 * Remove a user from the company (sets companyId = null, deactivates).
 * Requires COMPANY_ADMIN role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { writeAuditLog } from '@/app/lib/audit';

async function requireCompanyAdmin(session: any) {
  const user = session?.user as any;
  const role = user?.role || '';
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return { ok: false, user: null };
  }
  return { ok: true, user };
}

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireCompanyAdmin(session);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const companyId = auth.user!.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: 'No company on session' }, { status: 400 });
  }

  try {
    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActivated: true,
        createdAt: true,
        lastLogin: true,
        worksiteAccess: {
          select: {
            worksiteId: true,
            worksite: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('[company/users] GET failed:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const auth = await requireCompanyAdmin(session);
  if (!auth.ok) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const companyId = auth.user!.companyId;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }
  if (userId === auth.user!.id) {
    return NextResponse.json({ success: false, error: 'Cannot remove yourself' }, { status: 400 });
  }

  try {
    const target = await prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { companyId },
          { companyAccess: { some: { companyId } } },
          { worksiteAccess: { some: { worksite: { companyId } } } },
        ],
      },
      select: { id: true, name: true, email: true },
    });

    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found in your company' }, { status: 404 });
    }

    // Fully remove user from this company:
    // 1. Remove all worksite-level access records (WorksiteUser)
    // 2. Remove company-level junction records (CompanyUser / companyAccess)
    // 3. Clear companyId + worksiteId on the user record, deactivate
    //
    // This covers all four OR-clauses in listUsersForSuperAdmin so the user
    // stops appearing in the super-admin's company-filtered view.
    await prisma.$transaction([
      prisma.worksiteUser.deleteMany({ where: { userId } }),
      prisma.companyUser.deleteMany({ where: { userId, companyId } }),
      prisma.user.update({
        where: { id: userId },
        data: { companyId: null, worksiteId: null, isActivated: false },
      }),
    ]);

    writeAuditLog({
      userId: auth.user!.id,
      action: 'USER_REMOVED_FROM_COMPANY',
      entity: 'USER',
      entityId: userId,
      entityName: target.email || userId,
      companyId,
      severity: 'WARNING',
      result: 'SUCCESS',
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[company/users] DELETE failed:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to remove user' }, { status: 500 });
  }
}

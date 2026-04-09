import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import { signImpersonationToken } from '@/app/lib/impersonation-token';

/**
 * POST /api/admin/companies/[id]/impersonate
 * Returns a short-lived token; client opens /auth/impersonate?token=...
 * Optional body: { userId?: string } — defaults to first COMPANY_ADMIN in the company.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const superAdmin = await prisma.user.findUnique({
    where: { email: auth.session.user?.email || undefined },
    select: { id: true },
  });
  if (!superAdmin?.id) {
    return NextResponse.json({ success: false, error: 'Session user not found' }, { status: 400 });
  }

  try {
    const { id: companyId } = await params;
    let body: { userId?: string } = {};
    try {
      const text = await request.text();
      if (text.trim()) body = JSON.parse(text) as { userId?: string };
    } catch {
      body = {};
    }

    const company = await prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
      select: { id: true, suspended: true },
    });
    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }
    if (company.suspended) {
      return NextResponse.json(
        { success: false, error: 'Cannot impersonate a suspended company' },
        { status: 400 }
      );
    }

    let targetUserId = body.userId;
    if (targetUserId) {
      const u = await prisma.user.findFirst({
        where: { id: targetUserId, companyId },
        select: { id: true, role: true },
      });
      if (!u) {
        return NextResponse.json({ success: false, error: 'User not in this company' }, { status: 400 });
      }
    } else {
      const admin = await prisma.user.findFirst({
        where: {
          companyId,
          role: 'COMPANY_ADMIN',
        },
        orderBy: { createdAt: 'asc' },
        select: { id: true },
      });
      if (!admin) {
        return NextResponse.json(
          { success: false, error: 'No company administrator to impersonate' },
          { status: 400 }
        );
      }
      targetUserId = admin.id;
    }

    const token = signImpersonationToken({
      targetUserId,
      companyId,
      adminId: superAdmin.id,
    });

    return NextResponse.json({
      success: true,
      data: { token, userId: targetUserId, companyId },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create impersonation token';
    console.error('[admin][companies][impersonate]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

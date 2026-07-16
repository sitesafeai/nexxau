/**
 * POST /api/company/users/[id]/reset-password
 * Send a password-reset email to a company member.
 * Requires COMPANY_ADMIN role and the target must belong to the same company.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { generateInviteToken, getTokenExpiry } from '@/app/lib/token-utils';
import { sendPasswordResetEmail } from '@/app/lib/email-service';
import { writeAuditLog } from '@/app/lib/audit';

async function requireCompanyAdmin(session: any) {
  const user = session?.user as any;
  const role = (user?.role || '').toUpperCase();
  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(role)) return { ok: false, user: null };
  return { ok: true, user };
}

export async function POST(
  _request: NextRequest,
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
      select: { id: true, name: true, email: true, isActivated: true },
    });

    if (!target || !target.email) {
      return NextResponse.json({ success: false, error: 'User not found in your company' }, { status: 404 });
    }

    if (!target.isActivated) {
      return NextResponse.json(
        { success: false, error: 'User has not activated their account yet — use Resend Invite instead' },
        { status: 409 }
      );
    }

    // Generate reset token (reuses verificationToken field, same as /api/auth/forgot-password)
    const resetToken = generateInviteToken();
    const resetExpires = getTokenExpiry(1); // 1 hour

    await prisma.user.update({
      where: { id: userId },
      data: { verificationToken: resetToken, inviteExpires: resetExpires },
    });

    const emailResult = await sendPasswordResetEmail(
      target.email,
      target.name || 'User',
      resetToken
    );

    if (!emailResult.success) {
      console.error('[company/users/reset-password] Email failed:', emailResult.error);
    }

    writeAuditLog({
      userId: auth.user!.id,
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entity: 'USER',
      entityId: userId,
      entityName: target.email,
      companyId,
      severity: 'WARNING',
      result: 'SUCCESS',
      details: { initiatedBy: 'company_admin', email: target.email },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Password reset email sent' });
  } catch (error: any) {
    console.error('[company/users/reset-password] failed:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to send reset email' }, { status: 500 });
  }
}

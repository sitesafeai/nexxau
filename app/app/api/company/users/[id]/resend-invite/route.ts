/**
 * POST /api/company/users/[id]/resend-invite
 * Resend the activation invite to a pending (not yet activated) company member.
 * Requires COMPANY_ADMIN. Target must be in the same company and not yet activated.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { generateInviteToken, getTokenExpiry } from '@/app/lib/token-utils';
import { sendInvitationEmail } from '@/app/lib/email-service';
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
      select: {
        id: true, name: true, email: true, role: true,
        isActivated: true, onboardingComplete: true,
        worksiteAccess: {
          take: 1,
          select: {
            worksiteId: true,
            worksite: { select: { id: true, name: true, companyId: true } },
          },
        },
        company: { select: { id: true, name: true } },
      },
    });

    if (!target || !target.email) {
      return NextResponse.json({ success: false, error: 'User not found in your company' }, { status: 404 });
    }

    if (target.isActivated) {
      return NextResponse.json(
        { success: false, error: 'User is already activated — use Send Password Reset instead' },
        { status: 409 }
      );
    }

    // Generate a fresh invite token (invalidates any old token)
    const newToken = generateInviteToken();
    const newExpires = getTokenExpiry(24); // 24 hours

    await prisma.user.update({
      where: { id: userId },
      data: { inviteToken: newToken, inviteExpires: newExpires },
    });

    // Grab worksite info if available
    const firstAccess = target.worksiteAccess[0];
    const worksiteId = firstAccess?.worksiteId;
    const worksiteName = firstAccess?.worksite?.name || 'your worksite';
    const companyName = target.company?.name;

    const emailResult = await sendInvitationEmail(
      target.email,
      auth.user!.name || 'Administrator',
      target.role,
      worksiteName,
      newToken,
      companyName,
      companyId,
      worksiteId
    );

    if (!emailResult.success) {
      console.error('[company/users/resend-invite] Email failed:', emailResult.error);
    }

    writeAuditLog({
      userId: auth.user!.id,
      action: 'INVITATION_RESENT',
      entity: 'USER',
      entityId: userId,
      entityName: target.email,
      companyId,
      severity: 'INFO',
      result: 'SUCCESS',
      details: { email: target.email, initiatedBy: 'company_admin' },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Invite email resent' });
  } catch (error: any) {
    console.error('[company/users/resend-invite] failed:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to resend invite' }, { status: 500 });
  }
}

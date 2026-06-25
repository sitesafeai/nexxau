import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendPendingApprovalNotification } from '@/app/lib/email-service';

/**
 * POST /api/invitations/claim
 * Claim an invitation and activate account
 *
 * Body: {
 *   token: string;
 *   name: string;
 *   password: string;
 *   phone?: string;
 *   timezone?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password, phone, timezone } = body;

    if (!token || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find user by invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if already activated
    if (user.isActivated) {
      return NextResponse.json(
        { success: false, error: 'This invitation has already been used' },
        { status: 409 }
      );
    }

    // Check if expired
    if (user.inviteExpires && new Date(user.inviteExpires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user with account details — approved stays false until an admin approves
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        password: hashedPassword,
        phoneNumber: phone,
        timezone: timezone || 'America/New_York',
        isActivated: true,
        onboardingComplete: true,
        emailVerified: new Date(),
        inviteToken: null,
        inviteExpires: null,
      },
    });

    console.log('✅ Account claimed successfully:', updatedUser.email);

    // Notify company admins that a new user is awaiting approval — fire-and-forget
    if (updatedUser.companyId) {
      notifyAdminsOfPendingApproval(updatedUser).catch((err) =>
        console.error('[claim] Admin notification failed:', err)
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Error claiming invitation:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create account',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

/**
 * Find all COMPANY_ADMIN / ADMIN users in the same company and email them.
 * Runs fire-and-forget — never throws to the caller.
 */
async function notifyAdminsOfPendingApproval(newUser: {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  companyId: string | null;
}) {
  if (!newUser.companyId) return;

  const [admins, company] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyId: newUser.companyId,
        role: { in: ['COMPANY_ADMIN', 'SUPER_ADMIN'] },
        // Don't email the user themselves (edge case: they were re-invited as admin)
        id: { not: newUser.id },
        isActivated: true,
        approved: true,
      },
      select: { email: true, name: true },
    }),
    prisma.company.findUnique({
      where: { id: newUser.companyId },
      select: { name: true },
    }),
  ]);

  if (!admins.length) {
    console.log('[claim] No active company admins to notify for company', newUser.companyId);
    return;
  }

  const companyName = company?.name ?? 'your company';

  for (const admin of admins) {
    if (!admin.email) continue;
    await sendPendingApprovalNotification({
      adminEmail: admin.email,
      adminName: admin.name,
      newUserName: newUser.name ?? newUser.email ?? 'Unknown',
      newUserEmail: newUser.email ?? '',
      newUserRole: newUser.role,
      companyName,
    }).catch((err) =>
      console.error('[claim] Email to admin', admin.email, 'failed:', err)
    );
  }

  console.log(
    `[claim] Notified ${admins.length} admin(s) about pending approval for ${newUser.email}`
  );
}

/**
 * PATCH /api/users/[id]/password
 * Change a user's own password. Requires current password to be verified first.
 * Admins cannot use this to bypass current-password verification on someone else's account —
 * that's intentional; admin resets go through the forgot-password email flow.
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { writeAuditLog } from '@/app/lib/audit';

const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const currentUser = session?.user;

    if (!currentUser) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Users may only change their own password
    if (currentUser.id !== id) {
      return NextResponse.json(
        { success: false, error: 'You can only change your own password' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'All password fields are required' },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: 'New passwords do not match' },
        { status: 400 }
      );
    }

    if (!PASSWORD_REGEX.test(newPassword)) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Password must be at least 8 characters and contain uppercase, lowercase, a number, and a special character (@$!%*?&)',
        },
        { status: 400 }
      );
    }

    // Fetch current hash — never expose it to the client
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, email: true, name: true, password: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (!user.password) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Your account was created via an invitation link and does not have a password set. Use the forgot-password flow to create one.',
        },
        { status: 400 }
      );
    }

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      writeAuditLog({
        userId: id,
        action: 'USER_PASSWORD_CHANGE_FAILED',
        entity: 'USER',
        entityId: id,
        entityName: user.email || id,
        severity: 'WARNING',
        result: 'FAILURE',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
        details: { reason: 'wrong_current_password' },
      }).catch(() => {});

      return NextResponse.json(
        { success: false, error: 'Current password is incorrect' },
        { status: 401 }
      );
    }

    // Hash and save
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    writeAuditLog({
      userId: id,
      action: 'USER_PASSWORD_CHANGED',
      entity: 'USER',
      entityId: id,
      entityName: user.email || id,
      severity: 'WARNING',
      result: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      details: { changedBy: 'self' },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'Password updated successfully' });
  } catch (error: any) {
    console.error('[Password Change] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update password' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/reset-password
 * Reset password using token from email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { isValidTokenFormat, isTokenExpired } from '@/app/lib/token-utils';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password, passwordConfirm } = body;

    // Validation
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Reset token is required' },
        { status: 400 }
      );
    }

    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token format' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must be at least 8 characters and contain: uppercase, lowercase, number, and special character (@$!%*?&)' 
        },
        { status: 400 }
      );
    }

    // Find user by reset token (stored in verificationToken)
    const user = await prisma.user.findUnique({
      where: { verificationToken: token },
      select: {
        id: true,
        email: true,
        inviteExpires: true, // Using this to store reset expiry
        isActivated: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired reset token' },
        { status: 404 }
      );
    }

    // Check if token is expired (using inviteExpires for reset expiry)
    if (isTokenExpired(user.inviteExpires)) {
      return NextResponse.json(
        { success: false, error: 'Reset token has expired. Please request a new password reset.' },
        { status: 410 }
      );
    }

    // Check if user is activated
    if (!user.isActivated) {
      return NextResponse.json(
        { success: false, error: 'Account is not activated. Please complete account setup first.' },
        { status: 400 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        verificationToken: null, // Clear reset token
        inviteExpires: null
      }
    });

    console.log('[PASSWORD RESET] Password reset successful for:', user.email);

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'PASSWORD_RESET',
        entityType: 'User',
        entityId: user.id,
        metadata: {
          email: user.email,
          resetAt: new Date().toISOString()
        }
      }
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Password has been reset successfully. You can now log in with your new password.'
    });

  } catch (error: any) {
    console.error('[PASSWORD RESET] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to reset password', details: error.message },
      { status: 500 }
    );
  }
}


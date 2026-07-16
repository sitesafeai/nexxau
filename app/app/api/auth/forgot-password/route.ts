/**
 * POST /api/auth/forgot-password
 * Request a password reset email
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { generateInviteToken, getTokenExpiry } from '@/app/lib/token-utils';
import { sendPasswordResetEmail } from '@/app/lib/email-service';
import { writeAuditLog } from '@/app/lib/audit';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: {
        id: true,
        email: true,
        name: true,
        isActivated: true
      }
    });

    // Always return success (don't reveal if email exists)
    // This prevents email enumeration attacks
    if (!user) {
      console.log('[PASSWORD RESET] Email not found (security: not revealing):', email);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Check if user is activated
    if (!user.isActivated) {
      console.log('[PASSWORD RESET] User not activated:', user.email);
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, a password reset link has been sent.'
      });
    }

    // Generate reset token (reuse verificationToken field)
    const resetToken = generateInviteToken();
    const resetExpires = getTokenExpiry(1); // 1 hour expiry for password reset

    // Store reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verificationToken: resetToken,
        // We'll use inviteExpires temporarily to store reset expiry
        // Or we could add a resetTokenExpires field, but for now use inviteExpires
        inviteExpires: resetExpires
      }
    });

    console.log('[PASSWORD RESET] Token generated for:', user.email);

    // Audit: log the request (not the token itself)
    writeAuditLog({
      userId: user.id,
      action: 'USER_PASSWORD_RESET_REQUESTED',
      entity: 'USER',
      entityId: user.id,
      entityName: user.email,
      severity: 'WARNING',
      result: 'SUCCESS',
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
      details: { email: user.email, expiresAt: resetExpires.toISOString() },
    }).catch(() => {});

    // Send password reset email
    const emailResult = await sendPasswordResetEmail(
      user.email,
      user.name || 'User',
      resetToken
    );

    if (!emailResult.success) {
      console.error('[PASSWORD RESET] Failed to send email:', emailResult.error);
      // Don't fail the request - user doesn't need to know email failed
      // But log it for debugging
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });

  } catch (error: any) {
    console.error('[PASSWORD RESET] Error:', error);
    // Always return success to prevent email enumeration
    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, a password reset link has been sent.'
    });
  }
}


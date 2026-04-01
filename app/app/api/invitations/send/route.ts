import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvitationEmail } from '@/lib/email-service';
import crypto from 'crypto';

/**
 * POST /api/invitations/send
 * Send invitation email to create an account
 * 
 * Body: {
 *   email: string;
 *   role: UserRole;
 *   worksiteId?: string;  // For site-level invites
 *   companyId?: string;   // For company-level invites
 *   invitedBy: string;    // User ID of inviter
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, role, worksiteId, companyId, invitedBy } = body;

    if (!email || !role || !invitedBy) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, role, invitedBy' },
        { status: 400 }
      );
    }

    // Company is now required
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'Company is required for invitations' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Enforce one-email-one-company. If the email already belongs to a different company, reject.
      if (existingUser.companyId && existingUser.companyId !== companyId) {
        return NextResponse.json(
          { success: false, error: 'This email address is already registered to a different company.' },
          { status: 409 }
        );
      }

      // If user exists and is activated
      if (existingUser.isActivated) {
        return NextResponse.json(
          { success: false, error: 'User with this email already exists' },
          { status: 409 }
        );
      }
      
      // If user exists but not activated, resend invitation
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date();
      expires.setHours(expires.getHours() + 72); // 72 hour expiry

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          inviteToken: token,
          inviteExpires: expires,
          invitedBy
        }
      });

      // Fetch inviter and company info
      const inviter = await prisma.user.findUnique({ where: { id: invitedBy } });
      const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
      
      // Send invitation email
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/auth/claim-account?token=${token}`;
      
      console.log('📧 RESENDING invitation email to:', email);
      console.log('🔗 Invite URL:', inviteUrl);

      // Send email and wait for it to complete
      try {
        const emailResult = await sendInvitationEmail(
          email,
          inviter?.name || 'Admin',
          role,
          company?.name || 'Your Organization',
          token
        );
        
        if (!emailResult.success) {
          console.error('Failed to resend invitation email:', emailResult.error);
          // Don't fail the whole request, but log it
        } else {
          console.log('✅ Invitation email resent successfully to:', email);
        }
      } catch (emailError: any) {
        console.error('Error resending invitation email:', emailError);
        // Don't fail the whole request, but log it
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation resent',
        data: {
          userId: existingUser.id,
          email,
          inviteUrl, // Return for development
          expiresAt: expires
        }
      });
    }

    // Create new user with invitation
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 72); // 72 hour expiry

    const newUser = await prisma.user.create({
      data: {
        email,
        role,
        inviteToken: token,
        inviteExpires: expires,
        invitedBy,
        isActivated: false,
        approved: true, // Pre-approved since invited
        companyId,
        worksiteId
      }
    });

    // Add to worksite access if specified
    if (worksiteId) {
      await prisma.worksiteUser.create({
        data: {
          userId: newUser.id,
          worksiteId,
          role: role === 'SITE_ADMIN' ? 'ADMIN' : 'WORKER'
        }
      });
    }

    // Add to company access if specified
    if (companyId) {
      await prisma.companyUser.create({
        data: {
          userId: newUser.id,
          companyId,
          role: role === 'COMPANY_ADMIN' ? 'ADMIN' : 'VIEWER'
        }
      });
    }

    // Fetch inviter and company info
    const inviter = await prisma.user.findUnique({ where: { id: invitedBy } });
    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
    
    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/auth/claim-account?token=${token}`;
    
    console.log('📧 Sending invitation email to:', email);
    console.log('🔗 Invite URL:', inviteUrl);
    console.log('👤 Role:', role);
    console.log('⏰ Expires:', expires);

    // Send email and wait for it to complete
    try {
      const emailResult = await sendInvitationEmail(
        email,
        inviter?.name || 'Admin',
        role,
        company?.name || 'Your Organization',
        token
      );
      
      if (!emailResult.success) {
        console.error('Failed to send invitation email:', emailResult.error);
        // Don't fail the whole request, but log it
      } else {
        console.log('✅ Invitation email sent successfully to:', email);
      }
    } catch (emailError: any) {
      console.error('Error sending invitation email:', emailError);
      // Don't fail the whole request, but log it
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        userId: newUser.id,
        email,
        inviteUrl, // Return for development testing
        expiresAt: expires
      }
    });

  } catch (error: any) {
    console.error('Error sending invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to send invitation', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}


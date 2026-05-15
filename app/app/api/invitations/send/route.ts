import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '@/app/lib/auth';
import { sendInvitationEmail } from '@/app/lib/email-service';
import { normalizeRole } from '@/app/lib/roles';
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
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { email, role, worksiteId, companyId } = body;

    if (typeof email !== 'string' || typeof role !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: email, role' },
        { status: 400 }
      );
    }

    const inviteRole = normalizeRole(role);

    // Company is now required
    if (typeof companyId !== 'string' || !companyId) {
      return NextResponse.json(
        { success: false, error: 'Company is required for invitations' },
        { status: 400 }
      );
    }

    if (worksiteId !== undefined && typeof worksiteId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid worksite ID' },
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

    const platformInviteRoles = [
      'SUPER_ADMIN',
      'COMPANY_ADMIN',
      'SITE_ADMIN',
      'SUPERVISOR',
      'WORKER',
      'VIEWER',
      'SALES_ADMIN',
      'MARKETING_ADMIN',
      'OPERATIONS_ADMIN',
      'SAFETY_ADMIN',
      'FINANCE_ADMIN',
      'HR_ADMIN',
      'SUPPORT_ADMIN',
      'CUSTOMER_SUCCESS',
    ];
    const tenantInviteRoles = ['COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'];
    if (!platformInviteRoles.includes(inviteRole)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role' },
        { status: 400 }
      );
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, companyId: true, role: true },
    });
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Inviting user not found' },
        { status: 404 }
      );
    }

    const currentRole = normalizeRole(currentUser.role || session.user.role);
    const isSuperAdmin = currentRole === 'SUPER_ADMIN';
    const isCompanyAdmin = currentRole === 'COMPANY_ADMIN';
    if (!isSuperAdmin && !isCompanyAdmin) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to send invitations' },
        { status: 403 }
      );
    }

    if (isCompanyAdmin) {
      if (!currentUser.companyId || currentUser.companyId !== companyId) {
        return NextResponse.json(
          { success: false, error: 'Cannot invite users outside your company' },
          { status: 403 }
        );
      }
      if (!tenantInviteRoles.includes(inviteRole)) {
        return NextResponse.json(
          { success: false, error: 'Cannot invite users with platform administrator roles' },
          { status: 403 }
        );
      }
    }

    if (worksiteId) {
      const worksite = await prisma.worksite.findUnique({
        where: { id: worksiteId },
        select: { id: true, companyId: true },
      });
      if (!worksite) {
        return NextResponse.json(
          { success: false, error: 'Worksite not found' },
          { status: 404 }
        );
      }
      if (worksite.companyId !== companyId) {
        return NextResponse.json(
          { success: false, error: 'Worksite does not belong to the invitation company' },
          { status: 400 }
        );
      }
    }

    const invitedBy = currentUser.id;
    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
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
      const inviter = currentUser;
      const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
      
      // Send invitation email
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/auth/claim-account?token=${token}`;
      
      console.log('📧 RESENDING invitation email to:', normalizedEmail);
      console.log('🔗 Invite URL:', inviteUrl);

      // Send email and fail request if delivery fails.
      try {
        const emailResult = await sendInvitationEmail(
          normalizedEmail,
          inviter?.name || 'Admin',
          inviteRole,
          company?.name || 'Your Organization',
          token
        );

        if (!emailResult.success) {
          console.error('Failed to resend invitation email:', emailResult.error);
          return NextResponse.json(
            {
              success: false,
              error: 'Failed to send invitation email via Resend',
              details: emailResult.error || 'Unknown email delivery error',
            },
            { status: 502 }
          );
        }

        console.log('✅ Invitation email resent successfully to:', normalizedEmail);
      } catch (emailError: any) {
        console.error('Error resending invitation email:', emailError);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to send invitation email via Resend',
            details: emailError?.message || 'Unknown email delivery error',
          },
          { status: 502 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Invitation resent',
        data: {
          userId: existingUser.id,
          email: normalizedEmail,
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
        email: normalizedEmail,
        role: inviteRole,
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
          role:
            inviteRole === 'SITE_ADMIN' ? 'ADMIN' :
            inviteRole === 'SUPERVISOR' ? 'SUPERVISOR' :
            inviteRole === 'VIEWER' ? 'VIEWER' :
            'WORKER'
        }
      });
    }

    // Add to company access if specified
    if (companyId) {
      await prisma.companyUser.create({
        data: {
          userId: newUser.id,
          companyId,
          role: inviteRole === 'COMPANY_ADMIN' ? 'ADMIN' : 'VIEWER'
        }
      });
    }

    // Fetch inviter and company info
    const inviter = currentUser;
    const company = companyId ? await prisma.company.findUnique({ where: { id: companyId } }) : null;
    
    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL}/auth/claim-account?token=${token}`;
    
    console.log('📧 Sending invitation email to:', normalizedEmail);
    console.log('🔗 Invite URL:', inviteUrl);
    console.log('👤 Role:', inviteRole);
    console.log('⏰ Expires:', expires);

    // Send email and fail request if delivery fails.
    try {
      const emailResult = await sendInvitationEmail(
        normalizedEmail,
        inviter?.name || 'Admin',
        inviteRole,
        company?.name || 'Your Organization',
        token
      );

      if (!emailResult.success) {
        console.error('Failed to send invitation email:', emailResult.error);
        return NextResponse.json(
          {
            success: false,
            error: 'Failed to send invitation email via Resend',
            details: emailResult.error || 'Unknown email delivery error',
          },
          { status: 502 }
        );
      }

      console.log('✅ Invitation email sent successfully to:', normalizedEmail);
    } catch (emailError: any) {
      console.error('Error sending invitation email:', emailError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to send invitation email via Resend',
          details: emailError?.message || 'Unknown email delivery error',
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      data: {
        userId: newUser.id,
        email: normalizedEmail,
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


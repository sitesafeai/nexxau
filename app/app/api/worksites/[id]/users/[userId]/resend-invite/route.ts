/**
 * POST /api/worksites/:id/users/:userId/resend-invite
 * Resend invitation email to a user
 * 
 * Permissions: SUPER_ADMIN, COMPANY_ADMIN, SITE_ADMIN, ADMIN
 * Only allowed if user.onboardingComplete === false && user.isActivated === false
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { generateInviteToken, getTokenExpiry } from '@/app/lib/token-utils';
import { sendInvitationEmail } from '@/app/lib/email-service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  console.log('[RESEND INVITE] Handler invoked');
  
  try {
    const { id: worksiteId, userId } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check permissions: SUPER_ADMIN, COMPANY_ADMIN, SITE_ADMIN, ADMIN
    const globalUserRole = normalizeRole(session.user.role);
    const isGlobalAdmin = globalUserRole === 'SUPER_ADMIN' || 
                          globalUserRole === 'ADMIN' || 
                          globalUserRole === 'COMPANY_ADMIN' ||
                          globalUserRole === 'SITE_ADMIN';

    // Get current user's worksite role
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      select: {
        id: true,
        name: true,
        worksiteAccess: {
          where: { worksiteId },
          select: { role: true }
        }
      }
    });

    const currentUserWorksiteRole = currentUser?.worksiteAccess[0]?.role;
    const effectiveRole = currentUserWorksiteRole || (isGlobalAdmin ? 'ADMIN' : null);

    if (!effectiveRole || (effectiveRole !== 'ADMIN' && !isGlobalAdmin)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to resend invitations' },
        { status: 403 }
      );
    }

    // Verify worksite exists and get info
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!worksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // Get user and verify they belong to this worksite
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        worksiteAccess: {
          where: { worksiteId },
          include: {
            worksite: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user belongs to this worksite
    const worksiteAccess = user.worksiteAccess[0];
    if (!worksiteAccess) {
      return NextResponse.json(
        { success: false, error: 'User not assigned to this worksite' },
        { status: 404 }
      );
    }

    // Declare userRole once immediately after worksiteAccess is fetched
    const userRole = worksiteAccess.role;

    // Check if user already completed onboarding
    if (user.onboardingComplete) {
      return NextResponse.json(
        { success: false, error: 'User has already completed onboarding' },
        { status: 409 }
      );
    }

    // Check if user is already activated
    if (user.isActivated) {
      return NextResponse.json(
        { success: false, error: 'User is already activated' },
        { status: 409 }
      );
    }

    // Generate new token and expiry
    const newInviteToken = generateInviteToken();
    const newInviteExpires = getTokenExpiry(24); // 24 hours

    // Update user with new token (invalidates old token)
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken: newInviteToken,
        inviteExpires: newInviteExpires,
        invitedBy: currentUser?.id || user.invitedBy
      }
    });

    // Send invitation email
    const inviterName = currentUser?.name || session.user?.name || 'Administrator';

      try {
        console.log('[INVITE FLOW] Reached email send block (resend)');
        const emailResult = await sendInvitationEmail(
          user.email,
          inviterName,
          userRole,
          worksite.name,
          newInviteToken,
          worksite.company?.name,
          worksite.companyId,
          worksiteId
        );
        
        if (!emailResult.success) {
          console.error('[ResendInvite] Failed to send email:', emailResult.error);
          console.error('[ResendInvite] Error details:', emailResult.errorDetails);
          // Don't fail the request, but log the error
        } else {
          console.log('[ResendInvite] ✅ Email sent successfully');
        }
      } catch (emailError: any) {
        console.error('[ResendInvite] Exception thrown during email send:', emailError);
        console.error('[ResendInvite] Exception stack:', emailError.stack);
        // Don't fail the request if email fails
      }

    // Create audit log
    if (currentUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'INVITATION_RESENT',
          entityType: 'User',
          entityId: userId,
          metadata: {
            worksiteId,
            userId: userId,
            email: user.email,
            role: userRole
          }
        }
      }).catch(err => {
        console.error('Failed to create audit log:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation email resent successfully'
    });
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to resend invitation', details: error.message },
      { status: 500 }
    );
  }
}


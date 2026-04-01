/**
 * POST /api/worksites/:id/users/:userId/revoke-invite
 * Revoke invitation token for a user
 * 
 * Permissions: SUPER_ADMIN, COMPANY_ADMIN, SITE_ADMIN, ADMIN
 * Sets inviteToken and inviteExpires to null, preventing onboarding
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
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
    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin = userRole === 'SUPER_ADMIN' || 
                          userRole === 'ADMIN' || 
                          userRole === 'COMPANY_ADMIN' ||
                          userRole === 'SITE_ADMIN';

    // Get current user's worksite role
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      select: {
        id: true,
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
        { success: false, error: 'Insufficient permissions to revoke invitations' },
        { status: 403 }
      );
    }

    // Verify worksite exists
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId }
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
          where: { worksiteId }
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

    // Revoke invitation token
    await prisma.user.update({
      where: { id: userId },
      data: {
        inviteToken: null,
        inviteExpires: null
      }
    });

    // Create audit log
    if (currentUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'INVITATION_REVOKED',
          entityType: 'User',
          entityId: userId,
          metadata: {
            worksiteId,
            userId: userId,
            email: user.email
          }
        }
      }).catch(err => {
        console.error('Failed to create audit log:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Invitation revoked successfully'
    });
  } catch (error: any) {
    console.error('Error revoking invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to revoke invitation', details: error.message },
      { status: 500 }
    );
  }
}


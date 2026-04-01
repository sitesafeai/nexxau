import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';

/**
 * PATCH /api/worksites/:id/users/:userId/status
 * Activate or deactivate a user in a worksite
 * 
 * Body: { status: "ACTIVE" | "INACTIVE" }
 * 
 * Permissions: Only ADMIN or SITE_ADMIN can change user status
 */
export async function PATCH(
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

    // Get current user's worksite role
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      select: {
        id: true,
        role: true, // Global role
        worksiteAccess: {
          where: { worksiteId },
          select: { role: true }
        }
      }
    });
    
    const currentUserWorksiteRole = currentUser?.worksiteAccess[0]?.role;
    
    // Check global admin role as fallback
    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin = userRole === 'SUPER_ADMIN' || 
                          userRole === 'ADMIN' || 
                          userRole === 'COMPANY_ADMIN';
    
    // Determine effective role: worksite role takes precedence, fallback to global admin
    const effectiveRole = currentUserWorksiteRole || (isGlobalAdmin ? 'ADMIN' : null);
    
    if (!effectiveRole || (effectiveRole !== 'ADMIN' && effectiveRole !== 'SUPERVISOR')) {
      console.log(`[WorksiteUser] Permission denied: User with role ${effectiveRole} attempted to change user status`);
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to change user status' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Valid status is required (ACTIVE or INACTIVE)' },
        { status: 400 }
      );
    }

    // Check if assignment exists
    const existing = await prisma.worksiteUser.findUnique({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            isActivated: true
          }
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not assigned to this worksite' },
        { status: 404 }
      );
    }

    // Update user's isActivated status
    const isActivated = status === 'ACTIVE';
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        isActivated: isActivated
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActivated: true
      }
    });

    // Get updated worksite user relationship
    const updatedWorksiteUser = await prisma.worksiteUser.findUnique({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      }
    });

    // currentUser already fetched above for permission check

    // Create audit log
    if (currentUser) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'USER_STATUS_UPDATED',
          entityType: 'User',
          entityId: userId,
          metadata: {
            worksiteId,
            userId,
            oldStatus: existing.user.isActivated ? 'ACTIVE' : 'INACTIVE',
            newStatus: status,
            userEmail: existing.user.email
          }
        }
      }).catch(err => {
        console.error('Failed to create audit log:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedWorksiteUser?.role || 'WORKER',
        status: updatedUser.isActivated ? 'ACTIVE' : 'INACTIVE',
        worksiteUserId: updatedWorksiteUser?.id
      }
    });
  } catch (error: any) {
    console.error('Error updating user status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user status', details: error.message },
      { status: 500 }
    );
  }
}


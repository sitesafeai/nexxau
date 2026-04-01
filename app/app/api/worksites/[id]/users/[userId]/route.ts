import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { normalizeRole } from '@/lib/roles';

/**
 * PATCH /api/worksites/:id/users/:userId
 * Update a user's role in a worksite
 * 
 * Body: { role: WorksiteRole }
 * 
 * Permissions: Only ADMIN or SITE_ADMIN can update roles
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

    // Check permissions - fetch user's actual role from database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      include: {
        worksiteAccess: {
          where: { worksiteId },
          select: { role: true }
        },
        company: {
          select: {
            id: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's global role and worksite-specific role
    const globalRole = normalizeRole(currentUser.role);
    const worksiteAccess = currentUser.worksiteAccess[0];
    const worksiteRole = worksiteAccess?.role;
    
    // Check permissions: SUPER_ADMIN, COMPANY_ADMIN, or worksite ADMIN can update roles
    const canManageUsers = 
      globalRole === 'SUPER_ADMIN' || 
      globalRole === 'COMPANY_ADMIN' ||
      globalRole === 'ADMIN' ||
      worksiteRole === 'ADMIN';
    
    if (!canManageUsers) {
      console.log('[PATCH USER] Permission denied:', {
        globalRole,
        worksiteRole,
        worksiteId,
        userEmail: session.user.email
      });
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to update user roles. Only ADMIN, COMPANY_ADMIN, or worksite ADMIN can update roles.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { role } = body;

    if (!role || !['ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Valid role is required (ADMIN, SUPERVISOR, WORKER, VIEWER)' },
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
            name: true
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

    // Update role
    const updated = await prisma.worksiteUser.update({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      },
      data: {
        role: role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActivated: true
          }
        }
      }
    });

    // Create audit log (currentUser already fetched above for permission check)
    if (currentUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'USER_ROLE_UPDATED',
          entityType: 'WorksiteUser',
          entityId: updated.id,
          metadata: {
            worksiteId,
            userId,
            oldRole: existing.role,
            newRole: role,
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
        id: updated.user.id,
        name: updated.user.name,
        email: updated.user.email,
        role: updated.role,
        status: updated.user.isActivated ? 'ACTIVE' : 'INACTIVE',
        worksiteUserId: updated.id
      }
    });
  } catch (error: any) {
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user role', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worksites/:id/users/:userId
 * Remove a user from a worksite
 * 
 * Permissions: Only ADMIN or SITE_ADMIN can remove users
 */
export async function DELETE(
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

    // Check permissions - fetch user's actual role from database
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      include: {
        worksiteAccess: {
          where: { worksiteId },
          select: { role: true }
        },
        company: {
          select: {
            id: true
          }
        }
      }
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Get user's global role and worksite-specific role
    const globalRole = normalizeRole(currentUser.role);
    const worksiteAccess = currentUser.worksiteAccess[0];
    const worksiteRole = worksiteAccess?.role;
    
    // Check permissions: SUPER_ADMIN, COMPANY_ADMIN, or worksite ADMIN can remove users
    const canManageUsers = 
      globalRole === 'SUPER_ADMIN' || 
      globalRole === 'COMPANY_ADMIN' ||
      globalRole === 'ADMIN' ||
      worksiteRole === 'ADMIN';
    
    if (!canManageUsers) {
      console.log('[DELETE USER] Permission denied:', {
        globalRole,
        worksiteRole,
        worksiteId,
        userEmail: session.user.email
      });
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to remove users. Only ADMIN, COMPANY_ADMIN, or worksite ADMIN can remove users.' },
        { status: 403 }
      );
    }

    // Check if assignment exists and get user info for audit
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
            name: true
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

    // Delete assignment
    await prisma.worksiteUser.delete({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      }
    });

    // Create audit log (currentUser already fetched above for permission check)
    if (currentUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id,
          action: 'USER_REMOVED_FROM_WORKSITE',
          entityType: 'WorksiteUser',
          entityId: existing.id,
          metadata: {
            worksiteId,
            userId,
            userEmail: existing.user.email,
            role: existing.role
          }
        }
      }).catch(err => {
        console.error('Failed to create audit log:', err);
      });
    }

    return NextResponse.json({
      success: true,
      message: 'User removed from worksite successfully'
    });
  } catch (error: any) {
    console.error('Error removing user from worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove user', details: error.message },
      { status: 500 }
    );
  }
}

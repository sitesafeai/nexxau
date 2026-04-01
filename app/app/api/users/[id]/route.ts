import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';
import { logUpdate, logDelete } from '@/lib/audit-logger';

/**
 * PATCH /api/users/[id]
 * Update user information
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const currentUser = session?.user;

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN and COMPANY_ADMIN can edit users
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'COMPANY_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, role } = body;

    // Get user before update for audit log
    const beforeUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!beforeUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role })
      }
    });

    // Log audit trail
    await logUpdate(
      currentUser.id,
      'User',
      id,
      { name: beforeUser.name, email: beforeUser.email, role: beforeUser.role },
      { name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
      request
    );

    return NextResponse.json({
      success: true,
      data: updatedUser
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/users/[id]
 * Delete a user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const currentUser = session?.user;

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only SUPER_ADMIN and COMPANY_ADMIN can delete users
    if (currentUser.role !== 'SUPER_ADMIN' && currentUser.role !== 'COMPANY_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    // Get user before deletion for audit log
    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    // Log audit trail
    await logDelete(
      currentUser.id,
      'User',
      id,
      { name: user.name, email: user.email, role: user.role },
      request
    );

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user', details: error.message },
      { status: 500 }
    );
  }
}


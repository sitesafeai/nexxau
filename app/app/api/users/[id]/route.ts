import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { enforceCompanyScope } from '@/app/lib/auth-scope';
import { logUpdate, logDelete } from '@/app/lib/audit-logger';

const ROLE_ALLOWLIST: Record<string, string[]> = {
  SUPER_ADMIN: ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'],
  COMPANY_ADMIN: ['SITE_ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'],
};

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

    const actorRole = normalizeRole(currentUser.role);
    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'COMPANY_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, email, role } = body;

    // Load target before any mutation — needed for scope check, audit log, and role validation.
    const beforeUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });

    if (!beforeUser) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Tenant isolation: actor must belong to the same company as the target.
    const scopeCheck = await enforceCompanyScope({
      session,
      resourceCompanyId: beforeUser.companyId,
    });
    if (!scopeCheck.ok) {
      return NextResponse.json(
        { success: false, error: scopeCheck.error },
        { status: scopeCheck.status }
      );
    }

    // Role-change validation
    if (role !== undefined) {
      const normalizedNewRole = normalizeRole(role);
      const permitted = ROLE_ALLOWLIST[actorRole] ?? [];
      if (!permitted.includes(normalizedNewRole)) {
        return NextResponse.json(
          {
            success: false,
            error: `Role '${role}' cannot be assigned by a ${actorRole}`,
          },
          { status: 403 }
        );
      }

      // Prevent self-promotion/demotion — changing your own role is not allowed.
      if (beforeUser.id === currentUser.id) {
        return NextResponse.json(
          { success: false, error: 'Cannot change your own role' },
          { status: 403 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(role !== undefined && { role: normalizeRole(role) }),
      },
    });

    await logUpdate(
      currentUser.id,
      'User',
      id,
      { name: beforeUser.name, email: beforeUser.email, role: beforeUser.role },
      { name: updatedUser.name, email: updatedUser.email, role: updatedUser.role },
      request
    );

    return NextResponse.json({ success: true, data: updatedUser });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update user' },
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

    const actorRole = normalizeRole(currentUser.role);
    if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'COMPANY_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, role: true, companyId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Block deleting yourself.
    if (user.id === currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Tenant isolation: actor must belong to the same company as the target.
    const scopeCheck = await enforceCompanyScope({
      session,
      resourceCompanyId: user.companyId,
    });
    if (!scopeCheck.ok) {
      return NextResponse.json(
        { success: false, error: scopeCheck.error },
        { status: scopeCheck.status }
      );
    }

    await prisma.user.delete({ where: { id } });

    await logDelete(
      currentUser.id,
      'User',
      id,
      { name: user.name, email: user.email, role: user.role },
      request
    );

    return NextResponse.json({ success: true, message: 'User deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import { normalizeRole } from '@/app/lib/roles';
import type { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  queueSuperAdminAccountDeletedNotification,
  queueSuperAdminUserPatchNotification,
  type UserNotifySnapshot,
} from '@/app/lib/super-admin-user-notifications';

function toNotifySnapshot(u: {
  name: string | null;
  email: string | null;
  role: string;
  companyId: string | null;
  worksiteId: string | null;
  isActivated: boolean;
  approved: boolean;
  company: { name: string } | null;
  worksite: { name: string } | null;
}): UserNotifySnapshot {
  return {
    name: u.name,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    worksiteId: u.worksiteId,
    isActivated: u.isActivated,
    approved: u.approved,
    company: u.company,
    worksite: u.worksite,
  };
}

const userDetailSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  worksiteId: true,
  isActivated: true,
  approved: true,
  mfaEnabled: true,
  lastLogin: true,
  createdAt: true,
  inviteExpires: true,
  inviteToken: true,
  company: { select: { id: true, name: true } },
  worksite: { select: { id: true, name: true, companyId: true } },
  worksiteAccess: {
    select: {
      id: true,
      worksiteId: true,
      role: true,
      worksite: { select: { id: true, name: true, companyId: true } },
    },
  },
  companyAccess: {
    select: {
      id: true,
      companyId: true,
      role: true,
      company: { select: { id: true, name: true } },
    },
  },
} as const;

async function assertWorksiteMatchesCompany(worksiteId: string | null, companyId: string | null) {
  if (!worksiteId) return true;
  const ws = await prisma.worksite.findUnique({
    where: { id: worksiteId },
    select: { companyId: true },
  });
  if (!ws) return false;
  if (companyId && ws.companyId !== companyId) return false;
  return true;
}

/**
 * GET /api/admin/users/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id },
      select: userDetailSelect,
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        ...user,
        lastLogin: user.lastLogin?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        inviteExpires: user.inviteExpires?.toISOString() ?? null,
        inviteToken: user.inviteToken ? '[redacted]' : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][users][id] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load user', details: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update profile, platform role, company/worksite assignment, activation, or set password.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const admin = await prisma.user.findFirst({
      where: { email: auth.session.user?.email || undefined },
      select: { id: true },
    });
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin user record not found' }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        companyId: true,
        worksiteId: true,
        isActivated: true,
        approved: true,
        company: { select: { name: true } },
        worksite: { select: { name: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      email,
      role,
      companyId,
      worksiteId,
      isActivated,
      approved,
      password,
    } = body as {
      name?: string;
      email?: string;
      role?: UserRole;
      companyId?: string | null;
      worksiteId?: string | null;
      isActivated?: boolean;
      approved?: boolean;
      password?: string;
    };

    const nextCompanyId = companyId !== undefined ? companyId : undefined;
    const nextWorksiteId = worksiteId !== undefined ? worksiteId : undefined;

    if (nextWorksiteId !== undefined || nextCompanyId !== undefined) {
      const resolvedCompany = nextCompanyId !== undefined ? nextCompanyId : (await prisma.user.findUnique({
        where: { id },
        select: { companyId: true },
      }))?.companyId ?? null;
      const wsId = nextWorksiteId !== undefined ? nextWorksiteId : (await prisma.user.findUnique({
        where: { id },
        select: { worksiteId: true },
      }))?.worksiteId ?? null;
      const ok = await assertWorksiteMatchesCompany(wsId, resolvedCompany);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Worksite does not match selected company' },
          { status: 400 }
        );
      }
    }

    if (role !== undefined) {
      const nextRole = normalizeRole(role);
      if (existing.id === admin.id && nextRole !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { success: false, error: 'You cannot remove your own Super Admin role' },
          { status: 400 }
        );
      }
      if (normalizeRole(existing.role) === 'SUPER_ADMIN' && nextRole !== 'SUPER_ADMIN') {
        const superAdmins = await prisma.user.count({
          where: { role: 'SUPER_ADMIN' },
        });
        if (superAdmins <= 1) {
          return NextResponse.json(
            { success: false, error: 'Cannot demote the last Super Admin' },
            { status: 400 }
          );
        }
      }
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (role !== undefined) data.role = role;
    if (nextCompanyId !== undefined) data.companyId = nextCompanyId;
    if (nextWorksiteId !== undefined) data.worksiteId = nextWorksiteId;
    if (isActivated !== undefined) data.isActivated = isActivated;
    if (approved !== undefined) data.approved = approved;
    const passwordSet = Boolean(password && typeof password === 'string' && password.length > 0);
    if (passwordSet) {
      data.password = await bcrypt.hash(password as string, 12);
    }

    const beforeSnapshot = toNotifySnapshot(existing);

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: userDetailSelect,
    });

    const afterSnapshot = toNotifySnapshot({
      name: updated.name,
      email: updated.email,
      role: updated.role,
      companyId: updated.companyId,
      worksiteId: updated.worksiteId,
      isActivated: updated.isActivated,
      approved: updated.approved,
      company: updated.company,
      worksite: updated.worksite,
    });

    queueSuperAdminUserPatchNotification(beforeSnapshot, afterSnapshot, passwordSet);

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        lastLogin: updated.lastLogin?.toISOString() ?? null,
        createdAt: updated.createdAt.toISOString(),
        inviteExpires: updated.inviteExpires?.toISOString() ?? null,
        inviteToken: updated.inviteToken ? '[redacted]' : null,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][users][id] PATCH failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to update user', details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const admin = await prisma.user.findFirst({
      where: { email: auth.session.user?.email || undefined },
      select: { id: true },
    });
    if (!admin) {
      return NextResponse.json({ success: false, error: 'Admin user record not found' }, { status: 403 });
    }
    if (id === admin.id) {
      return NextResponse.json({ success: false, error: 'You cannot delete your own account' }, { status: 400 });
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { role: true, email: true, name: true },
    });
    if (!target) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }
    if (normalizeRole(target.role) === 'SUPER_ADMIN') {
      const superAdmins = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
      if (superAdmins <= 1) {
        return NextResponse.json(
          { success: false, error: 'Cannot delete the last Super Admin' },
          { status: 400 }
        );
      }
    }

    queueSuperAdminAccountDeletedNotification(target.email, target.name);

    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][users][id] DELETE failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to delete user', details: message },
      { status: 500 }
    );
  }
}

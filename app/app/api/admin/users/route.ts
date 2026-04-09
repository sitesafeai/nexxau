import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import { listUsersForSuperAdmin } from '@/app/lib/admin-user-queries';
import type { UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/users?companyId=&worksiteId=
 * Super-admin directory of users with optional company / worksite scope.
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId') || undefined;
    const worksiteId = searchParams.get('worksiteId') || undefined;

    const data = await listUsersForSuperAdmin({ companyId, worksiteId });
    return NextResponse.json({ success: true, data });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][users] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users', details: message },
      { status: 500 }
    );
  }
}

const ALLOWED_CREATE_ROLES: UserRole[] = [
  'COMPANY_ADMIN',
  'SITE_ADMIN',
  'SUPERVISOR',
  'WORKER',
  'VIEWER',
];

/**
 * POST /api/admin/users — create a user directly (optional; invites are preferred)
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { name, email, password, role, companyId, worksiteId, status = 'active' } = body;

    if (!name || !email || !role) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, email, role' },
        { status: 400 }
      );
    }

    if (!ALLOWED_CREATE_ROLES.includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Invalid role for direct creation' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, error: 'User with this email already exists' }, { status: 409 });
    }

    let hashedPassword: string | null = null;
    if (password && typeof password === 'string') {
      hashedPassword = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        companyId: companyId || null,
        worksiteId: worksiteId || null,
        isActivated: status === 'active',
        approved: status !== 'suspended',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActivated: true,
        lastLogin: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          ...user,
          lastLogin: user.lastLogin?.toISOString() ?? null,
          createdAt: user.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][users] POST failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to create user', details: message },
      { status: 500 }
    );
  }
}

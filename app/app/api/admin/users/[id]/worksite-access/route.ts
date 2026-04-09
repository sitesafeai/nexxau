import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import type { WorksiteRole } from '@prisma/client';
import { queueSuperAdminWorksiteAccessNotification } from '@/app/lib/super-admin-user-notifications';

const WORKSITE_ROLES: WorksiteRole[] = ['ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'];

/**
 * GET /api/admin/users/[id]/worksite-access
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: userId } = await params;
    const rows = await prisma.worksiteUser.findMany({
      where: { userId },
      select: {
        id: true,
        worksiteId: true,
        role: true,
        permissions: true,
        worksite: { select: { id: true, name: true, companyId: true } },
      },
    });
    return NextResponse.json({ success: true, data: rows });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to load worksite access', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/users/[id]/worksite-access
 * Body: { worksiteId: string, role: WorksiteRole }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: userId } = await params;
    const body = await request.json();
    const { worksiteId, role } = body as { worksiteId?: string; role?: WorksiteRole };

    if (!worksiteId || !role) {
      return NextResponse.json(
        { success: false, error: 'worksiteId and role are required' },
        { status: 400 }
      );
    }
    if (!WORKSITE_ROLES.includes(role)) {
      return NextResponse.json({ success: false, error: 'Invalid worksite role' }, { status: 400 });
    }

    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      select: { id: true, companyId: true, name: true },
    });
    if (!worksite) {
      return NextResponse.json({ success: false, error: 'Worksite not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, companyId: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.companyId && user.companyId !== worksite.companyId) {
      return NextResponse.json(
        {
          success: false,
          error: 'User primary company does not match this worksite. Change company in user profile first.',
        },
        { status: 400 }
      );
    }

    let companyLine: string | null = null;
    if (!user.companyId) {
      const co = await prisma.company.findUnique({
        where: { id: worksite.companyId },
        select: { name: true },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { companyId: worksite.companyId },
      });
      companyLine = `Primary company was set to "${co?.name ?? 'your organization'}" so this worksite access is valid.`;
    }

    const prior = await prisma.worksiteUser.findUnique({
      where: { userId_worksiteId: { userId, worksiteId } },
      select: { role: true },
    });

    const row = await prisma.worksiteUser.upsert({
      where: {
        userId_worksiteId: { userId, worksiteId },
      },
      create: { userId, worksiteId, role },
      update: { role },
      select: {
        id: true,
        worksiteId: true,
        role: true,
        worksite: { select: { id: true, name: true, companyId: true } },
      },
    });

    const wsLabel = worksite.name?.trim() || 'Worksite';
    const lines: string[] = [];
    if (companyLine) lines.push(companyLine);
    if (prior) {
      lines.push(`At "${wsLabel}": role changed from ${prior.role} to ${role}.`);
    } else {
      lines.push(`Access to "${wsLabel}" was added with role ${role}.`);
    }
    queueSuperAdminWorksiteAccessNotification({
      userEmail: user.email,
      userName: user.name,
      lines,
    });

    return NextResponse.json({ success: true, data: row });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][users][id][worksite-access] POST failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to update worksite access', details: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/users/[id]/worksite-access?worksiteId=
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: userId } = await params;
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    if (!worksiteId) {
      return NextResponse.json({ success: false, error: 'worksiteId query required' }, { status: 400 });
    }

    const existingRow = await prisma.worksiteUser.findUnique({
      where: { userId_worksiteId: { userId, worksiteId } },
      select: {
        role: true,
        worksite: { select: { name: true } },
        user: { select: { email: true, name: true } },
      },
    });
    if (!existingRow) {
      return NextResponse.json({ success: false, error: 'Worksite access not found' }, { status: 404 });
    }

    await prisma.worksiteUser.delete({
      where: { userId_worksiteId: { userId, worksiteId } },
    });

    const wsLabel = existingRow.worksite.name?.trim() || 'Worksite';
    queueSuperAdminWorksiteAccessNotification({
      userEmail: existingRow.user.email,
      userName: existingRow.user.name,
      lines: [`Access to "${wsLabel}" was removed (previous role: ${existingRow.role}).`],
    });

    return NextResponse.json({ success: true, message: 'Worksite access removed' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Failed to remove worksite access', details: message },
      { status: 500 }
    );
  }
}

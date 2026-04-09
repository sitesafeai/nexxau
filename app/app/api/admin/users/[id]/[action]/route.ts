import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import { normalizeRole } from '@/app/lib/roles';
import { sendPasswordResetEmail } from '@/app/lib/email-service';
import { generateInviteToken, getTokenExpiry } from '@/app/lib/token-utils';
import bcrypt from 'bcryptjs';

async function parseJsonBody(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const text = await request.text();
    if (!text.trim()) return {};
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * POST /api/admin/users/[id]/:action
 * Legacy actions: activate, suspend, update, delete, reset-password
 * Prefer REST routes on /api/admin/users/[id] where possible.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; action: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  const { id, action } = await params;
  const body = await parseJsonBody(request);

  try {
    const admin = await prisma.user.findFirst({
      where: { email: auth.session.user?.email || undefined },
      select: { id: true },
    });

    switch (action) {
      case 'activate': {
        const updated = await prisma.user.update({
          where: { id },
          data: { isActivated: true, approved: true },
          select: { id: true, email: true, isActivated: true, approved: true },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case 'suspend': {
        if (id === admin?.id) {
          return NextResponse.json({ success: false, error: 'Cannot suspend your own account' }, { status: 400 });
        }
        const updated = await prisma.user.update({
          where: { id },
          data: { approved: false },
          select: { id: true, email: true, approved: true },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case 'update': {
        const { name, email, role, status, password } = body as {
          name?: string;
          email?: string;
          role?: string;
          status?: string;
          password?: string;
        };

        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (email !== undefined) updateData.email = email;
        if (role !== undefined) updateData.role = role;
        if (status !== undefined) {
          updateData.isActivated = status === 'active';
          updateData.approved = status !== 'suspended';
        }
        if (password && typeof password === 'string' && password.length > 0) {
          updateData.password = await bcrypt.hash(password, 12);
        }

        const updated = await prisma.user.update({
          where: { id },
          data: updateData,
        });
        return NextResponse.json({ success: true, data: updated });
      }

      case 'delete': {
        if (id === admin?.id) {
          return NextResponse.json({ success: false, error: 'Cannot delete your own account' }, { status: 400 });
        }
        const target = await prisma.user.findUnique({
          where: { id },
          select: { role: true },
        });
        if (!target) {
          return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        if (normalizeRole(target.role) === 'SUPER_ADMIN') {
          const count = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
          if (count <= 1) {
            return NextResponse.json(
              { success: false, error: 'Cannot delete the last Super Admin' },
              { status: 400 }
            );
          }
        }
        await prisma.user.delete({ where: { id } });
        return NextResponse.json({ success: true, message: 'User deleted successfully' });
      }

      case 'reset-password': {
        const user = await prisma.user.findUnique({
          where: { id },
          select: { id: true, email: true, name: true, isActivated: true },
        });
        if (!user?.email) {
          return NextResponse.json(
            { success: false, error: 'User has no email on file' },
            { status: 400 }
          );
        }
        if (!user.isActivated) {
          return NextResponse.json(
            {
              success: false,
              error: 'Account is not activated yet. Resend the invitation instead.',
            },
            { status: 400 }
          );
        }

        const token = generateInviteToken();
        await prisma.user.update({
          where: { id: user.id },
          data: {
            verificationToken: token,
            inviteExpires: getTokenExpiry(1),
          },
        });

        const emailResult = await sendPasswordResetEmail(
          user.email,
          user.name || 'User',
          token
        );

        if (!emailResult.success) {
          return NextResponse.json(
            {
              success: false,
              error: emailResult.error || 'Failed to send password reset email',
            },
            { status: 502 }
          );
        }

        return NextResponse.json({
          success: true,
          message: 'Password reset email sent',
        });
      }

      default:
        return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[admin][users][action] Failed ${action}:`, message);
    return NextResponse.json(
      { success: false, error: `Failed to ${action} user`, details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;

    const company = await prisma.company.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    await prisma.company.update({
      where: { id },
      data: { suspended: false },
    });

    return NextResponse.json({ success: true, message: 'Company unsuspended' });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to unsuspend company';
    console.error('[admin][companies][unsuspend]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

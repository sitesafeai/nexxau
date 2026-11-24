import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  try {
    const { id } = await params;
    const alertResponse = await prisma.alertResponse.update({
      where: { id },
      data: {
        // Note: AlertResponse doesn't have status or acknowledgedAt fields
        // Use response field instead: 'acknowledged'
        response: 'acknowledged'
      }
    });

    return NextResponse.json(alertResponse);
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}

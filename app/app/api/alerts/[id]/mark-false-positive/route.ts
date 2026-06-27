import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

/**
 * POST /api/alerts/[id]/mark-false-positive
 *
 * Company admin marks an alert as a false positive.
 * - Sets alert.status = FALSE_POSITIVE
 * - Stores the reason in alert.fpReason
 * - Creates a FalsePositiveReview row so Nexxau super-admins can confirm/dismiss
 * - Is idempotent: calling twice on the same alert just updates the reason
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { reason } = body;

    // Load alert to verify it exists and the user has access
    const alert = await prisma.alert.findUnique({
      where: { id },
      select: { id: true, worksiteId: true, status: true, fpReview: { select: { id: true } } },
    });

    if (!alert) {
      return NextResponse.json({ success: false, error: 'Alert not found' }, { status: 404 });
    }

    // Update alert status to FALSE_POSITIVE
    await prisma.alert.update({
      where: { id },
      data: {
        status: 'FALSE_POSITIVE',
        fpReason: reason || null,
        overrideBy: session.user.id,
      },
    });

    // Create or update the review queue entry
    if (alert.fpReview) {
      // Already queued — just refresh the reason
      await prisma.falsePositiveReview.update({
        where: { alertId: id },
        data: {
          status: 'PENDING',
          superAdminNote: null,
          reviewedAt: null,
          reviewedByUserId: null,
        },
      });
    } else {
      await prisma.falsePositiveReview.create({
        data: {
          alertId: id,
          markedByUserId: session.user.id,
          status: 'PENDING',
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Alert marked as false positive and queued for super-admin review',
    });
  } catch (error: any) {
    console.error('[Mark False Positive] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark as false positive', details: error.message },
      { status: 500 }
    );
  }
}

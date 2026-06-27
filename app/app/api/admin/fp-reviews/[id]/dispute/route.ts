import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * POST /api/admin/fp-reviews/[id]/dispute
 *
 * Any authenticated user from the worksite (COMPANY_ADMIN, SITE_ADMIN, SAFETY_MANAGER)
 * can dispute a super-admin ruling of CONFIRMED.
 *
 * Body: { reason: string }
 *
 * PATCH /api/admin/fp-reviews/[id]/dispute
 *
 * Super-admin resolves a dispute.
 * Body: { disputeId: string; action: 'UPHELD' | 'REJECTED'; note?: string }
 */

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = normalizeRole(session.user.role);
    const allowedRoles = ['COMPANY_ADMIN', 'SITE_ADMIN', 'SAFETY_MANAGER', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;

    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to submit a dispute' }, { status: 400 });
    }

    // Verify the review exists and has been CONFIRMED (only confirmed rulings can be disputed)
    const review = await prisma.falsePositiveReview.findUnique({
      where: { id },
      select: { id: true, status: true },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    if (review.status !== 'CONFIRMED') {
      return NextResponse.json(
        { error: 'Only CONFIRMED rulings can be disputed' },
        { status: 400 }
      );
    }

    const dispute = await prisma.falsePositiveDispute.create({
      data: {
        fpReviewId:        id,
        submittedByUserId: session.user.id,
        reason:            reason.trim(),
        status:            'PENDING',
      },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: dispute,
      message: 'Dispute submitted — the Nexxau team will review it shortly',
    });
  } catch (error: any) {
    console.error('[FP Dispute] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit dispute', details: error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = normalizeRole(session.user.role);
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — super admins only' }, { status: 403 });
    }

    const body = await request.json();
    const { disputeId, action, note } = body;

    if (!['UPHELD', 'REJECTED'].includes(action)) {
      return NextResponse.json({ error: 'action must be UPHELD or REJECTED' }, { status: 400 });
    }

    const dispute = await prisma.falsePositiveDispute.findUnique({
      where: { id: disputeId },
      include: { fpReview: { include: { alert: { select: { id: true } } } } },
    });

    if (!dispute || dispute.fpReviewId !== id) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    // Update dispute
    const updated = await prisma.falsePositiveDispute.update({
      where: { id: disputeId },
      data: {
        status:       action,
        resolvedNote: note ?? null,
        resolvedAt:   new Date(),
      },
    });

    // If upheld → reverse the review: set review to DISMISSED & restore alert to FALSE_POSITIVE
    if (action === 'UPHELD') {
      await prisma.falsePositiveReview.update({
        where: { id },
        data: { status: 'DISMISSED', superAdminNote: note ?? null },
      });
      await prisma.alert.update({
        where: { id: dispute.fpReview.alert.id },
        data: {
          status:          'FALSE_POSITIVE',
          resolutionType:  'DISPUTE_UPHELD',
          resolutionNotes: note || 'Dispute upheld — ruled as false positive',
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[FP Dispute] PATCH error:', error);
    return NextResponse.json(
      { error: 'Failed to resolve dispute', details: error.message },
      { status: 500 }
    );
  }
}

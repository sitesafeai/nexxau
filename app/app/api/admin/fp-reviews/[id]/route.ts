import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * POST /api/admin/fp-reviews/[id]
 *
 * Super-admin reviews a false-positive.
 *
 * Body: {
 *   action: 'CONFIRMED' | 'DISMISSED'
 *   note?:  string  — e.g. "PPE was not present", "Worker was too far from zone"
 * }
 *
 * CONFIRMED → alert stays FALSE_POSITIVE but super-admin notes it WAS actually a real violation.
 *             The company admin sees this note. They can then dispute.
 * DISMISSED → super-admin agrees it was indeed a false positive. No further action needed.
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
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — super admins only' }, { status: 403 });
    }

    const body = await request.json();
    const { action, note } = body;

    if (!['CONFIRMED', 'DISMISSED'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be CONFIRMED or DISMISSED' },
        { status: 400 }
      );
    }

    const review = await prisma.falsePositiveReview.findUnique({
      where: { id },
      include: { alert: { select: { id: true } } },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    // Update the review record
    const updated = await prisma.falsePositiveReview.update({
      where: { id },
      data: {
        status:          action,
        reviewedByUserId: session.user.id,
        superAdminNote:  note ?? null,
        reviewedAt:      new Date(),
      },
    });

    // If super-admin confirms it WAS a real violation, update the alert status to RESOLVED
    // with a note so the company admin knows Nexxau overrode their FP flag.
    if (action === 'CONFIRMED') {
      await prisma.alert.update({
        where: { id: review.alert.id },
        data: {
          status:          'RESOLVED',
          resolutionType:  'CONFIRMED_BY_SUPER_ADMIN',
          resolutionNotes: note || 'Confirmed as real violation by Nexxau review team',
          resolvedBy:      session.user.id,
          resolvedAt:      new Date(),
        },
      });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('[FP Reviews] POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit review', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/fp-reviews/[id]
 * Fetch a single review with full details.
 */
export async function GET(
  _request: NextRequest,
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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const review = await prisma.falsePositiveReview.findUnique({
      where: { id },
      include: {
        alert: {
          select: {
            id: true, title: true, description: true, severity: true,
            fpReason: true, createdAt: true, violationType: true, detectionSnapshot: true,
            worksite: { select: { id: true, name: true } },
            camera:   { select: { id: true, name: true } },
          },
        },
        markedBy:   { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
        disputes: {
          include: { submittedBy: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: review });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch review', details: error.message }, { status: 500 });
  }
}

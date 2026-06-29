import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * POST /api/admin/fp-reviews/[id]/dispute
 * Company admin opens a dispute with an initial message.
 * Body: { reason: string }
 *
 * PATCH /api/admin/fp-reviews/[id]/dispute
 * Thread actions:
 *   Super-admin: { disputeId, action: 'REPLY', message: string }       — reply without resolving
 *   Super-admin: { disputeId, action: 'UPHELD', message?: string }     — accept dispute, reverse ruling
 *   Super-admin: { disputeId, action: 'REJECTED', message: string }    — reject dispute
 *   Company:     { disputeId, action: 'COMPANY_REPLY', message: string } — company replies (once, after super-admin replies)
 *
 * GET /api/admin/fp-reviews/[id]/dispute?disputeId=xxx
 * Fetch full thread for a dispute.
 */

const COMPANY_ROLES = ['COMPANY_ADMIN', 'SITE_ADMIN', 'SAFETY_MANAGER'];

// ── POST: open a new dispute ──────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = normalizeRole(session.user.role);
    if (![...COMPANY_ROLES, 'SUPER_ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { reason } = body;
    if (!reason?.trim()) {
      return NextResponse.json({ error: 'A reason is required to submit a dispute' }, { status: 400 });
    }

    const review = await prisma.falsePositiveReview.findUnique({
      where: { id },
      select: { id: true, status: true, disputes: { select: { id: true } } },
    });

    if (!review) return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    if (review.status !== 'CONFIRMED') {
      return NextResponse.json({ error: 'Only CONFIRMED rulings can be disputed' }, { status: 400 });
    }
    if (review.disputes.length > 0) {
      return NextResponse.json({ error: 'A dispute already exists for this review' }, { status: 400 });
    }

    // Create dispute + seed the thread with the company's opening message
    const dispute = await (prisma as any).falsePositiveDispute.create({
      data: {
        fpReviewId:        id,
        submittedByUserId: session.user.id,
        reason:            reason.trim(),
        status:            'PENDING',
        messages: {
          create: {
            authorId:   session.user.id,
            authorRole: 'COMPANY',
            content:    reason.trim(),
          },
        },
      },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        messages: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: dispute,
      message: 'Dispute submitted — the Nexxau team will review it shortly',
    });
  } catch (error: any) {
    console.error('[FP Dispute] POST error:', error);
    return NextResponse.json({ error: 'Failed to submit dispute', details: error.message }, { status: 500 });
  }
}

// ── PATCH: thread actions ─────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = normalizeRole(session.user.role);
    const body = await request.json();
    const { disputeId, action, message } = body;

    if (!disputeId) return NextResponse.json({ error: 'disputeId is required' }, { status: 400 });

    // Load the dispute + its thread
    const dispute = await (prisma as any).falsePositiveDispute.findUnique({
      where: { id: disputeId },
      include: {
        fpReview: { include: { alert: { select: { id: true } } } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!dispute || dispute.fpReviewId !== id) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    if (dispute.status !== 'PENDING') {
      return NextResponse.json({ error: 'This dispute has already been resolved' }, { status: 400 });
    }

    const lastMsg = dispute.messages[dispute.messages.length - 1];

    // ── SUPER_ADMIN actions ────────────────────────────────────────────────────
    if (action === 'REPLY' || action === 'UPHELD' || action === 'REJECTED') {
      if (role !== 'SUPER_ADMIN') {
        return NextResponse.json({ error: 'Forbidden — super admins only' }, { status: 403 });
      }
      if (!message?.trim()) {
        return NextResponse.json({ error: 'A message is required' }, { status: 400 });
      }

      if (action === 'REPLY') {
        // Add super-admin message to thread, keep dispute PENDING
        const msg = await (prisma as any).disputeMessage.create({
          data: {
            disputeId,
            authorId:   session.user.id,
            authorRole: 'SUPER_ADMIN',
            content:    message.trim(),
          },
          include: { author: { select: { id: true, name: true, email: true } } },
        });
        return NextResponse.json({ success: true, data: msg });
      }

      if (action === 'UPHELD') {
        // Accept dispute — reverse the ruling
        await (prisma as any).disputeMessage.create({
          data: { disputeId, authorId: session.user.id, authorRole: 'SUPER_ADMIN', content: message.trim() },
        });
        const updated = await (prisma as any).falsePositiveDispute.update({
          where: { id: disputeId },
          data: { status: 'UPHELD', resolvedNote: message.trim(), resolvedAt: new Date() },
        });
        // Reverse the alert: back to false positive
        await prisma.falsePositiveReview.update({
          where: { id },
          data: { status: 'DISMISSED', superAdminNote: message.trim() },
        });
        await prisma.alert.update({
          where: { id: dispute.fpReview.alert.id },
          data: { status: 'FALSE_POSITIVE', resolutionType: 'DISPUTE_UPHELD', resolutionNotes: message.trim() },
        });
        return NextResponse.json({ success: true, data: updated });
      }

      if (action === 'REJECTED') {
        // Reject dispute — ruling stands
        await (prisma as any).disputeMessage.create({
          data: { disputeId, authorId: session.user.id, authorRole: 'SUPER_ADMIN', content: message.trim() },
        });
        const updated = await (prisma as any).falsePositiveDispute.update({
          where: { id: disputeId },
          data: { status: 'REJECTED', resolvedNote: message.trim(), resolvedAt: new Date() },
        });
        return NextResponse.json({ success: true, data: updated });
      }
    }

    // ── COMPANY reply ─────────────────────────────────────────────────────────
    if (action === 'COMPANY_REPLY') {
      if (![...COMPANY_ROLES, 'SUPER_ADMIN'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!message?.trim()) {
        return NextResponse.json({ error: 'A message is required' }, { status: 400 });
      }
      // Company can only reply if the last message was from super admin
      if (!lastMsg || lastMsg.authorRole !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'You can only reply after Nexxau has responded' },
          { status: 400 }
        );
      }
      // Company can only send one reply after each super-admin message
      const companyRepliesAfterLast = dispute.messages
        .slice(dispute.messages.indexOf(lastMsg) + 1)
        .filter((m: any) => m.authorRole === 'COMPANY');
      if (companyRepliesAfterLast.length > 0) {
        return NextResponse.json(
          { error: 'Wait for Nexxau to respond before replying again' },
          { status: 400 }
        );
      }
      const msg = await (prisma as any).disputeMessage.create({
        data: {
          disputeId,
          authorId:   session.user.id,
          authorRole: 'COMPANY',
          content:    message.trim(),
        },
        include: { author: { select: { id: true, name: true, email: true } } },
      });
      return NextResponse.json({ success: true, data: msg });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('[FP Dispute] PATCH error:', error);
    return NextResponse.json({ error: 'Failed to process dispute action', details: error.message }, { status: 500 });
  }
}

// ── GET: fetch dispute thread ─────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const disputeId = searchParams.get('disputeId');

    if (!disputeId) return NextResponse.json({ error: 'disputeId is required' }, { status: 400 });

    const dispute = await (prisma as any).falsePositiveDispute.findUnique({
      where: { id: disputeId },
      include: {
        submittedBy: { select: { id: true, name: true, email: true } },
        messages: {
          include: { author: { select: { id: true, name: true, email: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!dispute || dispute.fpReviewId !== id) {
      return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: dispute });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch dispute', details: error.message }, { status: 500 });
  }
}

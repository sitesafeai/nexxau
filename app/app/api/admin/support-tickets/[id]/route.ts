import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import type { SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

const STATUSES = new Set<SupportTicketStatus>([
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED',
]);
const PRIORITIES = new Set<SupportTicketPriority>(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/admin/support-tickets/[id]
 */
export async function GET(_request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;

    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        contactInquiry: { select: { id: true, email: true, name: true, sourcePage: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support-tickets][id] GET', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load ticket', details: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/support-tickets/[id]
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await request.json();
    const { status, priority } = body as { status?: string; priority?: string };

    const data: { status?: SupportTicketStatus; priority?: SupportTicketPriority } = {};
    if (status !== undefined) {
      if (!STATUSES.has(status as SupportTicketStatus)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      data.status = status as SupportTicketStatus;
    }
    if (priority !== undefined) {
      if (!PRIORITIES.has(priority as SupportTicketPriority)) {
        return NextResponse.json({ success: false, error: 'Invalid priority' }, { status: 400 });
      }
      data.priority = priority as SupportTicketPriority;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No updates' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        contactInquiry: { select: { id: true, email: true, name: true, sourcePage: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support-tickets][id] PATCH', message);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket', details: message },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import type { SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

const ALLOWED_STATUS: SupportTicketStatus[] = [
  'OPEN',
  'IN_PROGRESS',
  'WAITING_ON_CUSTOMER',
  'RESOLVED',
  'CLOSED',
];

const ALLOWED_PRIORITY: SupportTicketPriority[] = ['LOW', 'NORMAL', 'HIGH', 'URGENT'];

/**
 * GET /api/admin/support/tickets/[id]
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const ticket = await prisma.supportTicket.findUnique({
      where: { id },
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support][tickets][id] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load ticket', details: message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/support/tickets/[id]
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const status = body.status as SupportTicketStatus | undefined;
    const priority = body.priority as SupportTicketPriority | undefined;

    const data: {
      status?: SupportTicketStatus;
      priority?: SupportTicketPriority;
    } = {};

    if (status !== undefined) {
      if (!ALLOWED_STATUS.includes(status)) {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      data.status = status;
    }
    if (priority !== undefined) {
      if (!ALLOWED_PRIORITY.includes(priority)) {
        return NextResponse.json({ success: false, error: 'Invalid priority' }, { status: 400 });
      }
      data.priority = priority;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ success: false, error: 'No valid fields to update' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.update({
      where: { id },
      data,
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support][tickets][id] PATCH failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to update ticket', details: message },
      { status: 500 }
    );
  }
}

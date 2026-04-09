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
 * GET /api/admin/support/tickets?status=&companyId=
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as SupportTicketStatus | null;
    const companyId = searchParams.get('companyId') || undefined;

    const where: Record<string, unknown> = {};
    if (status && ALLOWED_STATUS.includes(status)) {
      where.status = status;
    }
    if (companyId) {
      where.companyId = companyId;
    }

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { id: true, createdAt: true, body: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support][tickets] GET failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to list tickets', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/support/tickets
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    const priority = body.priority as SupportTicketPriority | undefined;
    const companyId = typeof body.companyId === 'string' ? body.companyId : null;
    const worksiteId = typeof body.worksiteId === 'string' ? body.worksiteId : null;

    if (!subject || !description) {
      return NextResponse.json(
        { success: false, error: 'subject and description are required' },
        { status: 400 }
      );
    }

    if (priority && !ALLOWED_PRIORITY.includes(priority)) {
      return NextResponse.json({ success: false, error: 'Invalid priority' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        description,
        priority: priority && ALLOWED_PRIORITY.includes(priority) ? priority : 'NORMAL',
        companyId: companyId || undefined,
        worksiteId: worksiteId || undefined,
        createdById: auth.session.user.id,
      },
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support][tickets] POST failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to create ticket', details: message },
      { status: 500 }
    );
  }
}

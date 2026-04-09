import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
import type { SupportTicketPriority, SupportTicketStatus } from '@prisma/client';

const PRIORITIES = new Set<SupportTicketPriority>(['LOW', 'NORMAL', 'HIGH', 'URGENT']);

/**
 * GET /api/admin/support-tickets — list (super-admin)
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') as SupportTicketStatus | null;
    const companyId = searchParams.get('companyId') || undefined;

    const where: {
      status?: SupportTicketStatus;
      companyId?: string;
    } = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    const tickets = await prisma.supportTicket.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 200,
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        contactInquiry: { select: { id: true, email: true, name: true, sourcePage: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ success: true, data: tickets });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const code =
      error && typeof error === 'object' && 'code' in error
        ? String((error as { code?: string }).code)
        : '';
    console.error('[admin][support-tickets] GET', code, message);
    if (code === 'P2021' || /relation .* does not exist|table .* does not exist/i.test(message)) {
      return NextResponse.json({
        success: true,
        data: [] as unknown[],
        warning:
          'Support ticket tables are missing in the database. From the app directory run: npx prisma migrate deploy (or prisma db push in development).',
      });
    }
    return NextResponse.json(
      { success: false, error: 'Failed to list tickets', details: message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/support-tickets — create (super-admin)
 */
export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { subject, description, priority, companyId, worksiteId, source } = body as {
      subject?: string;
      description?: string;
      priority?: string;
      companyId?: string | null;
      worksiteId?: string | null;
      source?: string;
    };

    if (!subject || typeof subject !== 'string' || !description || typeof description !== 'string') {
      return NextResponse.json(
        { success: false, error: 'subject and description are required' },
        { status: 400 }
      );
    }

    const email = auth.session.user.email;
    if (!email) {
      return NextResponse.json({ success: false, error: 'No email on session' }, { status: 400 });
    }

    let prio: SupportTicketPriority = 'NORMAL';
    if (priority && PRIORITIES.has(priority as SupportTicketPriority)) {
      prio = priority as SupportTicketPriority;
    }

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const src =
      source === 'internal' || source === 'web_contact' || source === 'web_sales'
        ? source
        : 'internal';

    const ticket = await prisma.supportTicket.create({
      data: {
        subject: subject.trim().slice(0, 200),
        description: description.trim(),
        priority: prio,
        source: src,
        companyId: companyId || null,
        worksiteId: worksiteId || null,
        createdById: dbUser?.id ?? null,
      },
      include: {
        company: { select: { id: true, name: true } },
        worksite: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        contactInquiry: { select: { id: true, email: true, name: true, sourcePage: true } },
        _count: { select: { messages: true } },
      },
    });

    return NextResponse.json({ success: true, data: ticket });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support-tickets] POST', message);
    return NextResponse.json(
      { success: false, error: 'Failed to create ticket', details: message },
      { status: 500 }
    );
  }
}

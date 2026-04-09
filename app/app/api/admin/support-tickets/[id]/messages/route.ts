import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/support-tickets/[id]/messages
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: ticketId } = await context.params;
    const body = await request.json();
    const { body: text, internal } = body as { body?: string; internal?: boolean };

    if (!text || typeof text !== 'string' || !text.trim()) {
      return NextResponse.json({ success: false, error: 'body is required' }, { status: 400 });
    }

    const email = auth.session.user.email;
    if (!email) {
      return NextResponse.json({ success: false, error: 'No email on session' }, { status: 400 });
    }

    const author = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    const message = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        body: text.trim(),
        internal: Boolean(internal),
        authorId: author?.id ?? null,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.supportTicket.update({
      where: { id: ticketId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, data: message });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[admin][support-tickets][id][messages] POST', message);
    return NextResponse.json(
      { success: false, error: 'Failed to add message', details: message },
      { status: 500 }
    );
  }
}

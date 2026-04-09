import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

/**
 * POST /api/admin/support/tickets/[id]/messages
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return auth.response;

  try {
    const { id: ticketId } = await params;
    const body = await request.json();
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
    const internal = Boolean(body.internal);

    if (!bodyText) {
      return NextResponse.json({ success: false, error: 'body is required' }, { status: 400 });
    }

    const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    const message = await prisma.supportTicketMessage.create({
      data: {
        ticketId,
        body: bodyText,
        internal,
        authorId: auth.session.user.id,
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
    console.error('[admin][support][tickets][id][messages] POST failed', message);
    return NextResponse.json(
      { success: false, error: 'Failed to add message', details: message },
      { status: 500 }
    );
  }
}

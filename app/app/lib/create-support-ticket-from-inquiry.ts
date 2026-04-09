import { prisma } from '@/app/lib/prisma';

type InquiryRow = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  industry: string | null;
  message: string;
  sourcePage: string | null;
};

/**
 * Mirrors a public contact form row into SupportTicket so super-admin can triage in one queue.
 * Best-effort: failures are logged and do not fail the contact form.
 */
export async function createSupportTicketFromContactInquiry(
  inquiry: InquiryRow
): Promise<{ id: string } | null> {
  try {
    const source =
      inquiry.sourcePage?.includes('sales') || inquiry.sourcePage === 'contact/sales'
        ? 'web_sales'
        : 'web_contact';

    const subject = `[Web] ${inquiry.name}${inquiry.company ? ` — ${inquiry.company}` : ''}`.slice(
      0,
      200
    );

    const description = [
      `Contact inquiry ID: ${inquiry.id}`,
      `From: ${inquiry.name} <${inquiry.email}>`,
      inquiry.company ? `Company: ${inquiry.company}` : null,
      inquiry.industry ? `Industry: ${inquiry.industry}` : null,
      inquiry.sourcePage ? `Source page: ${inquiry.sourcePage}` : null,
      '',
      '---',
      '',
      inquiry.message,
    ]
      .filter((line) => line != null && line !== '')
      .join('\n');

    const ticket = await prisma.supportTicket.create({
      data: {
        subject,
        description,
        source,
        status: 'OPEN',
        priority: 'NORMAL',
        contactInquiryId: inquiry.id,
      },
      select: { id: true },
    });

    return ticket;
  } catch (err: unknown) {
    const code = err && typeof err === 'object' && 'code' in err ? String((err as { code?: string }).code) : '';
    console.error('[createSupportTicketFromContactInquiry]', code, err);
    return null;
  }
}

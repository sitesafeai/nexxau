import { NextResponse } from 'next/server';
import { sendResendHtml, isResendConfigured } from '@/app/lib/resend-mail';

/**
 * GET /api/test-email — sends a test message via Resend.
 * Set TEST_EMAIL_TO (or RESEND_TEST_TO) to the recipient address.
 */
export async function GET() {
  try {
    if (!isResendConfigured()) {
      return NextResponse.json(
        { error: 'RESEND_API_KEY is not configured' },
        { status: 503 }
      );
    }

    const to = process.env.TEST_EMAIL_TO?.trim() || process.env.RESEND_TEST_TO?.trim();
    if (!to) {
      return NextResponse.json(
        {
          error: 'Set TEST_EMAIL_TO (or RESEND_TEST_TO) to a recipient email for test sends.',
        },
        { status: 400 }
      );
    }

    const result = await sendResendHtml({
      to,
      subject: 'Nexxau test email (Resend)',
      html: '<p>This is a test email sent via Resend.</p>',
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ message: 'Test email sent successfully', id: result.id });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send test email' },
      { status: 500 }
    );
  }
}

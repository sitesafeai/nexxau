import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { sendResendHtml, getResendFromAddress } from '@/app/lib/resend-mail';
import { createSupportTicketFromContactInquiry } from '@/app/lib/create-support-ticket-from-inquiry';

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, industry, message, sourcePage, companySize } = body as {
      name?: string;
      email?: string;
      company?: string;
      industry?: string;
      message?: string;
      sourcePage?: string;
      companySize?: string;
    };

    let messageBody = typeof message === 'string' ? message : '';
    if (companySize && typeof companySize === 'string' && companySize.trim()) {
      messageBody = `${messageBody}\n\n---\nCompany size: ${companySize.trim()}`;
    }

    // Validate required fields
    if (!name || !email || !messageBody.trim()) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Check if Prisma client has the model
    if (typeof prisma.contactInquiry === 'undefined') {
      console.error('[Contact API] ❌ ContactInquiry model not found in Prisma client!');
      console.error('[Contact API] Prisma client models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).slice(0, 10));
      return NextResponse.json(
        { 
          error: 'Database model not available',
          details: 'ContactInquiry model is missing from Prisma client. Please restart the server after running: npx prisma generate',
        },
        { status: 500 }
      );
    }

    // Save to database
    let inquiry;
    try {
      inquiry = await prisma.contactInquiry.create({
      data: {
        name,
        email,
        company: company || null,
        industry: industry || null,
        message: messageBody,
        sourcePage: sourcePage || null,
        status: 'UNREAD',
        isRead: false,
      },
    });
    } catch (dbError: any) {
      console.error('[Contact API] Database error:', dbError);
      console.error('[Contact API] Error message:', dbError?.message);
      console.error('[Contact API] Error code:', dbError?.code);
      console.error('[Contact API] Error name:', dbError?.name);
      if (dbError?.meta) {
        console.error('[Contact API] Error meta:', JSON.stringify(dbError.meta, null, 2));
      }
      
      return NextResponse.json(
        { 
          error: 'Failed to save contact inquiry',
          details: dbError?.message || 'Database error',
          code: dbError?.code,
        },
        { status: 500 }
      );
    }

    void createSupportTicketFromContactInquiry({
      id: inquiry.id,
      name,
      email,
      company: company || null,
      industry: industry || null,
      message: messageBody,
      sourcePage: sourcePage || null,
    });

    // Log the contact form submission (for debugging and monitoring)
    console.log('Contact form submission received:', {
      id: inquiry.id,
      name,
      email,
      company,
      industry,
      message: messageBody,
      sourcePage,
      timestamp: new Date().toISOString()
    });

    const fromAddress = getResendFromAddress();

    // Send emails via Resend (only if API key is available)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key_here') {
      const internalHtml = `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${escapeHtml(String(name))}</p>
            <p><strong>Email:</strong> ${escapeHtml(String(email))}</p>
            ${company ? `<p><strong>Company:</strong> ${escapeHtml(String(company))}</p>` : ''}
            ${industry ? `<p><strong>Industry:</strong> ${escapeHtml(String(industry))}</p>` : ''}
            ${sourcePage ? `<p><strong>Source Page:</strong> ${escapeHtml(String(sourcePage))}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${escapeHtml(messageBody).replace(/\n/g, '<br>')}</p>
            <hr>
            <p><em>This message was sent from the Nexxau contact form.</em></p>
          `;

      try {
        const internalSubject = `New Contact Form Submission from ${String(name).replace(/[\r\n]/g, ' ').slice(0, 120)}`;
        const internalResult = await sendResendHtml({
          from: fromAddress,
          to: ['sitesafeai@gmail.com'],
          subject: internalSubject,
          html: internalHtml,
          replyTo: email,
        });
        if (internalResult.success) {
          console.log('[contact] Internal notification email sent via Resend');
        } else {
          console.error('[contact] Internal notification failed:', internalResult.error);
        }
      } catch (emailError) {
        console.error('[contact] Error sending internal notification email:', emailError);
      }

      // Acknowledgement to the visitor (includes subject line + copy of their message)
      const friendlySubject =
        company && String(company).trim()
          ? `Contact request — ${String(company).trim()}`
          : `Contact request — ${String(name).trim()}`;

      const confirmationHtml = `
            <p>Hi ${escapeHtml(String(name).trim())},</p>
            <p>Thanks for contacting Nexxau. We've received your message and will get back to you as soon as we can — typically within 24 hours.</p>
            <p><strong>Subject:</strong> ${escapeHtml(friendlySubject)}</p>
            ${sourcePage ? `<p><strong>Form:</strong> ${escapeHtml(String(sourcePage))}</p>` : ''}
            <p><strong>Your message:</strong></p>
            <blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #2563eb;background:#f8fafc;color:#0f172a;border-radius:0 8px 8px 0;font-size:14px;line-height:1.5;">
              ${escapeHtml(messageBody).replace(/\n/g, '<br>')}
            </blockquote>
            <p style="color:#64748b;font-size:13px;margin-top:24px;">If you didn't submit this form, you can ignore this email.</p>
            <p style="color:#64748b;font-size:13px;">— The Nexxau team</p>
          `;

      try {
        const confirmResult = await sendResendHtml({
          from: fromAddress,
          to: [email],
          subject: "We've received your message — Nexxau",
          html: confirmationHtml,
        });
        if (confirmResult.success) {
          console.log('[contact] Confirmation email sent to submitter via Resend');
        } else {
          console.error('[contact] Confirmation email failed:', confirmResult.error);
        }
      } catch (confirmError) {
        console.error('[contact] Error sending confirmation email to submitter:', confirmError);
      }
    } else {
      console.log('RESEND_API_KEY not set or invalid, skipping email send');
    }

    return NextResponse.json(
      { message: 'Message sent successfully', id: inquiry.id },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error processing contact form:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack,
    });
    
    // Return detailed error in development
    const errorMessage = error?.message || 'Unknown error';
    const errorCode = error?.code || 'UNKNOWN';
    
    return NextResponse.json(
      { 
        error: 'Failed to send message',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        code: process.env.NODE_ENV === 'development' ? errorCode : undefined,
      },
      { status: 500 }
    );
  }
} 
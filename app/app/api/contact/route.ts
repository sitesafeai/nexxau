import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, industry, message, sourcePage } = body;

    // Validate required fields
    if (!name || !email || !message) {
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
        message,
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

    // Log the contact form submission (for debugging and monitoring)
    console.log('Contact form submission received:', {
      id: inquiry.id,
      name,
      email,
      company,
      industry,
      message,
      sourcePage,
      timestamp: new Date().toISOString()
    });

    // Send email using Resend (only if API key is available)
    if (process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key_here') {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: 'Nexxau Contact Form <contact@nexxau.com>',
          to: ['sitesafeai@gmail.com'],
          subject: `New Contact Form Submission from ${name}`,
          html: `
            <h2>New Contact Form Submission</h2>
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
            ${industry ? `<p><strong>Industry:</strong> ${industry}</p>` : ''}
            ${sourcePage ? `<p><strong>Source Page:</strong> ${sourcePage}</p>` : ''}
            <p><strong>Message:</strong></p>
            <p>${message.replace(/\n/g, '<br>')}</p>
            <hr>
            <p><em>This message was sent from the Nexxau contact form.</em></p>
          `,
          replyTo: email,
        });
        console.log('Email sent successfully via Resend!');
      } catch (emailError) {
        console.error('Error sending email via Resend:', emailError);
        // Continue with success response even if email fails
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
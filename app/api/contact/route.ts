import { NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, industry, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Log the contact form submission (for debugging and monitoring)
    console.log('Contact form submission received:', {
      name,
      email,
      company,
      industry,
      message,
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
      { message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error processing contact form:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 
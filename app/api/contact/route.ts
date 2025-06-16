import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

console.log('Environment variables check:');
console.log('GMAIL_USER:', process.env.GMAIL_USER);
console.log('GMAIL_CLIENT_ID:', process.env.GMAIL_CLIENT_ID ? 'Set' : 'Not set');
console.log('GMAIL_CLIENT_SECRET:', process.env.GMAIL_CLIENT_SECRET ? 'Set' : 'Not set');
console.log('GMAIL_REFRESH_TOKEN:', process.env.GMAIL_REFRESH_TOKEN ? 'Set' : 'Not set');

// Create a transporter using Gmail OAuth2
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.GMAIL_USER,
    clientId: process.env.GMAIL_CLIENT_ID,
    clientSecret: process.env.GMAIL_CLIENT_SECRET,
    refreshToken: process.env.GMAIL_REFRESH_TOKEN,
    accessToken: process.env.GMAIL_ACCESS_TOKEN
  }
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, company, companySize, industry, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required' },
        { status: 400 }
      );
    }

    // Ensure we have the Gmail user email
    if (!process.env.GMAIL_USER) {
      throw new Error('GMAIL_USER environment variable is not set');
    }

    // Prepare email content
    const mailOptions = {
      from: `"Nexxau Contact Form" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `New Contact Form Submission from ${name}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        ${company ? `<p><strong>Company:</strong> ${company}</p>` : ''}
        ${companySize ? `<p><strong>Company Size:</strong> ${companySize}</p>` : ''}
        ${industry ? `<p><strong>Industry:</strong> ${industry}</p>` : ''}
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
      replyTo: email,
    };

    console.log('Attempting to send email to:', process.env.GMAIL_USER);
    
    // Send email
    await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');

    return NextResponse.json(
      { message: 'Message sent successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
} 
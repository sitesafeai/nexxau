import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    // Create a transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'sitesafeai@gmail.com',
        pass: 'nihv znyo bbkh dvih'
      }
    });

    // Send a test email
    await transporter.sendMail({
      from: 'sitesafeai@gmail.com',
      to: 'sitesafeai@gmail.com',
      subject: 'Test Email',
      text: 'This is a test email from SiteSafe',
    });

    return NextResponse.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 
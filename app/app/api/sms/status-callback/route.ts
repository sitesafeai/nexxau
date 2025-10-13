import { NextRequest, NextResponse } from 'next/server';
import { smsService } from '../../../lib/sms-service';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    
    const messageId = formData.get('MessageSid') as string;
    const status = formData.get('MessageStatus') as string;
    const errorCode = formData.get('ErrorCode') as string;
    const errorMessage = formData.get('ErrorMessage') as string;

    if (!messageId || !status) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Handle the status callback
    await smsService.handleStatusCallback(
      messageId,
      status,
      errorCode || undefined,
      errorMessage || undefined
    );

    console.log(`SMS status callback received: ${messageId} - ${status}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('SMS status callback error:', error);
    return NextResponse.json({ error: 'Failed to process status callback' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const alertResponse = await prisma.alertResponse.update({
      where: { id: params.id },
      data: {
        // Note: AlertResponse doesn't have status or acknowledgedAt fields
        // Use response field instead: 'acknowledged'
        response: 'acknowledged'
      }
    });

    return NextResponse.json(alertResponse);
  } catch (error) {
    console.error('Failed to acknowledge alert:', error);
    return NextResponse.json({ error: 'Failed to acknowledge alert' }, { status: 500 });
  }
}

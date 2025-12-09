import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { notes } = body;

    const alertResponse = await prisma.alertResponse.update({
      where: { id: params.id },
      data: {
        // Note: AlertResponse doesn't have status or resolvedAt fields
        // Use response field instead: 'resolved'
        response: 'resolved',
        notes
      }
    });

    return NextResponse.json(alertResponse);
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    return NextResponse.json({ error: 'Failed to resolve alert' }, { status: 500 });
  }
}

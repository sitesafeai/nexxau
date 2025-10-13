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
        status: 'resolved',
        resolvedAt: new Date(),
        notes
      }
    });

    return NextResponse.json(alertResponse);
  } catch (error) {
    console.error('Failed to resolve alert:', error);
    return NextResponse.json({ error: 'Failed to resolve alert' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const alertResponses = await prisma.alertResponse.findMany({
      where,
      include: {
        // Note: AlertResponse doesn't have alertRule relation
        alert: {
          select: {
            id: true,
            severity: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });

    return NextResponse.json(alertResponses);
  } catch (error) {
    console.error('Failed to fetch alert responses:', error);
    return NextResponse.json({ error: 'Failed to fetch alert responses' }, { status: 500 });
  }
}

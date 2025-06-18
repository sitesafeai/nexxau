import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '@/app/lib/auth';

// GET /api/alerts/[id] - Get a single alert
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: {
        site: true,
        rule: true,
        responses: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!alert) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    }

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error fetching alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/alerts/[id] - Update an alert
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { status } = body;

    const alert = await prisma.alert.update({
      where: { id: params.id },
      data: {
        status,
        ...(status === 'RESOLVED' && { resolvedAt: new Date() }),
        responses: {
          create: {
            action: status,
            userId: session.user.id,
          },
        },
      },
      include: {
        site: true,
        rule: true,
        responses: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error updating alert:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
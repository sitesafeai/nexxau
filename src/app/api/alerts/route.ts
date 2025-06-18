import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '@/app/lib/auth';
import { Prisma, AlertSeverity, AlertStatus } from '@prisma/client';

// GET /api/alerts - Get all alerts with optional filters
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const siteId = searchParams.get('siteId');
    const severity = searchParams.get('severity') as AlertSeverity | null;
    const status = searchParams.get('status') as AlertStatus | null;

    const where: Prisma.AlertWhereInput = {
      ...(search && {
        OR: [
          {
            title: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            } as Prisma.StringFilter,
          },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            } as Prisma.StringFilter,
          },
        ],
      }),
      ...(siteId && { siteId }),
      ...(severity && { severity }),
      ...(status && { status }),
    };

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        site: true,
        rule: true,
      },
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// POST /api/alerts - Create a new alert
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const alert = await prisma.alert.create({
      data: {
        ...data,
        userId: session.user.id,
      },
      include: {
        site: true,
        rule: true,
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error creating alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
} 
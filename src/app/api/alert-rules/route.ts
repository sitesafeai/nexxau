import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

// GET /api/alert-rules - Get all alert rules
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('siteId');

    const rules = await prisma.alertRule.findMany({
      where: {
        ...(siteId && { siteId }),
      },
      include: {
        site: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(rules);
  } catch (error) {
    console.error('Error fetching alert rules:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/alert-rules - Create a new alert rule
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, condition, severity, isActive, siteId } = body;

    const rule = await prisma.alertRule.create({
      data: {
        name,
        description,
        condition,
        severity,
        isActive,
        siteId,
      },
      include: {
        site: true,
      },
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Error creating alert rule:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
} 
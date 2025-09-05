import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET() {
  try {
    const alerts = await prisma.alert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100, // Limit to last 100 alerts
      include: {
        rule: {
          select: { name: true }
        },
        worksite: {
          select: { name: true }
        }
      }
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Failed to fetch alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const alert = await prisma.alert.create({
      data: {
        title: body.title || 'Safety Alert',
        description: body.description,
        severity: body.severity || 'MEDIUM',
        status: 'ACTIVE',
        source: body.source || 'camera',
        location: body.location,
        metadata: body.metadata || {},
        ruleId: body.ruleId,
        worksiteId: body.worksiteId
      }
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Failed to create alert:', error);
    return NextResponse.json(
      { error: 'Failed to create alert' },
      { status: 500 }
    );
  }
}

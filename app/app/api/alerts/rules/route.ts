import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const alertRules = await prisma.alertRule.findMany({
      include: {
        alertResponses: {
          select: {
            id: true,
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(alertRules);
  } catch (error) {
    console.error('Failed to fetch alert rules:', error);
    return NextResponse.json({ error: 'Failed to fetch alert rules' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, severity, conditions, actions, isActive = true } = body;

    const alertRule = await prisma.alertRule.create({
      data: {
        name,
        description,
        severity,
        conditions: conditions || [],
        actions: actions || [],
        isActive,
        createdBy: 'system' // TODO: Get from auth context
      }
    });

    return NextResponse.json(alertRule, { status: 201 });
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    return NextResponse.json({ error: 'Failed to create alert rule' }, { status: 500 });
  }
}
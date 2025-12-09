import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const alertRules = await prisma.alertRule.findMany({
      // Note: AlertRule doesn't have alertResponses relation
      // Remove include if not needed, or include alerts relation if it exists
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
        condition: conditions || {}, // Using condition (singular) as per schema, default to empty object
        actions: actions || [],
        isActive,
        category: body.category || 'PPE_COMPLIANCE', // Required field - use provided category or default
        escalationLevels: body.escalationLevels || [], // Required field - default to empty array
        // Note: createdBy doesn't exist in AlertRule schema
      }
    });

    return NextResponse.json(alertRule, { status: 201 });
  } catch (error) {
    console.error('Failed to create alert rule:', error);
    return NextResponse.json({ error: 'Failed to create alert rule' }, { status: 500 });
  }
}
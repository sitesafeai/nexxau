import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, severity, conditions, actions, isActive } = body;

    const alertRule = await prisma.alertRule.update({
      where: { id },
      data: {
        name,
        description,
        severity,
        condition: conditions, // Using condition (singular) as per schema
        actions,
        isActive,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(alertRule);
  } catch (error) {
    console.error('Failed to update alert rule:', error);
    return NextResponse.json({ error: 'Failed to update alert rule' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.alertRule.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Alert rule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete alert rule:', error);
    return NextResponse.json({ error: 'Failed to delete alert rule' }, { status: 500 });
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const rule = await prisma.alertRule.update({
      where: { id: params.id },
      data: {
        name: body.name,
        description: body.description,
        severity: body.severity,
        isActive: body.enabled !== undefined ? body.enabled : undefined,
        condition: {
          camera: body.camera,
          threshold: body.threshold,
          workflow: body.workflow,
          category: body.category,
          subject: body.subject,
          mode: body.mode,
          speedLimit: body.speedLimit
        }
      }
    });

    return NextResponse.json(rule);
  } catch (error) {
    console.error('Failed to update alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to update alert rule' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.alertRule.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete alert rule:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert rule' },
      { status: 500 }
    );
  }
}


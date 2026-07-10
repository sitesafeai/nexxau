import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await params;
    const body = await request.json();
    const { name, description, severity, conditions, actions, isActive } = body;

    // Fetch rule before update so we can capture old values
    const oldRule = await prisma.alertRule.findUnique({ where: { id }, select: { name: true, severity: true, isActive: true, worksiteId: true } }).catch(() => null);

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

    // Audit log
    if (session?.user?.id) {
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RULE_UPDATED',
          entity: 'RULE',
          entityId: id,
          worksiteId: oldRule?.worksiteId || null,
          metadata: {
            entityName: name || oldRule?.name,
            severity: 'INFO',
            result: 'SUCCESS',
            details: { alertSeverity: severity },
          },
          changes: {
            old: { name: oldRule?.name, severity: oldRule?.severity, isActive: oldRule?.isActive },
            new: { name, severity, isActive },
          },
        },
      }).catch(() => {});
    }

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
    const session = await getServerSession(authOptions);
    const { id } = await params;

    // Fetch rule before deletion so we can capture name
    const rule = await prisma.alertRule.findUnique({ where: { id }, select: { name: true, severity: true, worksiteId: true } }).catch(() => null);

    await prisma.alertRule.delete({
      where: { id }
    });

    // Audit log
    if (session?.user?.id) {
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'RULE_DELETED',
          entity: 'RULE',
          entityId: id,
          worksiteId: rule?.worksiteId || null,
          metadata: {
            entityName: rule?.name || id,
            severity: 'WARNING',
            result: 'SUCCESS',
            details: { alertSeverity: rule?.severity },
          },
        },
      }).catch(() => {});
    }

    return NextResponse.json({ message: 'Alert rule deleted successfully' });
  } catch (error) {
    console.error('Failed to delete alert rule:', error);
    return NextResponse.json({ error: 'Failed to delete alert rule' }, { status: 500 });
  }
}
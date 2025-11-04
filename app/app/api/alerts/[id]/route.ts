import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { canAcknowledgeAlerts, canResolveAlerts, UserRole } from '@/app/lib/permissions';
import { logAlertAction } from '@/app/lib/audit-logger';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check permissions
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Check if user can acknowledge/resolve based on status
    if (body.status === 'ACKNOWLEDGED' && !canAcknowledgeAlerts(user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to acknowledge alerts' },
        { status: 403 }
      );
    }

    if (body.status === 'RESOLVED' && !canResolveAlerts(user.role as UserRole)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to resolve alerts' },
        { status: 403 }
      );
    }
    
    const alert = await prisma.alert.update({
      where: { id: params.id },
      data: {
        status: body.status,
        description: body.description,
        metadata: body.metadata,
        resolvedAt: body.status === 'RESOLVED' ? new Date() : undefined
      }
    });

    // Log audit trail
    if (body.status === 'ACKNOWLEDGED') {
      await logAlertAction(user.id, 'ACKNOWLEDGE_ALERT', params.id, request);
    } else if (body.status === 'RESOLVED') {
      await logAlertAction(user.id, 'RESOLVE_ALERT', params.id, request);
    }

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Failed to update alert:', error);
    return NextResponse.json(
      { error: 'Failed to update alert' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.alert.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete alert:', error);
    return NextResponse.json(
      { error: 'Failed to delete alert' },
      { status: 500 }
    );
  }
}

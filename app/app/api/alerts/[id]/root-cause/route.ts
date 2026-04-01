import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * PATCH /api/alerts/[id]/root-cause
 * Add root cause before closing MODERATE/SEVERE alert
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { rootCause, actionTaken } = body;

    // Required root cause options
    const validRootCauses = [
      'PPE_PROVIDED',
      'WORKER_REMOVED',
      'AREA_SECURED',
      'REBRIEFING_COMPLETED',
      'FALSE_POSITIVE',
      'OTHER'
    ];

    if (!rootCause || !validRootCauses.includes(rootCause)) {
      return NextResponse.json(
        { success: false, error: 'Valid root cause required', validOptions: validRootCauses },
        { status: 400 }
      );
    }

    const alert = await prisma.alert.findUnique({
      where: { id }
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Check if root cause is required
    const requiresRootCause = alert.metadata && (alert.metadata as any).autoClassification?.requiresRootCause;
    if (!requiresRootCause && alert.severity !== 'WARNING' && alert.severity !== 'CRITICAL') {
      return NextResponse.json(
        { success: false, error: 'Root cause not required for this alert' },
        { status: 400 }
      );
    }

    // Update alert with root cause
    await prisma.alert.update({
      where: { id },
      data: {
        metadata: {
          ...(alert.metadata as any),
          rootCause: {
            type: rootCause,
            actionTaken: actionTaken || null,
            recordedBy: session.user.id,
            recordedAt: new Date().toISOString()
          }
        } as any
      }
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ROOT_CAUSE_RECORDED',
        entity: 'Alert', // Using entity instead of entityType
        entityId: id,
        worksiteId: alert.worksiteId,
        changes: {
          rootCause,
          actionTaken
        } as any
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Root cause recorded'
    });
  } catch (error: any) {
    console.error('[Root Cause] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to record root cause', details: error.message },
      { status: 500 }
    );
  }
}


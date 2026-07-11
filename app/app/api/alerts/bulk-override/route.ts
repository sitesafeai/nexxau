import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';
import { writeAuditLog } from '@/app/lib/audit';

const bulkOverrideSchema = z.object({
  alertIds: z.array(z.string()).min(1, 'At least one alert ID is required'),
  overrideStatus: z.enum(['false_positive', 'confirmed_violation']),
  overrideReason: z.enum([
    'poor_visibility',
    'occlusion',
    'incorrect_class',
    'ppe_present_but_obscured',
    'lighting_issue',
    'reflection',
    'camera_angle',
    'other'
  ]).optional(),
  isTrainingCandidate: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
});

/**
 * POST /api/alerts/bulk-override
 * Apply override to multiple alerts at once
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = bulkOverrideSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { alertIds, overrideStatus, overrideReason, isTrainingCandidate, notes } = validation.data;

    // Verify all alerts exist
    const existingAlerts = await prisma.alert.findMany({
      where: {
        id: { in: alertIds }
      },
      select: {
        id: true,
        title: true,
        worksiteId: true,
        overrideStatus: true,
        isTrainingCandidate: true,
      }
    });

    if (existingAlerts.length !== alertIds.length) {
      return NextResponse.json(
        { success: false, error: 'Some alerts not found' },
        { status: 404 }
      );
    }

    // Perform bulk override in a transaction
    const results = await prisma.$transaction(async (tx) => {
      const updates = [];
      const auditLogs = [];

      for (const alert of existingAlerts) {
        const oldStatus = alert.overrideStatus;
        const oldTrainingCandidate = alert.isTrainingCandidate;

        // Update alert
        const updated = await tx.alert.update({
          where: { id: alert.id },
          data: {
            overrideStatus,
            overrideBy: session.user.id,
            overrideAt: new Date(),
            overrideReason: overrideReason || null,
            isTrainingCandidate: isTrainingCandidate ?? false,
          },
          include: {
            rule: {
              select: { name: true }
            },
            worksite: {
              select: { id: true, name: true }
            },
            camera: {
              select: { id: true, name: true }
            }
          }
        });

        updates.push(updated);

        // Create audit log
        auditLogs.push({
          alertId: alert.id,
          userId: session.user.id,
          oldStatus,
          newStatus: overrideStatus,
          oldTrainingCandidate,
          newTrainingCandidate: isTrainingCandidate ?? false,
          reason: overrideReason || null,
          notes: notes || null,
        });
      }

      // Bulk create audit logs
      await tx.alertOverrideAuditLog.createMany({
        data: auditLogs,
      });

      return updates;
    });

    // Write one audit log entry per overridden alert (fire-and-forget)
    const auditAction = overrideStatus === 'confirmed_violation'
      ? 'ALERT_OVERRIDE_CONFIRMED'
      : 'ALERT_OVERRIDE_FALSE_POSITIVE';
    for (const alert of existingAlerts) {
      writeAuditLog({
        userId: session.user.id,
        worksiteId: alert.worksiteId,
        action: auditAction,
        entity: 'ALERT',
        entityId: alert.id,
        entityName: alert.title || alert.id,
        severity: 'WARNING',
        result: 'SUCCESS',
        details: {
          overrideStatus,
          overrideReason: overrideReason || null,
          isTrainingCandidate: isTrainingCandidate ?? false,
          notes: notes || null,
          bulk: true,
          totalInBatch: alertIds.length,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: results,
      count: results.length,
      message: `Successfully overridden ${results.length} alert(s)`,
    });
  } catch (error: any) {
    console.error('Failed to bulk override alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to bulk override alerts',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

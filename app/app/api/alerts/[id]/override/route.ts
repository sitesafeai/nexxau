import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { z } from 'zod';

const overrideSchema = z.object({
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
 * POST /api/alerts/[id]/override
 * Apply human override to an alert (mark as false positive or confirmed violation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validation = overrideSchema.safeParse(body);

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

    const { overrideStatus, overrideReason, isTrainingCandidate, notes } = validation.data;

    // Get existing alert
    const existingAlert = await prisma.alert.findUnique({
      where: { id: params.id },
      include: {
        worksite: true,
        camera: true,
      }
    });

    if (!existingAlert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Perform override in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const oldStatus = existingAlert.overrideStatus;
      const oldTrainingCandidate = existingAlert.isTrainingCandidate;

      // Update alert with override
      const updatedAlert = await tx.alert.update({
        where: { id: params.id },
        data: {
          overrideStatus,
          overrideBy: session.user.id,
          overrideAt: new Date(),
          overrideReason: overrideReason || null,
          isTrainingCandidate: isTrainingCandidate ?? false,
        },
        include: {
          rule: {
            select: { name: true, description: true, severity: true }
          },
          worksite: {
            select: { id: true, name: true, worksiteName: true }
          },
          camera: {
            select: { id: true, name: true, location: true }
          },
          overrideByUser: {
            select: { id: true, name: true, email: true }
          }
        }
      });

      // Create audit log entry
      await tx.alertOverrideAuditLog.create({
        data: {
          alertId: params.id,
          userId: session.user.id,
          oldStatus,
          newStatus: overrideStatus,
          oldTrainingCandidate,
          newTrainingCandidate: isTrainingCandidate ?? false,
          reason: overrideReason || null,
          notes: notes || null,
        }
      });

      return updatedAlert;
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Alert override applied successfully',
    });
  } catch (error: any) {
    console.error('Failed to override alert:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to override alert',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

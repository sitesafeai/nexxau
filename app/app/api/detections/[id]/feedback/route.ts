import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { detectionFeedbackSchema } from '@/app/lib/validation/detection';
import { logAudit } from '@/app/lib/audit-logger';

/**
 * POST /api/detections/[id]/feedback
 * Submit user feedback for a detection (true positive, false positive, etc.)
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

    const { id: detectionId } = params;
    const body = await request.json();

    // Validate input
    const validationResult = detectionFeedbackSchema.safeParse({
      detectionId,
      ...body,
    });

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validationResult.error.errors,
        },
        { status: 400 }
      );
    }

    const { feedback, note } = validationResult.data;

    // Check if detection exists
    const detection = await prisma.detection.findUnique({
      where: { id: detectionId },
      include: {
        camera: {
          include: {
            worksite: {
              select: {
                id: true,
                name: true,
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!detection) {
      return NextResponse.json(
        { success: false, error: 'Detection not found' },
        { status: 404 }
      );
    }

    // Check if user has access to this detection's worksite
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        worksiteUsers: {
          where: { worksiteId: detection.camera.worksiteId },
        },
        companyUsers: {
          where: { companyId: detection.camera.worksite.companyId },
        },
      },
    });

    const hasAccess =
      user?.role === 'SUPER_ADMIN' ||
      user?.worksiteUsers.length > 0 ||
      user?.companyUsers.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    // Update detection with feedback
    const updatedDetection = await prisma.detection.update({
      where: { id: detectionId },
      data: {
        userFeedback: feedback,
        feedbackBy: session.user.id,
        feedbackAt: new Date(),
        feedbackNote: note || null,
      },
    });

    // Create audit log
    await logAudit({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'Detection' as any,
      entityId: detectionId,
      changes: {
        before: { userFeedback: detection.userFeedback },
        after: { userFeedback: feedback, feedbackNote: note || null },
      },
      metadata: {
        feedback,
        note: note || null,
      },
      request,
    });

    // If false positive, we might want to trigger model retraining data collection
    if (feedback === 'false_positive') {
      // TODO: Queue this detection for model improvement
      // This could trigger a background job to:
      // 1. Add to training dataset with correct label
      // 2. Update model confidence thresholds
      // 3. Notify ML team for review
      console.log(`[feedback] False positive marked for detection ${detectionId} - queuing for model improvement`);
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDetection.id,
        feedback: updatedDetection.userFeedback,
        feedbackAt: updatedDetection.feedbackAt,
        message: 'Feedback submitted successfully',
      },
    });
  } catch (error: any) {
    console.error('[api][detections][feedback] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit feedback',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/detections/[id]/feedback
 * Get feedback for a detection
 */
export async function GET(
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

    const { id: detectionId } = params;

    const detection = await prisma.detection.findUnique({
      where: { id: detectionId },
      select: {
        id: true,
        userFeedback: true,
        feedbackBy: true,
        feedbackAt: true,
        feedbackNote: true,
        camera: {
          select: {
            worksiteId: true,
            worksite: {
              select: {
                companyId: true,
              },
            },
          },
        },
      },
    });

    if (!detection) {
      return NextResponse.json(
        { success: false, error: 'Detection not found' },
        { status: 404 }
      );
    }

    // Check access
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        worksiteUsers: {
          where: { worksiteId: detection.camera.worksiteId },
        },
        companyUsers: {
          where: { companyId: detection.camera.worksite.companyId },
        },
      },
    });

    const hasAccess =
      user?.role === 'SUPER_ADMIN' ||
      user?.worksiteUsers.length > 0 ||
      user?.companyUsers.length > 0;

    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Access denied' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        feedback: detection.userFeedback,
        feedbackBy: detection.feedbackBy,
        feedbackAt: detection.feedbackAt,
        feedbackNote: detection.feedbackNote,
      },
    });
  } catch (error: any) {
    console.error('[api][detections][feedback] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedback',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


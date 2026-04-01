import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { detectionFeedbackSchema } from '@/lib/validation/detection';
import { logAudit } from '@/lib/audit-logger';

/**
 * POST /api/detections/[id]/feedback
 * Submit user feedback for a detection (true positive, false positive, etc.)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[API] POST /api/detections/[id]/feedback - Request received');
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log('[API] ❌ Unauthorized - No session');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: detectionId } = await params;
    console.log('[API] Detection ID:', detectionId);
    const body = await request.json();
    console.log('[API] Request body:', body);

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

    console.log('[API] Looking up detection:', detectionId);
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
      console.log('[API] ❌ Detection not found:', detectionId);
      return NextResponse.json(
        { success: false, error: 'Detection not found' },
        { status: 404 }
      );
    }

    console.log('[API] ✅ Detection found:', {
      id: detection.id,
      cameraId: detection.cameraId,
      worksiteId: detection.camera?.worksiteId,
    });

    // Check if user has access to this detection's worksite
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        worksiteAccess: {
          where: { worksiteId: detection.camera.worksiteId },
        },
        companyAccess: {
          where: { companyId: detection.camera.worksite.companyId },
        },
      },
    });

    const hasAccess =
      user?.role === 'SUPER_ADMIN' ||
      (user?.worksiteAccess && user.worksiteAccess.length > 0) ||
      (user?.companyAccess && user.companyAccess.length > 0);

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

    // Create training report based on feedback type
    if (feedback === 'false_positive' || feedback === 'true_positive') {
      try {
        console.log(`[feedback] Creating ${feedback} report for detection ${detectionId}`);
        
        // Find related alert if exists (Note: Alert model doesn't have detectionId field)
        // We could search by metadata if detectionId is stored there, but for now we'll skip
        const relatedAlert = null; // TODO: Implement proper Alert-Detection relationship lookup

        console.log(`[feedback] Related alert lookup skipped (no detectionId field in Alert model)`);

        // Get video/image URLs from detection metadata or alert metadata
        const detectionMetadata = detection.metadata as any;
        const alertMetadata = null; // relatedAlert is disabled - Alert model doesn't have detectionId field
        const videoUrl = detectionMetadata?.videoUrl || null;
        const imageUrl = detectionMetadata?.snapshotUrl || detectionMetadata?.imageUrl || null;

        console.log(`[feedback] Media URLs - Video: ${videoUrl ? 'yes' : 'no'}, Image: ${imageUrl ? 'yes' : 'no'}`);

        // Determine incident type from detection
        const detectedObjects = detectionMetadata?.detectedObjects || [];
        const objectClasses = detectedObjects.map((obj: any) => obj.class).join(', ');
        const incidentType = objectClasses || detectionMetadata?.type || 'unknown';

        console.log(`[feedback] Incident type: ${incidentType}`);

        const reportData = {
          alertId: null, // relatedAlert lookup disabled - Alert model doesn't have detectionId field
          detectionId: detectionId,
          worksiteId: detection.camera.worksiteId,
          cameraId: detection.cameraId,
          reportedBy: session.user.id,
          description: note || `${feedback === 'false_positive' ? 'False' : 'True'} positive detection: ${objectClasses || 'unknown objects'}`,
          incidentType: incidentType,
          videoUrl: videoUrl,
          imageUrl: imageUrl,
          timestamp: detection.timestamp || detection.createdAt,
          reviewed: false,
        };

        console.log('[feedback] Report data to create:', JSON.stringify(reportData, null, 2));

        if (feedback === 'false_positive') {
          try {
            const report = await prisma.falsePositiveReport.create({
              data: reportData,
            });
            console.log(`[feedback] ✅ False positive report created successfully:`, report.id);
            console.log(`[feedback] Report details:`, JSON.stringify(report, null, 2));
          } catch (createError: any) {
            console.error('[feedback] ❌ Error creating false positive report:', createError);
            console.error('[feedback] Error details:', createError.message, createError.code);
            throw createError; // Re-throw to be caught by outer try-catch
          }
        } else if (feedback === 'true_positive') {
          try {
            const report = await prisma.truePositiveReport.create({
              data: reportData,
            });
            console.log(`[feedback] ✅ True positive report created successfully:`, report.id);
            console.log(`[feedback] Report details:`, JSON.stringify(report, null, 2));
          } catch (createError: any) {
            console.error('[feedback] ❌ Error creating true positive report:', createError);
            console.error('[feedback] Error details:', createError.message, createError.code);
            throw createError; // Re-throw to be caught by outer try-catch
          }
        }
      } catch (error: any) {
        // Log error but don't fail the feedback submission
        console.error(`[feedback] ❌ Failed to create ${feedback} report:`, error);
        if (error instanceof Error) {
          console.error('[feedback] Error message:', error.message);
          console.error('[feedback] Error stack:', error.stack);
        }
        // Still return success for feedback, but log the error
        // The feedback was recorded, just the report creation failed
      }
    }

    console.log('[API] ✅ Feedback submitted successfully');
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
    console.error('[API] ❌ [api][detections][feedback] Error:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: detectionId } = await params;

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
        worksiteAccess: {
          where: { worksiteId: detection.camera.worksiteId },
        },
        companyAccess: {
          where: { companyId: detection.camera.worksite.companyId },
        },
      },
    });

    const hasAccess =
      user?.role === 'SUPER_ADMIN' ||
      (user?.worksiteAccess && user.worksiteAccess.length > 0) ||
      (user?.companyAccess && user.companyAccess.length > 0);

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


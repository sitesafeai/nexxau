import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// PATCH /api/false-positives/[id] - Update false positive report
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log('[API] PATCH /api/false-positives/[id] - Request received');
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      console.log('[API] ❌ Unauthorized');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    console.log('[API] Update body:', body);
    const { reviewed, trainingNotes, overrideToConfirmed, overrideExplanation } = body;

    const report = await prisma.falsePositiveReport.findUnique({
      where: { id: params.id },
      include: {
        alert: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: 'False positive report not found' },
        { status: 404 }
      );
    }

    const updateData: any = {};
    if (reviewed !== undefined) {
      updateData.reviewed = reviewed;
      if (reviewed) {
        updateData.reviewedBy = session.user.id;
        updateData.reviewedAt = new Date();
      }
    }
    if (trainingNotes !== undefined) {
      updateData.trainingNotes = trainingNotes;
    }

    // If overriding to confirmed, update the alert
    if (overrideToConfirmed && report.alertId) {
      console.log('[API] Overriding false positive to confirmed for alert:', report.alertId);
      await prisma.alert.update({
        where: { id: report.alertId },
        data: {
          status: 'RESOLVED',
          resolutionType: 'OVERRIDDEN_CONFIRMED_BY_TEAM',
          resolutionNotes: overrideExplanation || 'False positive overridden and confirmed by team',
          resolvedBy: session.user.id,
          resolvedAt: new Date(),
          metadata: {
            ...(report.alert?.metadata as any || {}),
            overrideInfo: {
              overriddenBy: session.user.id,
              overriddenAt: new Date().toISOString(),
              originalStatus: 'FALSE_POSITIVE',
              explanation: overrideExplanation || null,
            },
          } as any,
        },
      });
      console.log('[API] ✅ Alert overridden to confirmed');
    }

    const updatedReport = await prisma.falsePositiveReport.update({
      where: { id: params.id },
      data: updateData,
      include: {
        worksite: {
          select: {
            id: true,
            name: true,
          },
        },
        camera: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log('[API] ✅ False positive report updated');
    return NextResponse.json({
      success: true,
      data: updatedReport,
    });
  } catch (error) {
    console.error('[API] ❌ Error updating false positive report:', error);
    if (error instanceof Error) {
      console.error('[API] Error message:', error.message);
      console.error('[API] Error stack:', error.stack);
    }
    return NextResponse.json(
      { error: 'Failed to update false positive report', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

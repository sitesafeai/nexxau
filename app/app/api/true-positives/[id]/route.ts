import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

// PATCH /api/true-positives/[id] - Update true positive report
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reviewed, trainingNotes } = body;

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

    const report = await prisma.truePositiveReport.update({
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

    return NextResponse.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error updating true positive report:', error);
    return NextResponse.json(
      { error: 'Failed to update true positive report' },
      { status: 500 }
    );
  }
}

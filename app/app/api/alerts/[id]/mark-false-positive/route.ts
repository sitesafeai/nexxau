import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { falsePositiveHandler } from '@/app/lib/workflows/false-positive-handler';

/**
 * POST /api/alerts/[id]/mark-false-positive
 * Mark alert as false positive and provide feedback
 */
export async function POST(
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
    const { reason, zone, violationType } = body;

    // Get the alert first
    const alert = await prisma.alert.findUnique({
      where: { id }
    });

    if (!alert) {
      return NextResponse.json(
        { success: false, error: 'Alert not found' },
        { status: 404 }
      );
    }

    // Set overrideStatus on the alert
    await prisma.alert.update({
      where: { id },
      data: {
        overrideStatus: 'false_positive',
        overrideBy: session.user.id,
        overrideAt: new Date(),
        overrideReason: reason || null,
      }
    });

    // Create false positive report via handler
    await falsePositiveHandler.handleFalsePositive(id, session.user.id, {
      isFalsePositive: true,
      reason,
      zone,
      violationType
    });

    return NextResponse.json({
      success: true,
      message: 'Alert marked as false positive'
    });
  } catch (error: any) {
    console.error('[Mark False Positive] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to mark as false positive', details: error.message },
      { status: 500 }
    );
  }
}


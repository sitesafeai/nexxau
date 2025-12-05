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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason, zone, violationType } = body;

    await falsePositiveHandler.handleFalsePositive(params.id, session.user.id, {
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


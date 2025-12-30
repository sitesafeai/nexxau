import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';
import { recoveryManager } from '../../../../lib/error-recovery';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get error details
    const error = await prisma.errorLog.findUnique({
      where: { id }
    });

    if (!error) {
      return NextResponse.json({ error: 'Error not found' }, { status: 404 });
    }

    // Trigger recovery workflow
    const recoveryId = await recoveryManager.triggerRecovery(
      error.id,
      error.message,
      error.severity,
      error.category,
      error.metadata as Record<string, any> | undefined
    );

    return NextResponse.json({
      success: true,
      data: {
        recoveryId,
        message: 'Recovery workflow triggered successfully'
      }
    });

  } catch (error) {
    console.error('Failed to trigger recovery:', error);
    return NextResponse.json({ error: 'Failed to trigger recovery' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { prisma } from '../../../../lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { resolutionNotes } = body;

    const updatedViolation = await prisma.safetyViolation.update({
      where: { id: params.id },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolvedBy: session.user.id,
        metadata: {
          resolutionNotes,
          resolvedBy: session.user.name || session.user.email
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: updatedViolation,
      message: 'Safety violation resolved successfully'
    });

  } catch (error) {
    console.error('Failed to resolve safety violation:', error);
    return NextResponse.json({ error: 'Failed to resolve safety violation' }, { status: 500 });
  }
}

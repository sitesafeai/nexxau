import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

/**
 * DELETE /api/worksites/:id/users/:userId
 * Remove a user from a worksite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  try {
    const { id: worksiteId, userId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if assignment exists
    const existing = await prisma.worksiteUser.findUnique({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      }
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'User not assigned to this worksite' },
        { status: 404 }
      );
    }

    // Delete assignment
    await prisma.worksiteUser.delete({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'User removed from worksite successfully'
    });
  } catch (error: any) {
    console.error('Error removing user from worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to remove user', details: error.message },
      { status: 500 }
    );
  }
}


import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

/**
 * GET /api/worksites/:id/users
 * Get all users assigned to a worksite
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksiteId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch users through worksiteUsers relationship
    const worksiteUsers = await prisma.worksiteUser.findMany({
      where: {
        worksiteId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            lastLogin: true,
            createdAt: true
          }
        }
      }
    });

    // Extract user data
    const users = worksiteUsers.map(wu => wu.user);

    return NextResponse.json({
      success: true,
      data: users
    });
  } catch (error: any) {
    console.error('Error fetching worksite users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worksites/:id/users
 * Add a user to a worksite
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksiteId } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if assignment already exists
    const existing = await prisma.worksiteUser.findUnique({
      where: {
        userId_worksiteId: {
          userId,
          worksiteId
        }
      }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'User already assigned to this worksite' },
        { status: 400 }
      );
    }

    // Create assignment
    const assignment = await prisma.worksiteUser.create({
      data: {
        userId,
        worksiteId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: assignment
    });
  } catch (error: any) {
    console.error('Error adding user to worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add user', details: error.message },
      { status: 500 }
    );
  }
}


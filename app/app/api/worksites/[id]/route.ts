import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/worksites/:id
 * Get single worksite with details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const worksite = await prisma.worksite.findUnique({
      where: { id: params.id },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyUsername: true
          }
        },
        cameras: true,
        workers: true,
        alerts: {
          where: {
            status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
          }
        },
        _count: {
          select: {
            cameras: true,
            alerts: true,
            workers: true
          }
        }
      }
    });

    if (!worksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error fetching worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch worksite', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/worksites/:id
 * Update a worksite
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const worksite = await prisma.worksite.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error updating worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update worksite', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/worksites/:id
 * Delete a worksite
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.worksite.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Worksite deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete worksite', details: error.message },
      { status: 500 }
    );
  }
}

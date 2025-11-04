import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/cameras/[id]
 * Get a single camera
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: params.id },
      include: {
        worksite: {
          select: {
            id: true,
            name: true
          }
        },
        health: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!camera) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: camera
    });
  } catch (error) {
    console.error('Error fetching camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch camera' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cameras/[id]
 * Update camera settings
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();

    const camera = await prisma.camera.update({
      where: { id: params.id },
      data: body
    });

    return NextResponse.json({
      success: true,
      data: camera
    });
  } catch (error) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update camera' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cameras/[id]
 * Delete a camera
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.camera.delete({
      where: { id: params.id }
    });

    return NextResponse.json({
      success: true,
      message: 'Camera deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting camera:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete camera' },
      { status: 500 }
    );
  }
}

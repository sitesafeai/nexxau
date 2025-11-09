import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * PATCH /api/training/snapshots/[id]
 * Update training image metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { category, labeled, annotations, metadata } = body;

    const updateData: any = {};

    if (category !== undefined) updateData.category = category;
    if (labeled !== undefined) updateData.labeled = labeled;
    if (annotations !== undefined) updateData.annotations = annotations;
    if (metadata !== undefined) updateData.metadata = metadata;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No update fields provided' },
        { status: 400 }
      );
    }

    const updated = await prisma.trainingImage.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Error updating training image:', error);
    return NextResponse.json(
      { error: 'Failed to update training image', details: error.message },
      { status: 500 }
    );
  }
}



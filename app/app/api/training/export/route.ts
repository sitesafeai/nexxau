import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/training/export
 * Export training images in JSON format (YOLO-friendly)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const labeled = searchParams.get('labeled');
    const category = searchParams.get('category');

    const where: any = {};
    if (worksiteId) where.worksiteId = worksiteId;
    if (labeled !== null) where.labeled = labeled === 'true';
    if (category) where.category = category;

    const images = await prisma.trainingImage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const dataset = images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      category: image.category,
      labeled: image.labeled,
      annotations: image.annotations || [],
      metadata: image.metadata || {},
    }));

    return NextResponse.json({
      success: true,
      count: dataset.length,
      format: 'json',
      data: dataset,
      instructions: {
        labelTool: 'Import JSON into Roboflow or preferred labeling tool',
        notes:
          'Annotations array is currently empty by default. Fill with bounding boxes formatted per your labeling tool.',
      },
    });
  } catch (error: any) {
    console.error('Error exporting training images:', error);
    return NextResponse.json(
      { error: 'Failed to export training data', details: error.message },
      { status: 500 }
    );
  }
}



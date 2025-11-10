import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { uploadTrainingImage, captureCameraSnapshot } from '@/app/lib/cloud-storage';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * POST /api/training/snapshots
 * Save a camera snapshot for AI training
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = normalizeRole(session?.user?.role);
    if (!session || role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { cameraId, imageData, category, bbox } = body;

    if (!cameraId) {
      return NextResponse.json(
        { error: 'cameraId is required' },
        { status: 400 }
      );
    }

    // Get camera
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      include: { worksite: true }
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    // Convert image data to buffer
    let imageBuffer: Buffer;
    if (imageData) {
      // Base64 image provided
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      // Capture from camera
      imageBuffer = await captureCameraSnapshot(cameraId);
    }

    // Upload to cloud storage
    const imageUrl = await uploadTrainingImage(
      imageBuffer,
      cameraId,
      category
    );

    // Save to database
    const trainingImage = await prisma.trainingImage.create({
      data: {
        imageUrl,
        cameraId,
        worksiteId: camera.worksiteId,
        category: category || 'unlabeled',
        labeled: false,
        annotations: bbox ? { bbox } : null,
        metadata: {
          capturedAt: new Date().toISOString(),
          source: 'manual_capture',
          cameraName: camera.name
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: trainingImage,
      message: 'Training image saved successfully'
    });

  } catch (error: any) {
    console.error('Error saving training snapshot:', error);
    return NextResponse.json(
      { error: 'Failed to save training snapshot', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/training/snapshots
 * Get training images (optionally filtered)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const role = normalizeRole(session?.user?.role);
    if (!session || role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const cameraId = searchParams.get('cameraId');
    const worksiteId = searchParams.get('worksiteId');
    const labeled = searchParams.get('labeled');
    const category = searchParams.get('category');

    const where: any = {};
    if (cameraId) where.cameraId = cameraId;
    if (worksiteId) where.worksiteId = worksiteId;
    if (labeled !== null) where.labeled = labeled === 'true';
    if (category) where.category = category;

    const images = await prisma.trainingImage.findMany({
      where,
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            location: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100
    });

    return NextResponse.json({
      success: true,
      data: images,
      count: images.length
    });

  } catch (error: any) {
    console.error('Error fetching training images:', error);
    return NextResponse.json(
      { error: 'Failed to fetch training images', details: error.message },
      { status: 500 }
    );
  }
}


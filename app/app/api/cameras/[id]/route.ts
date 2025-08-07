import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/cameras/[id] - Get a specific camera
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: params.id },
      include: {
        worksite: true,
      },
    });

    if (!camera) {
      return NextResponse.json(
        { error: 'Camera not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(camera);
  } catch (error) {
    console.error('Error fetching camera:', error);
    return NextResponse.json(
      { error: 'Failed to fetch camera' },
      { status: 500 }
    );
  }
}

// PUT /api/cameras/[id] - Update a camera
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    const camera = await prisma.camera.update({
      where: { id: params.id },
      data: {
        name: body.name,
        type: body.type,
        status: body.status,
        streamUrl: body.streamUrl,
        location: body.location,
        ipAddress: body.ipAddress,
        port: body.port ? parseInt(body.port) : null,
        username: body.username,
        password: body.password,
        rtspPath: body.rtspPath,
        hlsUrl: body.hlsUrl,
        mediamtxPath: body.mediamtxPath,
        worksiteId: body.worksiteId,
      },
      include: {
        worksite: true,
      },
    });

    return NextResponse.json(camera);
  } catch (error) {
    console.error('Error updating camera:', error);
    return NextResponse.json(
      { error: 'Failed to update camera' },
      { status: 500 }
    );
  }
}

// DELETE /api/cameras/[id] - Delete a camera
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.camera.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Camera deleted successfully' });
  } catch (error) {
    console.error('Error deleting camera:', error);
    return NextResponse.json(
      { error: 'Failed to delete camera' },
      { status: 500 }
    );
  }
} 
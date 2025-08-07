import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/cameras - Get all cameras
export async function GET() {
  try {
    const cameras = await prisma.camera.findMany({
      include: {
        worksite: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(cameras);
  } catch (error) {
    console.error('Error fetching cameras:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cameras' },
      { status: 500 }
    );
  }
}

// POST /api/cameras - Create a new camera
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Creating camera with data:', body);
    
    // Check if worksite exists, if not create a demo one
    let worksiteId = body.worksiteId;
    if (!worksiteId) {
      // Create a default client first
      const defaultClient = await prisma.client.create({
        data: {
          name: 'Default Client',
          email: 'default@client.com',
          address: 'Default Address',
        },
      });
      
      // Create a default worksite
      const defaultWorksite = await prisma.worksite.create({
        data: {
          name: 'Default Worksite',
          address: 'Default Address',
          clientId: defaultClient.id,
          cameraSystemType: 'IP',
        },
      });
      worksiteId = defaultWorksite.id;
    } else {
      // Verify worksite exists
      const worksite = await prisma.worksite.findUnique({
        where: { id: worksiteId },
      });
      
      if (!worksite) {
        console.log('Worksite not found, creating default worksite');
        // Create a default client first
        const defaultClient = await prisma.client.create({
          data: {
            name: 'Default Client',
            email: 'default@client.com',
            address: 'Default Address',
          },
        });
        
        const defaultWorksite = await prisma.worksite.create({
          data: {
            name: 'Default Worksite',
            address: 'Default Address',
            clientId: defaultClient.id,
            cameraSystemType: 'IP',
          },
        });
        worksiteId = defaultWorksite.id;
      }
    }
    
    const camera = await prisma.camera.create({
      data: {
        name: body.name,
        type: body.type || 'IP Camera',
        status: body.status || 'active',
        streamUrl: body.streamUrl,
        location: body.location,
        ipAddress: body.ipAddress,
        port: body.port ? parseInt(body.port) : null,
        username: body.username,
        password: body.password,
        rtspPath: body.rtspPath,
        hlsUrl: body.hlsUrl,
        mediamtxPath: body.mediamtxPath,
        worksiteId: worksiteId,
      },
      include: {
        worksite: true,
      },
    });

    console.log('Camera created successfully:', camera);
    return NextResponse.json(camera, { status: 201 });
  } catch (error) {
    console.error('Error creating camera:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create camera', details: errorMessage },
      { status: 500 }
    );
  }
} 
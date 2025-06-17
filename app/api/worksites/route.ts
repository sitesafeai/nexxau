import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const { clientId, name, address, cameraSystemType, config } = body;

    if (!clientId || !name || !address || !cameraSystemType) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Verify client exists and user has access
    const client = await prisma.client.findUnique({
      where: { id: clientId },
    });

    if (!client) {
      return new NextResponse('Client not found', { status: 404 });
    }

    // Create worksite with camera configuration
    const worksite = await prisma.worksite.create({
      data: {
        name,
        address,
        clientId,
        cameraSystemType,
        cameraSystemConfig: {
          create: {
            config: config,
          },
        },
      },
      include: {
        cameraSystemConfig: true,
      },
    });

    return NextResponse.json(worksite);
  } catch (error) {
    console.error('Error creating worksite:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
} 
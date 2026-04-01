import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, role, worksiteId } = await request.json();

    // Validate required fields
    if (!name || !email || !worksiteId) {
      return NextResponse.json(
        { error: 'Name, email, and worksite are required' },
        { status: 400 }
      );
    }

    // Verify worksite exists
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId }
    });

    if (!worksite) {
      return NextResponse.json(
        { error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // Check if worker already exists in this worksite
    const existingWorker = await prisma.worker.findFirst({
      where: {
        worksiteId,
        email
      }
    });

    if (existingWorker) {
      return NextResponse.json(
        { error: 'Worker with this email already exists in this worksite' },
        { status: 400 }
      );
    }

    const worker = await prisma.worker.create({
      data: {
        name,
        email,
        role: role || 'worker',
        worksiteId,
        isClaimed: false
      },
      include: {
        worksite: {
          include: {
            company: true
          }
        }
      }
    });

    return NextResponse.json(worker, { status: 201 });
  } catch (error) {
    console.error('Error creating worker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, worksiteName, address, cameraSystemType, companyId } = await request.json();

    // Validate required fields
    if (!name || !worksiteName || !address || !companyId) {
      return NextResponse.json(
        { error: 'Name, worksite name, address, and company are required' },
        { status: 400 }
      );
    }

    // Check if worksite name already exists
    const existingWorksite = await prisma.worksite.findUnique({
      where: { worksiteName }
    });

    if (existingWorksite) {
      return NextResponse.json(
        { error: 'Worksite name already exists' },
        { status: 400 }
      );
    }

    // Verify company exists
    const company = await prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    const worksite = await prisma.worksite.create({
      data: {
        name,
        worksiteName,
        address,
        cameraSystemType,
        companyId
      },
      include: {
        company: true,
        workers: true
      }
    });

    return NextResponse.json(worksite, { status: 201 });
  } catch (error) {
    console.error('Error creating worksite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 
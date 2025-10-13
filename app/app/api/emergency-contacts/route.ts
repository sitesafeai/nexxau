import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma } from '../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const role = searchParams.get('role');

    const where: any = { isActive: true };
    
    if (worksiteId) {
      where.worksiteId = worksiteId;
    }
    
    if (role) {
      where.role = role;
    }

    const contacts = await prisma.emergencyContact.findMany({
      where,
      include: {
        worksite: {
          select: {
            name: true,
            worksiteName: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' },
        { name: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: contacts
    });

  } catch (error) {
    console.error('Failed to fetch emergency contacts:', error);
    return NextResponse.json({ error: 'Failed to fetch emergency contacts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      phoneNumber,
      email,
      role,
      worksiteId,
      priority
    } = body;

    // Validate required fields
    if (!name || !phoneNumber || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, phoneNumber, role' 
      }, { status: 400 });
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    if (!phoneRegex.test(phoneNumber)) {
      return NextResponse.json({ 
        error: 'Invalid phone number format' 
      }, { status: 400 });
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        name,
        phoneNumber,
        email,
        role,
        worksiteId,
        priority: priority || 1,
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      data: contact,
      message: 'Emergency contact created successfully'
    });

  } catch (error) {
    console.error('Failed to create emergency contact:', error);
    return NextResponse.json({ error: 'Failed to create emergency contact' }, { status: 500 });
  }
}

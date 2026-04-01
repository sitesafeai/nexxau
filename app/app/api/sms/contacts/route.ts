import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId') || undefined;

    const where: any = {};
    if (worksiteId) {
      where.worksiteId = worksiteId;
    }

    const contacts = await prisma.emergencyContact.findMany({
      where,
      include: {
        worksite: {
          select: {
            name: true,
            worksiteName: true,
          },
        },
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: contacts,
      count: contacts.length,
    });
  } catch (error: any) {
    console.error('[SMS Contacts API] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch emergency contacts',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, phoneNumber, email, role, worksiteId, priority } = body;

    if (!name || !phoneNumber || !role) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: name, phoneNumber, role',
        },
        { status: 400 }
      );
    }

    const contact = await prisma.emergencyContact.create({
      data: {
        name,
        phoneNumber,
        email: email || null,
        role,
        worksiteId: worksiteId || null,
        priority: priority ?? 1,
      },
      include: {
        worksite: {
          select: {
            name: true,
            worksiteName: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: contact,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[SMS Contacts API] POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create emergency contact',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


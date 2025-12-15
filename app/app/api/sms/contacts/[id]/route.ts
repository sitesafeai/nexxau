import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

interface RouteParams {
  params: { id: string };
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    await prisma.emergencyContact.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[SMS Contacts API] DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to delete emergency contact',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}


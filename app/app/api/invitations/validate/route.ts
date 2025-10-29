import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/invitations/validate?token=xxx
 * Validate an invitation token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        },
        worksite: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if already activated
    if (user.isActivated) {
      return NextResponse.json(
        { success: false, error: 'This invitation has already been used' },
        { status: 409 }
      );
    }

    // Check if expired
    if (user.inviteExpires && new Date(user.inviteExpires) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'This invitation has expired' },
        { status: 410 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        role: user.role,
        companyName: user.company?.name,
        worksiteName: user.worksite?.name,
        expiresAt: user.inviteExpires
      }
    });

  } catch (error: any) {
    console.error('Error validating invitation:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to validate invitation', details: error.message },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


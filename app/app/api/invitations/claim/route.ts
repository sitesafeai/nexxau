import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/**
 * POST /api/invitations/claim
 * Claim an invitation and activate account
 * 
 * Body: {
 *   token: string;
 *   name: string;
 *   password: string;
 *   phone?: string;
 *   timezone?: string;
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, name, password, phone, timezone } = body;

    if (!token || !name || !password) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find user by invite token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token }
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

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user with account details
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name,
        password: hashedPassword,
        phoneNumber: phone,
        timezone: timezone || 'America/New_York',
        isActivated: true,
        onboardingComplete: true,
        emailVerified: new Date(),
        inviteToken: null, // Clear token after use
        inviteExpires: null
      }
    });

    console.log('✅ Account claimed successfully:', updatedUser.email);

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      data: {
        userId: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role
      }
    });

  } catch (error: any) {
    console.error('Error claiming invitation:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create account', 
        details: error.message 
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}


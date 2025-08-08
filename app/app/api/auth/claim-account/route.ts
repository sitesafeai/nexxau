import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const { companyUsername, worksiteName, email, password } = await request.json();

    // Validate required fields
    if (!companyUsername || !worksiteName || !email || !password) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Find the company by username
    const company = await prisma.company.findUnique({
      where: { companyUsername },
      include: {
        worksites: true
      }
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Find the worksite by name within the company
    const worksite = company.worksites.find((w: any) => w.worksiteName === worksiteName);

    if (!worksite) {
      return NextResponse.json(
        { error: 'Worksite not found for this company' },
        { status: 404 }
      );
    }

    // Find the worker by email in this worksite
    const worker = await prisma.worker.findFirst({
      where: {
        worksiteId: worksite.id,
        email: email
      }
    });

    if (!worker) {
      return NextResponse.json(
        { error: 'Worker not found for this worksite' },
        { status: 404 }
      );
    }

    // Check if worker has already claimed their account
    if (worker.isClaimed) {
      return NextResponse.json(
        { error: 'Account has already been claimed' },
        { status: 400 }
      );
    }

    // Check if email is already used by another user
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Email is already registered' },
        { status: 400 }
      );
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create the user account
    const user = await prisma.user.create({
      data: {
        email: email,
        name: worker.name,
        password: hashedPassword,
        role: worker.role,
        companyId: company.id,
        worksiteId: worksite.id,
        isActivated: true,
        approved: true
      }
    });

    // Mark the worker as claimed
    await prisma.worker.update({
      where: { id: worker.id },
      data: { isClaimed: true }
    });

    return NextResponse.json(
      { 
        message: 'Account claimed successfully',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      },
      { status: 201 }
    );

  } catch (error) {
    console.error('Account claiming error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
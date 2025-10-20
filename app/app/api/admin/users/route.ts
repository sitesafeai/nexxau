import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActivated: true,
        approved: true,
        lastLogin: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format users for admin panel
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name || 'Unknown',
      email: user.email || 'No email',
      role: user.role,
      status: user.isActivated && user.approved ? 'active' : !user.approved ? 'suspended' : 'inactive',
      lastLogin: user.lastLogin?.toISOString() || 'Never',
      createdAt: user.createdAt.toISOString()
    }));

    return NextResponse.json(formattedUsers);

  } catch (error) {
    console.error('Failed to fetch users:', error);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, password, role, status = 'active' } = body;

    // Validate required fields
    if (!name || !email || !role) {
      return NextResponse.json({ 
        error: 'Missing required fields: name, email, role' 
      }, { status: 400 });
    }

    // Validate role
    if (!['admin', 'manager', 'operator', 'viewer'].includes(role)) {
      return NextResponse.json({ 
        error: 'Invalid role. Must be admin, manager, operator, or viewer' 
      }, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return NextResponse.json({ 
        error: 'User with this email already exists' 
      }, { status: 409 });
    }

    // Hash password if provided
    let hashedPassword = null;
    if (password) {
      const bcrypt = require('bcryptjs');
      hashedPassword = await bcrypt.hash(password, 10);
    }

    // Create new user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
        isActivated: status === 'active',
        approved: true,
        createdAt: new Date()
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActivated: true,
        lastLogin: true,
        createdAt: true
      }
    });

    // Format response
    const formattedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.isActivated ? 'active' : 'inactive',
      lastLogin: user.lastLogin?.toISOString() || null,
      createdAt: user.createdAt.toISOString()
    };

    return NextResponse.json(formattedUser, { status: 201 });

  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(_request: NextRequest) {
  try {
    // Safety: block in production
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    const password = 'worker123';
    const hash = await bcrypt.hash(password, 12);

    const workerUser = await prisma.user.upsert({
      where: { email: 'worker@nexxau.com' },
      update: {},
      create: {
        email: 'worker@nexxau.com',
        name: 'Test Worker',
        role: 'WORKER' as any,
        password: hash,
        approved: true,
        isActivated: true,
      },
    });

    return NextResponse.json({
      ok: true,
      message: 'Created test worker login',
      login: { email: workerUser.email, password },
    });
  } catch (error) {
    console.error('Error creating test worker:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


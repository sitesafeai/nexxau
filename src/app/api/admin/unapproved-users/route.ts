import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  const users = await prisma.user.findMany({
    where: { approved: false },
    select: { id: true, name: true, email: true, company: true },
  });
  return NextResponse.json({ users });
} 
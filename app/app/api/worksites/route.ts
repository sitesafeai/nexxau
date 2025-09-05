import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/worksites - Get all worksites
export async function GET() {
  try {
    const worksites = await prisma.worksite.findMany({
      include: {
        company: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(worksites);
  } catch (error) {
    console.error('Error fetching worksites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch worksites' },
      { status: 500 }
    );
  }
} 
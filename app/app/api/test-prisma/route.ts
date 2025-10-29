import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

export async function GET() {
  const prisma = new PrismaClient();
  
  try {
    const count = await prisma.worksite.count();
    const worksites = await prisma.worksite.findMany({
      select: {
        id: true,
        name: true
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Prisma works!',
      count,
      worksites
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}


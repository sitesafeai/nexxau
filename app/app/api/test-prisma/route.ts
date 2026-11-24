import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function GET() {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

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


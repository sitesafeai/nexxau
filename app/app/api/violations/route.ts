/**
 * GET /api/violations
 * Filterable violation log for camera fullscreen modal.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const worksiteId = searchParams.get('worksiteId');
  const cameraId = searchParams.get('cameraId');
  const type = searchParams.get('type');
  const search = searchParams.get('search');
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);
  const cursor = searchParams.get('cursor');

  const violations = await prisma.safetyViolation.findMany({
    where: {
      ...(worksiteId ? { worksiteId } : {}),
      ...(cameraId ? { cameraId } : {}),
      ...(type ? { violationType: type } : {}),
      ...(from || to
        ? {
            detectedAt: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
      ...(cursor ? { id: { lt: cursor } } : {}),
      ...(search
        ? {
            camera: {
              name: { contains: search, mode: 'insensitive' as const },
            },
          }
        : {}),
    },
    include: {
      camera: { select: { name: true, zone: true } },
      worksite: { select: { name: true } },
    },
    orderBy: { detectedAt: 'desc' },
    take: limit,
  });

  return NextResponse.json(violations);
}

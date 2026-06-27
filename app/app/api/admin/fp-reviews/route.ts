import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * GET /api/admin/fp-reviews
 *
 * Super-admin only: list the false-positive review queue.
 *
 * Query params:
 *   status  — PENDING | CONFIRMED | DISMISSED  (default: PENDING)
 *   limit   — default 50
 *   offset  — default 0
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = normalizeRole(session.user.role);
    if (role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden — super admins only' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') ?? 'PENDING').toUpperCase();
    const limit  = Math.min(100, parseInt(searchParams.get('limit')  ?? '50',  10));
    const offset = Math.max(0,   parseInt(searchParams.get('offset') ?? '0',   10));

    const [reviews, total] = await Promise.all([
      prisma.falsePositiveReview.findMany({
        where: { status: status as any },
        include: {
          alert: {
            select: {
              id: true,
              title: true,
              description: true,
              severity: true,
              status: true,
              fpReason: true,
              createdAt: true,
              violationType: true,
              detectionSnapshot: true,
              worksite: { select: { id: true, name: true } },
              camera:   { select: { id: true, name: true } },
            },
          },
          markedBy: {
            select: { id: true, name: true, email: true },
          },
          reviewedBy: {
            select: { id: true, name: true, email: true },
          },
          disputes: {
            include: {
              submittedBy: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.falsePositiveReview.count({ where: { status: status as any } }),
    ]);

    return NextResponse.json({ success: true, data: reviews, total, limit, offset });
  } catch (error: any) {
    console.error('[FP Reviews] GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch reviews', details: error.message }, { status: 500 });
  }
}

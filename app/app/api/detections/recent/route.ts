import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { withCache } from '@/app/lib/cache';

export async function GET(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const siteId = request.nextUrl.searchParams.get('siteId');
    if (!siteId) {
      return NextResponse.json({ error: 'siteId is required' }, { status: 400 });
    }

    const worksite = await prisma.worksite.findUnique({
      where: { id: siteId },
      select: { id: true, companyId: true },
    });

    if (!worksite) {
      return NextResponse.json({ error: 'Worksite not found' }, { status: 404 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        worksiteAccess: { where: { worksiteId: siteId } },
        companyAccess: { where: { companyId: worksite.companyId } },
      },
    });

    const hasAccess =
      user?.role === 'SUPER_ADMIN' ||
      (user?.worksiteAccess && user.worksiteAccess.length > 0) ||
      (user?.companyAccess && user.companyAccess.length > 0);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const now = Date.now();
    const detectionWindowStart = new Date(now - 60_000);
    const violationWindowStart = new Date(now - 300_000);

    const cacheKey = `detections:recent:${siteId}`;
    const data = await withCache(cacheKey, 5_000, async () => {
      const [recentDetections, violations, cameras] = await Promise.all([
        prisma.detectionLog.findMany({
          where: {
            worksiteId: siteId,
            timestamp: { gte: detectionWindowStart },
          },
          orderBy: { timestamp: 'desc' },
          take: 50,
          select: {
            id: true,
            cameraId: true,
            type: true,
            confidence: true,
            timestamp: true,
          },
        }),
        prisma.safetyViolation.findMany({
          where: {
            worksiteId: siteId,
            detectedAt: { gte: violationWindowStart },
            resolved: false,
          },
          orderBy: { detectedAt: 'desc' },
          take: 20,
          select: {
            id: true,
            cameraId: true,
            violationType: true,
            severity: true,
            confidence: true,
            detectedAt: true,
          },
        }),
        prisma.camera.findMany({
          where: { worksiteId: siteId },
          select: { id: true, name: true },
        }),
      ]);

      let detections = recentDetections;
      if (detections.length === 0) {
        const personFallbackWindowStart = new Date(now - 10 * 60_000);
        detections = await prisma.detectionLog.findMany({
          where: {
            worksiteId: siteId,
            timestamp: { gte: personFallbackWindowStart },
            type: { contains: 'person', mode: 'insensitive' },
          },
          orderBy: { timestamp: 'desc' },
          take: 20,
          select: {
            id: true,
            cameraId: true,
            type: true,
            confidence: true,
            timestamp: true,
          },
        });
      }

      return { detections, violations, cameras };
    });

    return NextResponse.json({
      detections: data.detections,
      violations: data.violations,
      cameras: data.cameras,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/detections/recent] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch recent detections' }, { status: 500 });
  }
}

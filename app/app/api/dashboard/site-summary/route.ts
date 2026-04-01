import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { enforceWorksiteAccess } from '@/lib/worksite-access';
import { getWorksiteMetricsPayload } from '@/lib/worksite-metrics-payload';

/** Keep aligned with UserDashboard overview alerts slice */
const OVERVIEW_ALERTS_LIMIT = 40;

function formatCamerasForSummary(cameras: any[]) {
  return cameras.map((c: any) => ({
    id: c.id,
    name: c.name || 'Unnamed Camera',
    status: c.status || 'pending',
    location: c.location || null,
    streamUrl: c.streamUrl || null,
    hlsUrl: c.hlsUrl || null,
    mediamtxPath: c.mediamtxPath || null,
    rtspPath: c.rtspPath || null,
    ipAddress: c.ipAddress || null,
    port: c.port || null,
    type: c.type || 'RTSP',
    worksiteId: c.worksiteId,
    aiEnabled: (c.metadata as any)?.aiEnabled ?? false,
    recording: (c.metadata as any)?.recording ?? true,
    recentViolations: (c.metadata as any)?.recentViolations ?? 0,
    lastDetection: (c.metadata as any)?.lastDetection || null,
    uptime24h: (c.metadata as any)?.uptime24h ?? 99,
    thumbnailUrl: (c.metadata as any)?.thumbnailUrl || null,
    zone: c.location || (c.metadata as any)?.zone || null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
  }));
}

/**
 * GET /api/dashboard/site-summary?worksiteId=
 * One round-trip for overview: metrics + recent alerts + cameras (same shapes as separate routes).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId')?.trim();

    if (!worksiteId) {
      return NextResponse.json(
        { success: false, error: 'worksiteId is required' },
        { status: 400 }
      );
    }

    const denied = await enforceWorksiteAccess(request, worksiteId);
    if (denied) return denied;

    const [metrics, alerts, cameras] = await Promise.all([
      getWorksiteMetricsPayload(worksiteId),
      prisma.alert.findMany({
        where: { worksiteId },
        orderBy: { createdAt: 'desc' },
        take: OVERVIEW_ALERTS_LIMIT,
        select: {
          id: true,
          title: true,
          description: true,
          severity: true,
          status: true,
          source: true,
          location: true,
          metadata: true,
          createdAt: true,
          updatedAt: true,
          resolvedAt: true,
          ruleId: true,
          worksiteId: true,
          cameraId: true,
          detectionSnapshot: true,
          rule: {
            select: { name: true, description: true, severity: true },
          },
          worksite: {
            select: { id: true, name: true, worksiteName: true },
          },
          camera: {
            select: { id: true, name: true, location: true },
          },
        },
      }),
      prisma.camera.findMany({
        where: { worksiteId },
        select: {
          id: true,
          name: true,
          status: true,
          location: true,
          streamUrl: true,
          hlsUrl: true,
          mediamtxPath: true,
          rtspPath: true,
          ipAddress: true,
          port: true,
          metadata: true,
          worksiteId: true,
          type: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    if (!metrics) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      metrics,
      alerts,
      cameras: formatCamerasForSummary(cameras),
    });
  } catch (error: any) {
    console.error('[site-summary]', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load site summary',
        details: error?.message,
      },
      { status: 500 }
    );
  }
}

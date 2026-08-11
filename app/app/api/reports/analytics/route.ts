import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { getWorksiteReportAnalyticsData } from '@/app/lib/worksite-report-analytics';

export async function GET(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const daysRaw = searchParams.get('days') || '30';
    const days = Math.min(365, Math.max(1, parseInt(daysRaw, 10) || 30));

    // worksiteId is required for this endpoint
    if (!worksiteId) {
      return NextResponse.json({ success: false, error: 'worksiteId is required' }, { status: 400 });
    }

    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - days);
    dateFrom.setHours(0, 0, 0, 0);

    const data = await getWorksiteReportAnalyticsData(prisma, {
      worksiteWhere: { id: worksiteId },
      singleWorksiteId: worksiteId,
      dateFrom,
      dateTo,
    });

    return NextResponse.json({
      success: true,
      data: {
        violationsByType:        data.violationsByType,
        cameraViolationHotspots: data.cameraViolationHotspots,
        alertsByCamera:          data.alertsByCamera,
        recentAlertsWithCamera:  data.recentAlertsWithCamera,
        periodTotals:            data.periodTotals,
        alertsByType:            data.alertsByType,
        safetyScoreTrend:        data.safetyScoreTrend,
        responseTime:            data.responseTime,
        alertVolumeByDay:        data.alertVolumeByDay,
        alertsByHour:            data.alertsByHour,
        alertsBySeverity:        data.alertsBySeverity,
        resolutionStats:         data.resolutionStats,
        periodComparison:        data.periodComparison,
        peakHour:                data.peakHour,
        worksiteName:            data.worksiteName,
        dateRange:               data.dateRange,
        days,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch analytics data';
    console.error('[Reports Analytics API] Error:', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getWorksiteReportAnalyticsData } from '@/app/lib/worksite-report-analytics';
import type { Prisma } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;
    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');
    const daysRaw = searchParams.get('days') || '30';
    const days = Math.min(365, Math.max(1, parseInt(daysRaw, 10) || 30));

    const userRole = user.role?.toUpperCase() || '';
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN';
    const isCompanyAdmin = userRole === 'COMPANY_ADMIN' || userRole === 'COMPANYADMIN';

    let worksiteWhere: Prisma.WorksiteWhereInput = {};
    if (!isSuperAdmin) {
      if (isCompanyAdmin && user.companyId) {
        worksiteWhere.companyId = user.companyId;
      } else {
        worksiteWhere.worksiteUsers = {
          some: { userId: user.id },
        };
      }
    }

    if (worksiteId) {
      const canAccess = await prisma.worksite.findFirst({
        where: { id: worksiteId, ...worksiteWhere },
        select: { id: true },
      });
      if (!canAccess) {
        return NextResponse.json({ success: false, error: 'Worksite not found or access denied' }, { status: 403 });
      }
      worksiteWhere = { id: worksiteId };
    }

    const dateTo = new Date();
    dateTo.setHours(23, 59, 59, 999);
    const dateFrom = new Date(dateTo);
    dateFrom.setDate(dateFrom.getDate() - days);
    dateFrom.setHours(0, 0, 0, 0);

    const data = await getWorksiteReportAnalyticsData(prisma, {
      worksiteWhere,
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
        // trend additions
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

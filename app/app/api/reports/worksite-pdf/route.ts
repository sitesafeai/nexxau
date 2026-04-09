import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { getWorksiteReportAnalyticsData } from '@/app/lib/worksite-report-analytics';
import { buildWorksiteSummaryPdf } from '@/app/lib/worksite-report-pdf';
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

    if (!worksiteId) {
      return NextResponse.json({ success: false, error: 'worksiteId is required' }, { status: 400 });
    }

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

    const canAccess = await prisma.worksite.findFirst({
      where: { id: worksiteId, ...worksiteWhere },
      select: { id: true, name: true, worksiteName: true },
    });
    if (!canAccess) {
      return NextResponse.json({ success: false, error: 'Worksite not found or access denied' }, { status: 403 });
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

    const title = data.worksiteName || canAccess.name || canAccess.worksiteName || 'Worksite';
    const pdf = await buildWorksiteSummaryPdf(data, title);

    const safeName = title.replace(/[^\w\-]+/g, '_').slice(0, 48);
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="nexxau-worksite-report-${safeName}.pdf"`,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'PDF generation failed';
    console.error('[worksite-pdf]', error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

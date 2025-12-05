import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// GET /api/reports/exports - Get recent report exports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email || '' },
      });
    } catch (dbError) {
      console.error('Database error fetching user:', dbError);
      return NextResponse.json({ success: true, data: [] });
    }

    if (!user) {
      return NextResponse.json({ success: true, data: [] });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    let exports: any[] = [];
    try {
      exports = await prisma.reportExport.findMany({
        where: {
          requestedBy: user.id,
        },
        include: {
          report: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { requestedAt: 'desc' },
        take: limit,
      });
    } catch (dbError) {
      console.error('Database error fetching exports:', dbError);
      return NextResponse.json({ success: true, data: [] });
    }

    // Transform data for frontend
    const data = exports.map(exp => ({
      id: exp.id,
      jobId: exp.jobId,
      reportName: exp.report?.name || 'Unknown',
      format: exp.format,
      status: exp.status,
      fileSize: exp.fileSize,
      fileUrl: exp.status === 'ready' ? `/api/reports/exports/${exp.id}/download` : null,
      requestedAt: exp.requestedAt,
      completedAt: exp.completedAt,
      expiresAt: exp.expiresAt,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error('Error fetching exports:', error);
    // Always return valid JSON, never 500
    return NextResponse.json({
      success: true,
      data: [],
      error: error.message,
    });
  }
}


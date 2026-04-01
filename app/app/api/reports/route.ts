import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

// GET /api/reports - Get all reports (templates and saved)
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
      // Return empty reports if DB fails
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    if (!user) {
      // Return empty array instead of error for missing user
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Fetch reports - user's own reports + system templates
    let reports: any[] = [];
    try {
      reports = await prisma.report.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            { isSystem: true },
          ],
        },
        orderBy: [
          { isSystem: 'desc' },
          { createdAt: 'desc' },
        ],
      });
    } catch (dbError) {
      console.error('Database error fetching reports:', dbError);
      // Return empty array if query fails
    }

    return NextResponse.json({
      success: true,
      data: reports,
    });
  } catch (error: any) {
    console.error('Error fetching reports:', error);
    // Always return valid JSON, never 500
    return NextResponse.json({
      success: true,
      data: [],
      error: error.message,
    });
  }
}

// POST /api/reports - Save a new report spec
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, scope, entities, fields, filters, groupBy, aggregations, layout, schedule } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Report name is required',
      }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        name,
        ownerId: user.id,
        isTemplate: false,
        isSystem: false,
        spec: {
          name,
          scope,
          entities,
          fields,
          filters,
          groupBy,
          aggregations,
          layout,
        },
        schedule: schedule?.frequency || null,
        deliverySettings: schedule ? {
          method: schedule.delivery?.method,
          recipients: schedule.delivery?.recipients,
        } : undefined,
      },
    });

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'REPORT_CREATED',
        entity: 'REPORT',
        entityId: report.id,
        entityName: report.name,
        details: { name, entities, fieldsCount: fields?.length },
        result: 'SUCCESS',
        severity: 'INFO',
      },
    });

    return NextResponse.json({
      success: true,
      data: report,
      message: 'Report saved successfully',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating report:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create report',
      details: error.message,
    }, { status: 500 });
  }
}


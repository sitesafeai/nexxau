import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';

/**
 * GET /api/admin/companies/[id]
 * Get detailed company information including metadata
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;

    const company = await prisma.company.findUnique({
      where: { id },
      include: {
        worksites: {
          include: {
            cameras: {
              select: {
                id: true,
                name: true,
                status: true,
              },
            },
            _count: {
              select: {
                cameras: true,
                alerts: true,
              },
            },
          },
        },
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            lastLogin: true,
          },
        },
        billingRecords: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
        _count: {
          select: {
            worksites: true,
            users: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: company,
    });
  } catch (error: any) {
    console.error('[admin][companies][id] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch company details',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/companies/[id]
 * Update company metadata
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = normalizeRole(session?.user?.role);

  if (!session || role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: any = {};
    
    if (body.billingTier !== undefined) updateData.billingTier = body.billingTier;
    if (body.contractStart !== undefined) updateData.contractStart = body.contractStart ? new Date(body.contractStart) : null;
    if (body.contractEnd !== undefined) updateData.contractEnd = body.contractEnd ? new Date(body.contractEnd) : null;
    if (body.slaLevel !== undefined) updateData.slaLevel = body.slaLevel;
    if (body.insuranceCoverageStatus !== undefined) updateData.insuranceCoverageStatus = body.insuranceCoverageStatus;
    if (body.modelVersion !== undefined) updateData.modelVersion = body.modelVersion;
    if (body.mrr !== undefined) updateData.mrr = body.mrr;
    if (body.churnRisk !== undefined) updateData.churnRisk = body.churnRisk;
    if (body.name !== undefined) updateData.name = body.name;
    if (body.phone !== undefined) updateData.phone = body.phone;
    if (body.address !== undefined) updateData.address = body.address;
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail;
    if (body.pilotStartedAt !== undefined) {
      updateData.pilotStartedAt = body.pilotStartedAt ? new Date(body.pilotStartedAt) : null;
    }
    if (body.pilotEndsAt !== undefined) {
      updateData.pilotEndsAt = body.pilotEndsAt ? new Date(body.pilotEndsAt) : null;
    }

    const company = await prisma.company.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: company,
      message: 'Company updated successfully',
    });
  } catch (error: any) {
    console.error('[admin][companies][id] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update company',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

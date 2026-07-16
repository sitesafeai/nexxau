/**
 * GET /api/company/billing
 * Returns the current company's billing information for COMPANY_ADMIN users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

export async function GET(_request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as any;
  const role = user?.role || '';

  if (!['COMPANY_ADMIN', 'SUPER_ADMIN'].includes(role)) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
  }

  const companyId = user?.companyId;
  if (!companyId) {
    return NextResponse.json({ success: false, error: 'No company on session' }, { status: 400 });
  }

  try {
    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        pilotStartedAt: true,
        pilotEndsAt: true,
        suspended: true,
        createdAt: true,
        billingRecords: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            paidThrough: true,
            proofUrl: true,
            notes: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    const now = new Date();
    const latest = company.billingRecords[0];

    // Determine billing status
    let status: 'pilot' | 'active' | 'expired' | 'unknown' = 'unknown';
    let statusDetail = '';

    if (company.pilotEndsAt) {
      if (now < new Date(company.pilotEndsAt)) {
        status = 'pilot';
        statusDetail = `Pilot ends ${new Date(company.pilotEndsAt).toLocaleDateString()}`;
      } else {
        status = 'expired';
        statusDetail = `Pilot ended ${new Date(company.pilotEndsAt).toLocaleDateString()}`;
      }
    }

    if (latest?.paidThrough) {
      if (now < new Date(latest.paidThrough)) {
        status = 'active';
        statusDetail = `Paid through ${new Date(latest.paidThrough).toLocaleDateString()}`;
      } else if (status !== 'pilot') {
        status = 'expired';
        statusDetail = `Payment expired ${new Date(latest.paidThrough).toLocaleDateString()}`;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        company: {
          id: company.id,
          name: company.name,
          email: company.email,
          phone: company.phone,
          address: company.address,
          createdAt: company.createdAt,
          suspended: company.suspended,
          pilotStartedAt: company.pilotStartedAt,
          pilotEndsAt: company.pilotEndsAt,
        },
        billing: {
          status,
          statusDetail,
          latestRecord: latest ?? null,
          history: company.billingRecords,
        },
      },
    });
  } catch (error: any) {
    console.error('[company/billing] GET failed:', error.message);
    return NextResponse.json({ success: false, error: 'Failed to fetch billing' }, { status: 500 });
  }
}

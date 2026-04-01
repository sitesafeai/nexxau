import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { uploadFile } from '@/lib/cloud-storage';
import { logCreate, logUpdate } from '@/lib/audit-logger';

type DiagnosticsEntry = {
  scope: string;
  message: string;
};

async function safeQuery<T>(
  scope: string,
  fn: () => Promise<T>,
  fallback: T,
  diagnostics: DiagnosticsEntry[]
): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const message =
      error?.message || error?.meta?.cause || error?.code || 'Unknown query error';
    console.warn(`[admin][billing][${scope}]`, message);
    diagnostics.push({ scope, message });
    return fallback;
  }
}

export async function GET() {
  try {
    const diagnostics: DiagnosticsEntry[] = [];
    const companies = await safeQuery(
      'company.findMany',
      () =>
        prisma.company.findMany({
          orderBy: { name: 'asc' },
          include: {
            worksites: {
              select: { id: true, name: true },
              orderBy: { name: 'asc' },
            },
            billingRecords: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        }),
      [],
      diagnostics
    );

    const payload = companies.map((company) => ({
      company: {
        id: company.id,
        name: company.name,
        address: company.address,
      },
      latestRecord: company.billingRecords[0]
        ? {
            id: company.billingRecords[0].id,
            companyId: company.id,
            proofUrl: company.billingRecords[0].proofUrl,
            paidThrough: company.billingRecords[0].paidThrough?.toISOString() ?? null,
            notes: company.billingRecords[0].notes,
            createdAt: company.billingRecords[0].createdAt.toISOString(),
            updatedAt: company.billingRecords[0].updatedAt.toISOString(),
          }
        : null,
      worksites: company.worksites.map((worksite) => ({
        id: worksite.id,
        name: worksite.name,
      })),
    }));

    return NextResponse.json({
      success: true,
      data: payload,
      diagnostics,
    });
  } catch (error: any) {
    console.error('[admin][billing] Failed to load billing data', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch billing data',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const companyId = formData.get('companyId')?.toString();
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId is required' },
        { status: 400 }
      );
    }

    const paidThroughValue = formData.get('paidThrough')?.toString();
    const notes = formData.get('notes')?.toString() || null;
    const file = formData.get('file');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Proof of payment file is required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const uploadResult = await uploadFile(buffer, {
      folder: `billing/${companyId}`,
      fileName: `${Date.now()}-${file.name}`,
      contentType: file.type || 'application/pdf',
    });

    const paidThrough =
      paidThroughValue && paidThroughValue.length > 0
        ? new Date(paidThroughValue)
        : null;

    const record = await prisma.companyBillingRecord.create({
      data: {
        companyId,
        proofUrl: uploadResult.url,
        paidThrough,
        notes,
      },
    });

    // Log audit event
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logCreate(
        session.user.id,
        'BillingRecord',
        record.id,
        {
          companyId,
          proofUrl: uploadResult.url,
          paidThrough: paidThrough?.toISOString() ?? null,
          notes,
        },
        request
      ).catch((err) => {
        console.error('[admin][billing] Failed to log audit:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        companyId,
        proofUrl: record.proofUrl,
        paidThrough: record.paidThrough?.toISOString() ?? null,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[admin][billing] Failed to upload proof', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to upload proof of payment',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body?.recordId) {
      return NextResponse.json(
        { success: false, error: 'recordId is required' },
        { status: 400 }
      );
    }

    // Get existing record for audit log
    const existingRecord = await prisma.companyBillingRecord.findUnique({
      where: { id: body.recordId },
    });

    if (!existingRecord) {
      return NextResponse.json(
        { success: false, error: 'Billing record not found' },
        { status: 404 }
      );
    }

    const paidThrough =
      typeof body?.paidThrough === 'string' && body.paidThrough.length > 0
        ? new Date(body.paidThrough)
        : null;

    const record = await prisma.companyBillingRecord.update({
      where: { id: body.recordId },
      data: {
        paidThrough,
        notes: body?.notes ?? undefined,
      },
    });

    // Log audit event
    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await logUpdate(
        session.user.id,
        'BillingRecord',
        record.id,
        {
          paidThrough: existingRecord.paidThrough?.toISOString() ?? null,
          notes: existingRecord.notes,
        },
        {
          paidThrough: record.paidThrough?.toISOString() ?? null,
          notes: record.notes,
        },
        request
      ).catch((err) => {
        console.error('[admin][billing] Failed to log audit:', err);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: record.id,
        companyId: record.companyId,
        proofUrl: record.proofUrl,
        paidThrough: record.paidThrough?.toISOString() ?? null,
        notes: record.notes,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    });
  } catch (error: any) {
    console.error('[admin][billing] Failed to update record', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update billing record',
        details: error?.message ?? 'Unknown error',
      },
      { status: 500 }
    );
  }
}


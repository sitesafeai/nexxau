import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { createCompanySchema } from '@/app/lib/validation/companies';
import { validateBody } from '@/app/lib/validation/common';

/**
 * GET /api/admin/companies
 * Get all companies with stats
 */
export async function GET(request: NextRequest) {
  try {
    const companies = await prisma.company.findMany({
      include: {
        _count: {
          select: {
            worksites: true,
            users: true
          }
        },
        worksites: {
          include: {
            cameras: {
              select: {
                id: true,
                status: true
              }
            },
            safetyScores: {
              orderBy: {
                date: 'desc'
              },
              take: 1,
              select: {
                safetyScore: true,
                date: true
              }
            },
            alerts: {
              orderBy: {
                createdAt: 'desc'
              },
              take: 1,
              select: {
                createdAt: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const enriched = companies.map(company => {
      const worksiteSummaries = company.worksites.map(worksite => {
        const cameraCount = worksite.cameras.length;
        const onlineCameras = worksite.cameras.filter(camera => {
          const status = (camera.status || 'active').toLowerCase();
          return status === 'online' || status === 'active';
        }).length;
        const latestScore = worksite.safetyScores[0]?.safetyScore ?? null;
        const latestScoreDate = worksite.safetyScores[0]?.date ?? null;
        const latestAlert = worksite.alerts[0]?.createdAt ?? null;
        const lastActivityCandidates = [
          worksite.updatedAt,
          latestAlert,
          latestScoreDate
        ].filter((value): value is Date => Boolean(value));
        const lastActivity = lastActivityCandidates.length > 0
          ? new Date(
              Math.max(
                ...lastActivityCandidates.map(candidate => candidate.getTime())
              )
            )
          : null;

        return {
          id: worksite.id,
          name: worksite.name,
          location: worksite.location,
          status: worksite.status,
          cameraCount,
          onlineCameraCount: onlineCameras,
          latestScore,
          latestScoreDate,
          lastActivity
        };
      });

      const totalCameras = worksiteSummaries.reduce(
        (sum, item) => sum + item.cameraCount,
        0
      );
      const onlineCameras = worksiteSummaries.reduce(
        (sum, item) => sum + item.onlineCameraCount,
        0
      );
      const scores = worksiteSummaries
        .map(item => item.latestScore)
        .filter((score): score is number => typeof score === 'number' && !Number.isNaN(score));

      const averageScore =
        scores.length > 0
          ? scores.reduce((sum, score) => sum + score, 0) / scores.length
          : null;

      const lastActivity = worksiteSummaries.reduce<Date | null>((latest, item) => {
        if (!item.lastActivity) return latest;
        if (!latest || item.lastActivity > latest) {
          return item.lastActivity;
        }
        return latest;
      }, null);

      return {
        id: company.id,
        name: company.name,
        companyName: company.companyUsername, // Map to companyName for frontend
        email: company.email,
        phone: company.phone,
        address: company.address,
        // Metadata fields
        billingTier: company.billingTier || 'standard',
        contractStart: company.contractStart?.toISOString() || null,
        contractEnd: company.contractEnd?.toISOString() || null,
        slaLevel: company.slaLevel || 'standard',
        insuranceCoverageStatus: company.insuranceCoverageStatus || null,
        modelVersion: company.modelVersion || null,
        mrr: company.mrr ? Number(company.mrr) : null,
        churnRisk: company.churnRisk || null,
        worksiteCount: company._count.worksites,
        userCount: company._count.users,
        cameraCount: totalCameras,
        onlineCameraCount: onlineCameras,
        avgSafetyScore: averageScore,
        complianceRate: averageScore !== null ? averageScore / 100 : null,
        lastActivity: lastActivity ? lastActivity.toISOString() : null,
        worksiteSnapshots: worksiteSummaries.slice(0, 4).map(summary => ({
          id: summary.id,
          name: summary.name,
          location: summary.location,
          status: summary.status,
          cameraCount: summary.cameraCount,
          onlineCameraCount: summary.onlineCameraCount,
          latestScore: summary.latestScore,
          lastActivity: summary.lastActivity
            ? summary.lastActivity.toISOString()
            : null
        })),
        createdAt: company.createdAt
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched
    });
  } catch (error: any) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch companies', details: error.message },
      { status: 500 }
    );
  } finally {
    // No need to disconnect with singleton pattern
  }
}

/**
 * POST /api/admin/companies
 * Create a new company
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateBody(createCompanySchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { name, companyUsername, email, contactEmail, phone, address } = validation.data;

    // Check if company username already exists
    const existingUsername = await prisma.company.findUnique({
      where: { companyUsername }
    });

    if (existingUsername) {
      return NextResponse.json(
        { success: false, error: 'Company username already exists' },
        { status: 409 }
      );
    }

    const existingEmail = await prisma.company.findUnique({
      where: { email }
    });

    if (existingEmail) {
      return NextResponse.json(
        { success: false, error: 'Company email already exists' },
        { status: 409 }
      );
    }

    const company = await prisma.company.create({
      data: {
        name,
        companyUsername,
        email,
        contactEmail,
        phone,
        address
      }
    });

    return NextResponse.json({
      success: true,
      data: company,
      message: 'Company created successfully'
    });

  } catch (error: any) {
    console.error('Error creating company:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create company', details: error.message },
      { status: 500 }
    );
  } finally {
    // No need to disconnect with singleton pattern
  }
}

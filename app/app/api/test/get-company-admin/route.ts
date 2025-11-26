import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/test/get-company-admin
 * Get company admin login credentials (development only)
 */
export async function GET(request: NextRequest) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
    }

    // Find all company admin users
    const companyAdmins = await prisma.user.findMany({
      where: {
        role: {
          in: ['COMPANY_ADMIN', 'COMPANY_ADMIN']
        },
        isActivated: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyUsername: true,
            email: true
          }
        }
      },
      take: 10
    });

    // Also check for users with companyId set
    const usersWithCompany = await prisma.user.findMany({
      where: {
        companyId: {
          not: null
        },
        role: {
          in: ['COMPANY_ADMIN', 'SITE_ADMIN']
        },
        isActivated: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            companyUsername: true,
            email: true
          }
        }
      },
      take: 10
    });

    // Get all companies
    const companies = await prisma.company.findMany({
      take: 20,
      include: {
        users: {
          where: {
            role: {
              in: ['COMPANY_ADMIN', 'SITE_ADMIN']
            },
            isActivated: true
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            isActivated: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        companyAdmins,
        usersWithCompany,
        companies: companies.map(c => ({
          id: c.id,
          name: c.name,
          companyUsername: c.companyUsername,
          email: c.email,
          adminUsers: c.users
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching company admins:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch company admins', details: error.message },
      { status: 500 }
    );
  }
}


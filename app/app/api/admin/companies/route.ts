import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/app/lib/db';

/**
 * GET /api/admin/companies
 * Get all companies with stats
 */
export async function GET(request: NextRequest) {
  try {
    const companies = await db.company.findMany({
      include: {
        _count: {
          select: {
            worksites: true,
            users: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const enriched = companies.map(company => ({
      id: company.id,
      name: company.name,
      companyName: company.companyName,
      email: company.email,
      phone: company.phone,
      address: company.address,
      worksiteCount: company._count.worksites,
      userCount: company._count.users,
      createdAt: company.createdAt
    }));

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
    const { name, companyName, email, phone, address } = body;

    if (!name || !companyName || !email) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, companyName, email' },
        { status: 400 }
      );
    }

    // Check if company name already exists
    const existing = await db.company.findUnique({
      where: { companyName }
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Company username already exists' },
        { status: 409 }
      );
    }

    const company = await db.company.create({
      data: {
        name,
        companyName,
        email,
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

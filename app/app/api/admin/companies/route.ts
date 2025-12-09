import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';

/**
 * GET /api/admin/companies
 * Get all companies with basic stats (super admin only)
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    console.log('[companies API] Starting request...');
    
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      console.log('[companies API] No session');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[companies API] Session found, checking role...');
    
    // Check if user is super admin
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: session.user.email || '' },
        select: { role: true }
      });
    } catch (dbError: any) {
      console.error('[companies API] Database connection error:', dbError);
      if (dbError?.message?.includes('Can\'t reach database server') || dbError?.code === 'P1001') {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed. Please check your database server is running.',
          data: []
        }, { status: 503 }); // Service Unavailable
      }
      throw dbError; // Re-throw if it's a different error
    }

    if (!user || (user.role?.toUpperCase() !== 'SUPER_ADMIN' && user.role?.toUpperCase() !== 'SUPERADMIN')) {
      console.log('[companies API] Not super admin');
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('[companies API] Fetching companies...');
    
    // Query with _count for fast counting
    let companies;
    try {
      companies = await prisma.company.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              worksites: true,
              users: true,
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 100 // Limit to prevent huge queries
      });
    } catch (dbError: any) {
      console.error('[companies API] Database error fetching companies:', dbError);
      if (dbError?.message?.includes('Can\'t reach database server') || dbError?.code === 'P1001') {
        return NextResponse.json({
          success: false,
          error: 'Database connection failed. Please check your database server is running.',
          data: []
        }, { status: 503 }); // Service Unavailable
      }
      throw dbError; // Re-throw if it's a different error
    }

    console.log(`[companies API] Found ${companies.length} companies in ${Date.now() - startTime}ms`);

    // Get camera counts efficiently
    const companyIds = companies.map(c => c.id);
    const cameraCountsMap = new Map<string, number>();
    
    if (companyIds.length > 0) {
      try {
        // Get all worksites for these companies
        const worksites = await prisma.worksite.findMany({
          where: { companyId: { in: companyIds } },
          select: { id: true, companyId: true }
        });
        
        const worksiteIds = worksites.map(w => w.id);
        const worksiteToCompany = new Map(worksites.map(w => [w.id, w.companyId]));
        
        if (worksiteIds.length > 0) {
          // Count cameras per worksite
          const cameraCounts = await prisma.camera.groupBy({
            by: ['worksiteId'],
            where: { worksiteId: { in: worksiteIds } },
            _count: true
          });
          
          // Aggregate by company
          cameraCounts.forEach(item => {
            const companyId = worksiteToCompany.get(item.worksiteId);
            if (companyId) {
              cameraCountsMap.set(
                companyId,
                (cameraCountsMap.get(companyId) || 0) + item._count
              );
            }
          });
        }
      } catch (err) {
        console.error('[companies API] Error calculating camera counts:', err);
      }
    }

    // Enrich with counts
    const enriched = companies.map(company => ({
      id: company.id,
      name: company.name,
      email: company.email || '',
      phone: company.phone || null,
      address: company.address || null,
      worksiteCount: company._count.worksites,
      userCount: company._count.users,
      cameraCount: cameraCountsMap.get(company.id) || 0,
      createdAt: company.createdAt.toISOString(),
      updatedAt: company.updatedAt.toISOString(),
    }));

    console.log(`[companies API] Returning ${enriched.length} companies in ${Date.now() - startTime}ms total`);

    return NextResponse.json({
      success: true,
      data: enriched
    });

  } catch (error: any) {
    console.error('[companies API] Error:', error);
    console.error('[companies API] Error stack:', error?.stack);
    console.error('[companies API] Error name:', error?.name);
    console.error('[companies API] Error code:', error?.code);
    
    // Return error response that won't crash frontend
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to fetch companies',
      data: [],
      details: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/companies
 * Create a new company (super admin only)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email || '' },
      select: { role: true, id: true }
    });

    if (!user || (user.role?.toUpperCase() !== 'SUPER_ADMIN' && user.role?.toUpperCase() !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, phone, address, companyUsername } = body;

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Company name is required'
      }, { status: 400 });
    }

    // Check for duplicate name
    const existingByName = await prisma.company.findFirst({
      where: { name }
    });

    if (existingByName) {
      return NextResponse.json({
        success: false,
        error: 'A company with this name already exists'
      }, { status: 409 });
    }

    // Check for duplicate email if provided
    if (email) {
      const existingByEmail = await prisma.company.findUnique({
        where: { email }
      });

      if (existingByEmail) {
        return NextResponse.json({
          success: false,
          error: 'A company with this email already exists. Please use a different email address.'
        }, { status: 409 });
      }
    }

    // Check for duplicate username if provided
    if (companyUsername) {
      const existingByUsername = await prisma.company.findUnique({
        where: { companyUsername }
      });

      if (existingByUsername) {
        return NextResponse.json({
          success: false,
          error: 'A company with this username already exists. Please choose a different username.'
        }, { status: 409 });
      }
    }

    // Generate companyUsername from name if not provided (URL-friendly)
    let finalUsername = companyUsername;
    if (!finalUsername) {
      finalUsername = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);

    // Check if username already exists, append number if needed
    let counter = 1;
    while (await prisma.company.findUnique({ where: { companyUsername: finalUsername } })) {
        finalUsername = `${finalUsername}-${counter}`;
      counter++;
      }
    }

    const company = await prisma.company.create({
      data: {
        name,
        companyUsername: finalUsername,
        email: email || null,
        phone: phone || null,
        address: address || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...company,
        worksiteCount: 0,
        userCount: 0,
        cameraCount: 0,
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      }
    }, { status: 201 });

  } catch (error: any) {
    console.error('[companies API] Create error:', error);
    return NextResponse.json({
      success: false,
      error: error?.message || 'Failed to create company'
    }, { status: 500 });
  }
}


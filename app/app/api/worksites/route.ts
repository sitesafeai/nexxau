import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { logCreate } from '@/app/lib/audit-logger';
import { createWorksiteSchema } from '@/app/lib/validation/worksites';
import { validateQuery, validateBody } from '@/app/lib/validation/common';

/**
 * GET /api/worksites
 * Get all worksites with real-time stats (filtered by user access)
 */
export async function GET(request: NextRequest) {
  try {
    // Get current user session
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check for companyId query parameter (for super admin filtering)
    const { searchParams } = new URL(request.url);
    const queryCompanyId = searchParams.get('companyId');

    // Normalize role for comparison (handle case sensitivity)
    const userRole = user.role?.toUpperCase?.() || '';
    
    console.log('[worksites API] User:', user.email, 'Role:', userRole, 'CompanyId:', user.companyId, 'QueryCompanyId:', queryCompanyId);

    // Build filter based on user role
    let whereClause: any = {};

    // If queryCompanyId is provided and user is super admin, use it
    if (queryCompanyId && (userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN')) {
      whereClause = {
        companyId: queryCompanyId
      };
      console.log('[worksites API] SUPER_ADMIN - filtering by query companyId:', queryCompanyId);
    } else if (userRole === 'SUPER_ADMIN' || userRole === 'SUPERADMIN') {
      // Super admin sees everything (if no companyId query param)
      whereClause = {};
      console.log('[worksites API] SUPER_ADMIN - showing all worksites');
    } else if (userRole === 'COMPANY_ADMIN' || userRole === 'COMPANYADMIN') {
      // Company admin sees only their company's worksites
      if (user.companyId) {
        whereClause = {
          companyId: user.companyId
        };
        console.log('[worksites API] COMPANY_ADMIN - filtering by companyId:', user.companyId);
      } else {
        console.warn('[worksites API] COMPANY_ADMIN user has no companyId');
        whereClause = { id: 'none' }; // Return nothing if no companyId
      }
    } else if (user.id) {
      // SITE_ADMIN, SUPERVISOR, WORKER, VIEWER - only worksites they have access to
      // First try to get worksites via worksiteUsers relation
      whereClause = {
        OR: [
          { worksiteUsers: { some: { userId: user.id } } },
          // Also include worksites from user's company if they have a companyId
          ...(user.companyId ? [{ companyId: user.companyId }] : [])
        ]
      };
      console.log('[worksites API] Other role - using OR filter with userId:', user.id);
    }

    let worksites: any[] = [];
    try {
      // Fetch worksites WITHOUT company relation to avoid orphaned relation errors
      worksites = await prisma.worksite.findMany({
        where: whereClause,
            select: {
              id: true,
              name: true,
          worksiteName: true,
          location: true,
          address: true,
          companyId: true,
          status: true,
          cameraSystemType: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              cameras: true,
              alerts: true,
              workers: true
            }
          },
          cameras: {
            select: {
              id: true,
              status: true
            }
          }
        }
      });
      console.log(`[worksites API] Found ${worksites.length} worksites with filter:`, JSON.stringify(whereClause));
      
      // Fetch companies separately to avoid orphaned relation issues
      if (worksites.length > 0) {
        const companyIds = [...new Set(worksites.map(ws => ws.companyId).filter(Boolean))] as string[];
        const companies = companyIds.length > 0 
          ? await prisma.company.findMany({
              where: { id: { in: companyIds } },
              select: {
                id: true,
                name: true,
                companyUsername: true,
              }
            }).catch(() => [])
          : [];
        
        // Create a map of company data and attach to worksites
        const companyMap = new Map(companies.map(c => [c.id, c]));
        worksites = worksites.map(ws => ({
          ...ws,
          company: ws.companyId ? companyMap.get(ws.companyId) || null : null
        }));
      }
    } catch (dbError) {
      console.error('[worksites API] Database error fetching worksites:', dbError);
      return NextResponse.json({
        success: true,
        data: [],
        error: 'Database error'
      });
    }
    
    if (worksites.length === 0) {
      console.warn('[worksites API] No worksites found with filter:', JSON.stringify(whereClause));
    }

    // Enrich with real-time stats (with error handling for each worksite)
    const enrichedWorksites = await Promise.all(
      worksites.map(async (worksite) => {
        try {
          // Get latest safety score
          const latestScore = await prisma.safetyScore.findFirst({
            where: { worksiteId: worksite.id },
            orderBy: { date: 'desc' },
            select: {
              safetyScore: true,
              grade: true
            }
          });

          // If no safety score exists, return null (will show "Not calculated" in UI)
          // Safety scores should be calculated via scheduled jobs or manual triggers
          const safetyScore = latestScore?.safetyScore ?? null;
          const grade = latestScore?.grade ?? null;

          // Get active alerts count (using proper ENUM values)
          const activeAlertsCount = await prisma.alert.count({
            where: {
              worksiteId: worksite.id,
              status: { in: ['ACTIVE', 'ACKNOWLEDGED'] }
            }
          });

          // Get last activity (most recent camera update or alert)
          const lastCameraUpdate = await prisma.camera.findFirst({
            where: { worksiteId: worksite.id },
          orderBy: { updatedAt: 'desc' },
          select: { updatedAt: true }
        });

        const lastAlert = await prisma.alert.findFirst({
          where: { worksiteId: worksite.id },
          orderBy: { createdAt: 'desc' },
          select: { createdAt: true }
        });

        const lastActivityTime = [
          lastCameraUpdate?.updatedAt,
          lastAlert?.createdAt
        ]
          .filter(Boolean)
          .sort((a, b) => new Date(b!).getTime() - new Date(a!).getTime())[0];

        const lastActivity = lastActivityTime
          ? getTimeAgo(new Date(lastActivityTime))
          : 'No activity';

          // Determine site status based on camera status
          // Check both 'online' and 'active' status (camera.status is a string, not enum)
          const onlineCameras = worksite.cameras.filter((c: { id: string; status: string | null }) => 
            c.status?.toLowerCase() === 'online' || 
            c.status?.toLowerCase() === 'active'
          ).length;
        const totalCameras = worksite.cameras.length;
        
        // Use the worksite's stored status from database, or compute based on camera health
        // Only override if worksite.status is not set or if we want to compute dynamically
        let status = worksite.status || 'active';
        
        // If worksite doesn't have a status set, compute it based on camera health
        if (!worksite.status) {
          if (totalCameras === 0) {
            status = 'inactive';
          } else if (onlineCameras === 0) {
            status = 'offline';
          } else if (onlineCameras < totalCameras * 0.5) {
            // Only set to maintenance if less than 50% cameras are online AND worksite status wasn't explicitly set
            // For now, keep it as 'active' unless explicitly set to maintenance
            status = 'active';
          }
        }

          return {
            id: worksite.id,
            name: worksite.name,
            worksiteName: worksite.worksiteName,
            address: worksite.address,
            companyId: worksite.companyId,
            company: worksite.company || null, // Include company data that was merged earlier
            status,
            cameras: worksite._count.cameras,
            alerts: activeAlertsCount,
            workers: worksite._count.workers,
            lastActivity,
            safetyScore: safetyScore ?? null,
            grade: grade ?? null,
            cameraSystemType: worksite.cameraSystemType,
            createdAt: worksite.createdAt,
            updatedAt: worksite.updatedAt
          };
        } catch (enrichError) {
          console.error('Error enriching worksite:', worksite.id, enrichError);
          // Return basic worksite data without enrichment on error
          return {
            id: worksite.id,
            name: worksite.name,
            worksiteName: worksite.worksiteName,
            address: worksite.address,
            companyId: worksite.companyId,
            company: worksite.company || null, // Include company data that was merged earlier
            status: 'unknown',
            cameras: worksite._count?.cameras ?? 0,
            alerts: 0,
            workers: worksite._count?.workers ?? 0,
            lastActivity: 'Unknown',
            safetyScore: null,
            grade: null,
            cameraSystemType: worksite.cameraSystemType,
            createdAt: worksite.createdAt,
            updatedAt: worksite.updatedAt
          };
        }
      })
    );

    return NextResponse.json({
      success: true,
      data: enrichedWorksites
    });
  } catch (error: any) {
    console.error('Error fetching worksites:', error);
    // Return empty array instead of 500 to prevent frontend crashes
    return NextResponse.json(
      { 
        success: true, 
        data: [],
        details: error.message 
      }
    );
  }
}

/**
 * POST /api/worksites
 * Create a new worksite (COMPANY_ADMIN and SUPER_ADMIN only)
 */
export async function POST(request: NextRequest) {
  try {
    // Check permissions
    const session = await getSession();
    const user = session?.user;

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Normalize role
    const userRole = user.role?.toUpperCase?.() || '';

    // Only SUPER_ADMIN and COMPANY_ADMIN can create worksites
    if (!['SUPER_ADMIN', 'SUPERADMIN', 'COMPANY_ADMIN', 'COMPANYADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to create worksite' },
        { status: 403 }
      );
    }

    const body = await request.json();
    
    // Check if using new format (has slug or addressDetails)
    const isNewFormat = body.slug !== undefined || body.addressDetails !== undefined;

    if (isNewFormat) {
      return handleNewFormatCreate(body, user, userRole, request);
    }

    // Legacy format handling
    const validation = validateBody(createWorksiteSchema, body);

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

    const { name, worksiteName: providedWorksiteName, location, address, companyId, cameraSystemType } = validation.data;

    // Company admins can only create worksites in their own company
    if (userRole === 'COMPANY_ADMIN' && companyId !== user.companyId) {
      return NextResponse.json(
        { success: false, error: 'You can only create worksites in your own company' },
        { status: 403 }
      );
    }

    // Use provided worksiteName or generate from name
    const worksiteName = providedWorksiteName || name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const worksite = await prisma.worksite.create({
      data: {
        name,
        worksiteName,
        location,
        address: address || '', // Default to empty string if not provided
        companyId,
        cameraSystemType: cameraSystemType || 'mixed',
        status: 'ACTIVE'
      }
    });

    // Log audit trail
    await logCreate(user.id, 'Worksite', worksite.id, worksite, request);

    // Auto-provision default workflows asynchronously (don't block response)
    import('@/app/lib/workflows/default-workflows').then(({ initializeWorksiteAutomation }) => {
      initializeWorksiteAutomation(worksite.id, {
        supervisorPhone: body.supervisorPhone,
        supervisorEmail: user.email || body.supervisorEmail
      }).catch(error => {
        console.error('[Worksite API] Failed to provision workflows:', error);
      });
    }).catch(error => {
      console.error('[Worksite API] Failed to load workflow provisioner:', error);
    });

    return NextResponse.json({
      success: true,
      data: worksite
    });
  } catch (error: any) {
    console.error('Error creating worksite:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to create worksite', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Handle new format worksite creation with all enhanced fields
async function handleNewFormatCreate(body: any, user: any, userRole: string, request: NextRequest) {
  try {
    const {
      name,
      slug,
      companyId,
      addressDetails,
      timezone = 'America/New_York',
      industry,
      businessUnit,
      retentionPolicy = '30',
      dataResidency,
      operatingHours,
      contact,
      slaSettings,
    } = body;

    // Validation
    if (!name || name.length < 3) {
      return NextResponse.json({
        success: false,
        error: 'Worksite name is required (min 3 characters)'
      }, { status: 400 });
    }

    if (!slug) {
      return NextResponse.json({
        success: false,
        error: 'Worksite code (slug) is required'
      }, { status: 400 });
    }

    if (!companyId) {
      return NextResponse.json({
        success: false,
        error: 'Company is required'
      }, { status: 400 });
    }

    // Company admins can only create worksites in their own company
    if (['COMPANY_ADMIN', 'COMPANYADMIN'].includes(userRole) && companyId !== user.companyId) {
      return NextResponse.json({
        success: false,
        error: 'You can only create worksites in your own company'
      }, { status: 403 });
    }

    // Check for duplicate slug
    const existingSlug = await prisma.worksite.findFirst({
      where: { 
        OR: [
          // { slug: slug }, // slug field doesn't exist in Worksite model
          { id: slug }, // Use id as fallback
          { worksiteName: slug }
        ]
      }
    });

    if (existingSlug) {
      return NextResponse.json({
        success: false,
        error: 'A worksite with this code already exists'
      }, { status: 409 });
    }

    // Build address string from details
    const addressString = addressDetails 
      ? `${addressDetails.street}, ${addressDetails.city}, ${addressDetails.state} ${addressDetails.postal}`
      : '';

    const worksite = await prisma.$transaction(async (tx) => {
      const newWorksite = await tx.worksite.create({
        data: {
          name,
          worksiteName: slug, // Use slug as worksiteName for backward compatibility
          // slug, // slug field doesn't exist in Worksite model
          address: addressString,
          // addressDetails: addressDetails || null, // addressDetails field doesn't exist in Worksite model
          location: addressDetails ? `${addressDetails.city}, ${addressDetails.state}` : null,
          // timezone, // timezone field doesn't exist in Worksite model
          // industry: industry || null, // industry field doesn't exist in Worksite model
          // businessUnit: businessUnit || null, // businessUnit field doesn't exist in Worksite model
          // retentionPolicy, // retentionPolicy field doesn't exist in Worksite model
          // dataResidency: dataResidency || null, // dataResidency field doesn't exist in Worksite model
          // operatingHours: operatingHours || null, // operatingHours field doesn't exist in Worksite model
          // contactName: contact?.name || null, // contactName field doesn't exist in Worksite model
          // contactEmail: contact?.email || null, // contactEmail field doesn't exist in Worksite model
          // contactPhone: contact?.phone || null, // contactPhone field doesn't exist in Worksite model
          // slaSettings: slaSettings || null, // slaSettings field doesn't exist in Worksite model
          companyId,
          status: 'ACTIVE',
          // isActive: true, // isActive field doesn't exist in Worksite model
          // createdBy: user.id, // createdBy field doesn't exist in Worksite model
        },
        include: {
          company: {
            select: { id: true, name: true }
          }
        }
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: 'WORKSITE_CREATED',
          entity: 'WORKSITE',
          entityId: newWorksite.id,
          entityName: newWorksite.name,
          companyId: newWorksite.companyId,
          details: {
            name: newWorksite.name,
            slug: (newWorksite as any).slug || newWorksite.id, // slug field doesn't exist, use id as fallback
            industry,
            timezone,
            contact,
          },
          result: 'SUCCESS',
          severity: 'INFO',
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        }
      });

      return newWorksite;
    });

    return NextResponse.json({
      success: true,
      data: worksite,
      message: 'Worksite created successfully'
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating worksite (new format):', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create worksite',
      details: error.message
    }, { status: 500 });
  }
}

// Helper function to calculate time ago
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''} ago`;
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { normalizeRole } from '@/app/lib/roles';
import { Cache, CacheKeys } from '@/app/lib/cache';
import { generateInviteToken, getTokenExpiry } from '@/app/lib/token-utils';
import { sendInvitationEmail } from '@/app/lib/email-service';

/**
 * GET /api/worksites/:id/users
 * Get all users assigned to a worksite with role and status
 * 
 * Query params:
 * - search: Filter by name or email
 * - role: Filter by WorksiteRole
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksiteId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const roleFilter = searchParams.get('role');
    const includeCurrentUserRole = searchParams.get('includeCurrentUserRole') === 'true';

    // Build where clause for user search
    const userWhere: any = {};
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Fetch users through worksiteUsers relationship
    const worksiteUsers = await prisma.worksiteUser.findMany({
      where: {
        worksiteId,
        ...(roleFilter && roleFilter !== 'all' ? { role: roleFilter } : {}),
        user: userWhere
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phoneNumber: true,
            role: true,
            isActivated: true, // Use isActivated for status
            lastLogin: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Get current user's worksite role if requested
    let currentUserWorksiteRole: string | null = null;
    let currentUserGlobalRole: string | null = null;
    if (includeCurrentUserRole) {
      const currentUser = await prisma.user.findUnique({
        where: { email: session.user.email || undefined },
        select: {
          role: true, // Global role
          worksiteAccess: {
            where: { worksiteId },
            select: { role: true }
          }
        }
      });
      currentUserWorksiteRole = currentUser?.worksiteAccess[0]?.role || null;
      currentUserGlobalRole = normalizeRole(currentUser?.role || session.user.role);
      
      // Fallback to global admin check: SUPER_ADMIN, ADMIN, or COMPANY_ADMIN should be treated as ADMIN
      if (!currentUserWorksiteRole) {
        if (currentUserGlobalRole === 'SUPER_ADMIN' || 
            currentUserGlobalRole === 'ADMIN' || 
            currentUserGlobalRole === 'COMPANY_ADMIN') {
          currentUserWorksiteRole = 'ADMIN';
        }
      }
    }

    // Format response with WorksiteUser role and status
    const users = worksiteUsers.map(wu => ({
      id: wu.user.id,
      name: wu.user.name,
      email: wu.user.email,
      phoneNumber: wu.user.phoneNumber,
      role: wu.role, // WorksiteRole from WorksiteUser
      status: wu.user.isActivated ? 'ACTIVE' : 'INACTIVE' as 'ACTIVE' | 'INACTIVE',
      worksiteUserId: wu.id, // For updates
      requiresOnboarding: !wu.user.onboardingComplete, // True if user hasn't completed onboarding
      lastLogin: wu.user.lastLogin,
      createdAt: wu.createdAt
    }));

    return NextResponse.json({
      success: true,
      data: users,
      ...(includeCurrentUserRole && { 
        currentUserRole: currentUserWorksiteRole,
        currentUserGlobalRole: currentUserGlobalRole 
      })
    });
  } catch (error: any) {
    console.error('Error fetching worksite users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/worksites/:id/users
 * Add/invite a user to a worksite by email
 * 
 * Body: { email: string, role: WorksiteRole }
 * 
 * Permissions: Only ADMIN or SITE_ADMIN can add users
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksiteId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get current user's worksite role, ID, and name (for audit log and email)
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email || undefined },
      select: {
        id: true,
        name: true,
        worksiteAccess: {
          where: { worksiteId },
          select: { role: true }
        }
      }
    });
    
    const currentUserWorksiteRole = currentUser?.worksiteAccess[0]?.role;
    
    // Check global admin role as fallback
    const userRole = normalizeRole(session.user.role);
    const isGlobalAdmin = userRole === 'SUPER_ADMIN' || 
                          userRole === 'ADMIN' || 
                          userRole === 'COMPANY_ADMIN';
    
    // Determine effective role: worksite role takes precedence, fallback to global admin
    const effectiveRole = currentUserWorksiteRole || (isGlobalAdmin ? 'ADMIN' : null);
    
    if (!effectiveRole) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to manage users' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Valid email is required' },
        { status: 400 }
      );
    }

    if (!role || !['ADMIN', 'SUPERVISOR', 'WORKER', 'VIEWER'].includes(role)) {
      return NextResponse.json(
        { success: false, error: 'Valid role is required (ADMIN, SUPERVISOR, WORKER, VIEWER)' },
        { status: 400 }
      );
    }

    // ============================================
    // ROLE-BASED PERMISSION CHECK
    // ============================================
    // ADMIN: Can add any role (ADMIN, SUPERVISOR, WORKER, VIEWER)
    // SUPERVISOR: Can add only WORKER or VIEWER
    // WORKER: Cannot add any role
    // VIEWER: Cannot add any role
    
    const canAddRole = (userRole: string, targetRole: string): boolean => {
      if (userRole === 'ADMIN') {
        return true; // ADMIN can add any role
      }
      if (userRole === 'SUPERVISOR') {
        return targetRole === 'WORKER' || targetRole === 'VIEWER'; // Only WORKER and VIEWER
      }
      // WORKER and VIEWER cannot add anyone
      return false;
    };
    
    if (!canAddRole(effectiveRole, role)) {
      // Log permission denial for auditing
      console.log(`[WorksiteUser] Permission denied: User with role ${effectiveRole} attempted to add role ${role}`);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Insufficient permissions. ${effectiveRole} role cannot add ${role} role.` 
        },
        { status: 403 }
      );
    }

    // Verify worksite exists and get company info
    const worksite = await prisma.worksite.findUnique({
      where: { id: worksiteId },
      include: {
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!worksite) {
      return NextResponse.json(
        { success: false, error: 'Worksite not found' },
        { status: 404 }
      );
    }

    // ============================================
    // EXPLICIT EMAIL UNIQUENESS HANDLING
    // ============================================
    // Handle all cases explicitly - DO NOT rely on DB constraints
    
    const normalizedEmail = email.toLowerCase();
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        company: {
          select: {
            id: true
          }
        }
      }
    });

    const isNewUser = !user;
    const inviteToken = generateInviteToken();
    const inviteExpires = getTokenExpiry(24); // 24 hours expiry

    // Case C: Email does not exist - create new user
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          isActivated: false, // Requires activation via onboarding
          onboardingComplete: false,
          role: 'WORKER', // Default global role
          inviteToken: inviteToken,
          inviteExpires: inviteExpires,
          invitedBy: currentUser?.id || null,
          companyId: worksite.companyId // Link to company
        },
        include: {
          company: {
            select: {
              id: true
            }
          }
        }
      });
    } else {
      // Case A or B: Email already exists
      
      // Case B: Email exists but belongs to DIFFERENT company - HARD FAIL
      if (user.companyId && user.companyId !== worksite.companyId) {
        return NextResponse.json(
          { success: false, error: 'User already belongs to another company' },
          { status: 409 }
        );
      }

      // Case A: Email exists and belongs to same company (or no company yet)
      // Check if user is already linked to this worksite
      const existingAssignment = await prisma.worksiteUser.findUnique({
        where: {
          userId_worksiteId: {
            userId: user.id,
            worksiteId
          }
        }
      });

      if (existingAssignment) {
        return NextResponse.json(
          { success: false, error: 'User already assigned to this worksite' },
          { status: 409 }
        );
      }

      // User exists, same company, but not linked to this worksite
      // Update company link if not set, and generate new invite token if needed
      const updateData: any = {};
      
      if (!user.companyId) {
        updateData.companyId = worksite.companyId;
      }

      // Generate new invite token if user hasn't completed onboarding
      if (!user.onboardingComplete) {
        updateData.inviteToken = inviteToken;
        updateData.inviteExpires = inviteExpires;
        updateData.invitedBy = currentUser?.id || user.invitedBy;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
          include: {
            company: {
              select: {
                id: true
              }
            }
          }
        });
      }
    }

    // Create assignment with specified role
    const assignment = await prisma.worksiteUser.create({
      data: {
        userId: user.id,
        worksiteId,
        role: role
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActivated: true
          }
        }
      }
    });

    // Update user's primary worksiteId if not set (so they land on the correct worksite)
    if (!user.worksiteId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { worksiteId: worksiteId }
      });
      console.log('[INVITE FLOW] Set user primary worksiteId to:', worksiteId);
    }

    // Send invitation email if user is new or hasn't completed onboarding
    // (Only send if we generated a new token)
    let emailSent = false;
    let emailError: string | null = null;
    
    if ((isNewUser || !user.onboardingComplete) && user.inviteToken === inviteToken) {
      console.log('[INVITE FLOW] Reached email send block');
      console.log('[INVITE FLOW] User ID:', user.id);
      console.log('[INVITE FLOW] Is new user:', isNewUser);
      console.log('[INVITE FLOW] Onboarding complete:', user.onboardingComplete);
      console.log('[INVITE FLOW] Token matches:', user.inviteToken === inviteToken);
      
      const inviterName = currentUser?.name || session.user?.name || 'Administrator';
      
      try {
        console.log('[INVITE FLOW] Calling sendInvitationEmail function...');
        const emailResult = await sendInvitationEmail(
          user.email,
          inviterName,
          role,
          worksite.name,
          inviteToken,
          worksite.company?.name,
          worksite.companyId,
          worksiteId
        );
        
        if (emailResult.success) {
          emailSent = true;
          console.log('[INVITE FLOW] ✅ Email send function returned success');
        } else {
          emailError = emailResult.error || 'Unknown email error';
          console.error('[INVITE FLOW] ❌ Email send function returned failure:', emailError);
          console.error('[INVITE FLOW] Error details:', emailResult.errorDetails);
        }
      } catch (emailError: any) {
        emailError = emailError.message || 'Exception thrown during email send';
        console.error('[INVITE FLOW] ❌ Exception thrown during email send:', emailError);
        console.error('[INVITE FLOW] Exception stack:', emailError.stack);
      }
    } else {
      console.log('[INVITE FLOW] Skipping email send - conditions not met');
      console.log('[INVITE FLOW] Is new user:', isNewUser);
      console.log('[INVITE FLOW] Onboarding complete:', user.onboardingComplete);
      console.log('[INVITE FLOW] Token matches:', user.inviteToken === inviteToken);
    }

    // Create audit log (currentUser already fetched above)
    if (currentUser?.id) {
      await prisma.auditLog.create({
        data: {
          userId: currentUser.id!,
          action: isNewUser ? 'USER_INVITED' : 'USER_ADDED_TO_WORKSITE',
          entity: 'USER',
          entityId: user.id,
          worksiteId,
          metadata: {
            entityName: user.email,
            severity: 'INFO',
            result: 'SUCCESS',
            details: {
              role,
              isNewUser,
              worksiteName: worksite.name,
              companyName: worksite.company?.name || null,
              invitationSent: isNewUser || !user.onboardingComplete,
            },
          },
        }
      }).catch(err => {
        // Don't fail if audit log fails
        console.error('Failed to create audit log:', err);
      });
    }

    // Return response with email status
    const response: any = {
      success: true,
      data: {
        id: assignment.user.id,
        name: assignment.user.name,
        email: assignment.user.email,
        role: assignment.role,
        status: assignment.user.isActivated ? 'ACTIVE' : 'INACTIVE',
        worksiteUserId: assignment.id,
        requiresOnboarding: !user.onboardingComplete
      }
    };

    // Surface email failure to caller
    if (emailError) {
      response.emailSent = false;
      response.emailError = emailError;
      response.message = 'User added, but invitation email failed to send.';
    } else if (emailSent) {
      response.emailSent = true;
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('Error adding user to worksite:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to add user', details: error.message },
      { status: 500 }
    );
  }
}


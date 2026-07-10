/**
 * User Onboarding API
 * Handles account completion for invited users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { isTokenExpired, isValidTokenFormat } from '@/app/lib/token-utils';
import bcrypt from 'bcryptjs';

/**
 * GET /api/users/onboard?token={token}
 * Fetch pre-filled information for account completion
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    console.log('[ONBOARD] GET request received, token:', token ? `${token.substring(0, 10)}...` : 'none');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!isValidTokenFormat(token)) {
      console.log('[ONBOARD] Invalid token format');
      return NextResponse.json(
        { success: false, error: 'Invalid token format' },
        { status: 400 }
      );
    }

    // Find user by token
    console.log('[ONBOARD] Looking up user with token:', token.substring(0, 10) + '...');
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      include: {
        worksiteAccess: {
          include: {
            worksite: {
              include: {
                company: {
                  select: {
                    id: true,
                    name: true
                  }
                }
              }
            }
          }
        },
        company: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!user) {
      console.log('[ONBOARD] ❌ User not found with token:', token.substring(0, 15) + '...');
      // Debug: Check how many users have tokens
      const usersWithTokens = await prisma.user.findMany({
        where: { inviteToken: { not: null } },
        select: { email: true, inviteToken: true, inviteExpires: true, onboardingComplete: true }
      });
      console.log('[ONBOARD] Users with active tokens:', usersWithTokens.length);
      if (usersWithTokens.length > 0) {
        console.log('[ONBOARD] Token prefixes:', usersWithTokens.slice(0, 5).map(u => ({
          email: u.email,
          prefix: u.inviteToken?.substring(0, 15),
          expires: u.inviteExpires,
          completed: u.onboardingComplete
        })));
      }
      
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token. The token may have been used or revoked. Please request a new invitation from your administrator.' },
        { status: 404 }
      );
    }
    
    console.log('[ONBOARD] ✅ User found:', user.email, 'Token matches:', user.inviteToken === token, 'Onboarding complete:', user.onboardingComplete);

    // Security: Check if invitation was revoked (token set to null)
    if (!user.inviteToken || user.inviteToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Invitation has been revoked. Please contact your administrator for a new invitation.' },
        { status: 410 } // 410 Gone
      );
    }

    // Check if token is expired
    if (isTokenExpired(user.inviteExpires)) {
      return NextResponse.json(
        { success: false, error: 'Token has expired. Please request a new invitation.' },
        { status: 410 } // 410 Gone
      );
    }

    // Check if already completed
    if (user.onboardingComplete) {
      return NextResponse.json(
        { success: false, error: 'Account setup already completed' },
        { status: 400 }
      );
    }

    // Get worksite and role information
    const worksiteAccess = user.worksiteAccess[0]; // Get first worksite (most recent)
    const worksite = worksiteAccess?.worksite;
    const role = worksiteAccess?.role || 'WORKER';

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        worksite: worksite ? {
          id: worksite.id,
          name: worksite.name
        } : null,
        company: user.company ? {
          id: user.company.id,
          name: user.company.name
        } : null,
        role: role,
        // Pre-fill name if already set
        name: user.name || ''
      }
    });
  } catch (error: any) {
    console.error('Error fetching onboarding data:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch onboarding data', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/users/onboard
 * Complete account setup with user information
 * 
 * Body: {
 *   token: string,
 *   name: string,
 *   phone?: string,
 *   password: string,
 *   passwordConfirm: string
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[ONBOARD POST] Request received');
    const body = await request.json();
    const { token, name, phone, password, passwordConfirm } = body;
    console.log('[ONBOARD POST] Body received:', { 
      token: token ? token.substring(0, 10) + '...' : 'none',
      name: name ? name.substring(0, 20) : 'none',
      phone: phone ? 'provided' : 'none',
      passwordLength: password?.length || 0,
      passwordConfirmLength: passwordConfirm?.length || 0
    });

    // Validation
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      );
    }

    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token format' },
        { status: 400 }
      );
    }

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: 'Name must be at least 2 characters' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'Password is required' },
        { status: 400 }
      );
    }

    if (password !== passwordConfirm) {
      return NextResponse.json(
        { success: false, error: 'Passwords do not match' },
        { status: 400 }
      );
    }

    // Password strength validation
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Password must be at least 8 characters and contain: uppercase, lowercase, number, and special character' 
        },
        { status: 400 }
      );
    }

    // Find user by token
    const user = await prisma.user.findUnique({
      where: { inviteToken: token },
      include: {
        worksiteAccess: {
          include: {
            worksite: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired token' },
        { status: 404 }
      );
    }

    // Security: Check if invitation was revoked (token set to null)
    if (!user.inviteToken || user.inviteToken !== token) {
      return NextResponse.json(
        { success: false, error: 'Invitation has been revoked. Please contact your administrator for a new invitation.' },
        { status: 410 }
      );
    }

    // Check if token is expired
    if (isTokenExpired(user.inviteExpires)) {
      return NextResponse.json(
        { success: false, error: 'Token has expired. Please request a new invitation.' },
        { status: 410 }
      );
    }

    // Check if already completed
    if (user.onboardingComplete) {
      return NextResponse.json(
        { success: false, error: 'Account setup already completed' },
        { status: 400 }
      );
    }

    // ============================================
    // ROLE IMMUTABILITY ENFORCEMENT (CRITICAL SECURITY FIX)
    // ============================================
    // Role must ONLY come from existing user record or worksite_user join table
    // Client-sent role values are IGNORED to prevent privilege escalation
    
    // Get role from worksite access (source of truth)
    const worksiteAccess = user.worksiteAccess[0];
    if (!worksiteAccess) {
      return NextResponse.json(
        { success: false, error: 'No worksite access found for this invitation' },
        { status: 400 }
      );
    }

    const assignedRole = worksiteAccess.role; // Role from database, not client

    // Log if client attempted to send role (security monitoring)
    if (body.role) {
      console.warn(`[SECURITY] User ${user.email} attempted to send role in onboarding request. Ignored. Assigned role: ${assignedRole}`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Update user with completed information
    // NOTE: Role is NOT updated here - it remains in WorksiteUser table
    console.log('[ONBOARD POST] Updating user:', user.id, user.email);
    
    // Get the worksiteId from worksiteAccess to set as primary
    const primaryWorksiteId = worksiteAccess?.worksiteId || null;
    
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name.trim(),
        phoneNumber: phone?.trim() || null, // Schema uses phoneNumber, not phone
        password: hashedPassword,
        isActivated: true,
        onboardingComplete: true,
        inviteToken: null, // Invalidate token (single-use)
        inviteExpires: null,
        worksiteId: primaryWorksiteId // Set primary worksite so they land on the correct one
        // Role is NOT changed - it remains in WorksiteUser table
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActivated: true,
        onboardingComplete: true
      }
    });

    // Runtime assertion: Verify role was not changed
    const verifyWorksiteAccess = await prisma.worksiteUser.findUnique({
      where: {
        userId_worksiteId: {
          userId: updatedUser.id,
          worksiteId: worksiteAccess.worksiteId
        }
      },
      select: {
        role: true
      }
    });

    if (verifyWorksiteAccess && verifyWorksiteAccess.role !== assignedRole) {
      console.error(`[SECURITY] CRITICAL: Role changed during onboarding! Expected: ${assignedRole}, Got: ${verifyWorksiteAccess.role}`);
      // Don't fail the request, but log the critical error
    }

    // Create audit log for onboarding completion
    await prisma.auditLog.create({
      data: {
        userId: updatedUser.id,
        action: 'USER_ONBOARDING_COMPLETED',
        entity: 'USER',
        entityId: updatedUser.id,
        metadata: {
          entityName: updatedUser.name || updatedUser.email,
          severity: 'INFO',
          result: 'SUCCESS',
          details: { email: updatedUser.email, completedAt: new Date().toISOString() },
        }
      }
    }).catch(err => {
      console.error('Failed to create audit log:', err);
    });

    return NextResponse.json({
      success: true,
      message: 'Account setup completed successfully',
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name
      }
    });
  } catch (error: any) {
    console.error('[ONBOARD POST] ❌ Error completing onboarding:', error);
    console.error('[ONBOARD POST] Error name:', error.name);
    console.error('[ONBOARD POST] Error message:', error.message);
    console.error('[ONBOARD POST] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: 'Failed to complete account setup', details: error.message },
      { status: 500 }
    );
  }
}


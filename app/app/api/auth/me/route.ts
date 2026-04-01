import { NextRequest, NextResponse } from 'next/server';
import { getCachedSession } from '@/app/lib/session-cache';
import { prisma } from '@/app/lib/prisma';

/**
 * GET /api/auth/me
 * Get current user information with correct role from WorksiteUser
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getCachedSession(request);
    
    if (!session || !session.user) {
      // For development, return a mock user
      // In production, this should return 401
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            id: 'dev-user-1',
            name: 'Development User',
            email: 'dev@nexxau.com',
            role: 'SUPER_ADMIN',
            image: null
          }
        });
      }
      
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    if (!userId) {
      return NextResponse.json({
        success: true,
        data: session.user
      });
    }

    // Fetch user with worksiteAccess to get the correct role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        worksiteAccess: {
          include: {
            worksite: {
              select: {
                id: true,
                name: true,
                companyId: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc' // Most recent first
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
      return NextResponse.json({
        success: true,
        data: session.user
      });
    }

    // Determine the correct role and worksite
    // Priority: 1) Primary worksiteId, 2) First worksiteAccess, 3) Global role
    let effectiveRole = user.role;
    let primaryWorksiteId = user.worksiteId;
    let primaryWorksite = null;

    // If user has a primary worksiteId, use that worksite's role
    if (user.worksiteId && user.worksiteAccess.length > 0) {
      const primaryAccess = user.worksiteAccess.find(wa => wa.worksiteId === user.worksiteId);
      if (primaryAccess) {
        effectiveRole = primaryAccess.role;
        primaryWorksite = primaryAccess.worksite;
      }
    } else if (user.worksiteAccess.length > 0) {
      // Use the most recent worksiteAccess (the one they were invited to)
      const mostRecentAccess = user.worksiteAccess[0];
      effectiveRole = mostRecentAccess.role;
      primaryWorksiteId = mostRecentAccess.worksiteId;
      primaryWorksite = mostRecentAccess.worksite;
      
      // Update user's primary worksiteId if not set
      if (!user.worksiteId && primaryWorksiteId) {
        await prisma.user.update({
          where: { id: userId },
          data: { worksiteId: primaryWorksiteId }
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        ...session.user,
        role: effectiveRole,
        worksiteId: primaryWorksiteId,
        companyId: user.companyId || primaryWorksite?.companyId,
        worksiteAccess: user.worksiteAccess.map(wa => ({
          worksiteId: wa.worksiteId,
          role: wa.role,
          worksite: wa.worksite
        }))
      }
    });
  } catch (error: any) {
    console.error('Error fetching current user:', error);
    
    // Fallback for development
    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        success: true,
        data: {
          id: 'dev-user-1',
          name: 'Development User',
          email: 'dev@nexxau.com',
          role: 'SUPER_ADMIN',
          image: null
        }
      });
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user', details: error.message },
      { status: 500 }
    );
  }
}


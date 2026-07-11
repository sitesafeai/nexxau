import { NextRequest, NextResponse } from 'next/server';
import { sessionManager } from '@/app/lib/session-manager';
import { jwtManager } from '@/app/lib/jwt';
import { rateLimitMiddleware, authRateLimit } from '@/app/lib/rate-limit';
import { securityMiddleware, addSecurityHeaders } from '@/app/lib/security';
import { writeAuditLog } from '@/app/lib/audit';
import { prisma } from '@/app/lib/prisma';

export async function POST(request: NextRequest) {
  // Apply security middleware
  const securityCheck = securityMiddleware(request);
  if (securityCheck) return securityCheck;

  // Apply rate limiting
  const rateLimitCheck = rateLimitMiddleware(authRateLimit, request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const { logoutAll = false } = await request.json();

    // Get session from request
    const session = sessionManager.getSessionFromRequest(request);
    
    if (session) {
      if (logoutAll) {
        // Invalidate all user sessions
        await sessionManager.invalidateUserSessions(session.userId);
      } else {
        // Invalidate current session only
        await sessionManager.invalidateSession(session.id);
      }

      // Look up worksiteId so the event shows in the right worksite's User Activity tab
      const dbUser = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { worksiteId: true },
      }).catch(() => null);

      await writeAuditLog({
        userId: session.userId,
        worksiteId: dbUser?.worksiteId || null,
        action: logoutAll ? 'USER_LOGOUT_ALL' : 'USER_LOGOUT',
        entity: 'USER',
        entityId: session.userId,
        severity: 'INFO',
        result: 'SUCCESS',
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        userAgent: request.headers.get('user-agent'),
      });
    }

    // Clear cookies
    const response = NextResponse.json({
      success: true,
      message: logoutAll ? 'All sessions logged out' : 'Logged out successfully'
    });

    // Clear authentication cookies
    response.cookies.set('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    response.cookies.set('refreshToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    response.cookies.set('sessionId', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 0
    });

    // Add security headers
    addSecurityHeaders(response);

    return response;

  } catch (error) {
    console.error('Logout failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Apply security middleware
  const securityCheck = securityMiddleware(request);
  if (securityCheck) return securityCheck;

  try {
    // Get current session
    const session = sessionManager.getSessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json(
        { error: 'No active session' },
        { status: 401 }
      );
    }

    // Return session info
    return NextResponse.json({
      success: true,
      session: {
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity,
        isActive: session.isActive,
        location: session.location
      }
    });

  } catch (error) {
    console.error('Session info retrieval failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

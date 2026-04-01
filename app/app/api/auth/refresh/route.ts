import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { jwtManager } from '@/lib/jwt';
import { rateLimitMiddleware, authRateLimit } from '@/lib/rate-limit';
import { securityMiddleware, addSecurityHeaders } from '@/lib/security';

export async function POST(request: NextRequest) {
  // Apply security middleware
  const securityCheck = securityMiddleware(request);
  if (securityCheck) return securityCheck;

  // Apply rate limiting
  const rateLimitCheck = rateLimitMiddleware(authRateLimit, request);
  if (rateLimitCheck) return rateLimitCheck;

  try {
    const { refreshToken } = await request.json();

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Refresh token required' },
        { status: 400 }
      );
    }

    // Verify refresh token
    const payload = jwtManager.verifyRefreshToken(refreshToken);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid refresh token' },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        worksiteId: true,
        companyId: true,
        isActivated: true,
        approved: true
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is activated and approved
    if (!user.isActivated || !user.approved) {
      return NextResponse.json(
        { error: 'Account not activated or approved' },
        { status: 403 }
      );
    }

    // Generate new access token
    const newAccessToken = jwtManager.generateAccessToken({
      userId: user.id,
      email: user.email || '',
      role: user.role,
      worksiteId: user.worksiteId || undefined,
      companyId: user.companyId || undefined
    });

    // Generate new refresh token
    const newRefreshToken = jwtManager.generateRefreshToken({
      userId: user.id,
      tokenVersion: payload.tokenVersion
    });

    // Update user's last login
    await prisma.user.update({
      where: { id: user.id },
      data: { updatedAt: new Date() }
    });

    const response = NextResponse.json({
      success: true,
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 15 * 60, // 15 minutes
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        worksiteId: user.worksiteId,
        companyId: user.companyId
      }
    });

    // Add security headers
    addSecurityHeaders(response);

    // Set secure cookies
    response.cookies.set('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 // 15 minutes
    });

    response.cookies.set('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    });

    return response;

  } catch (error) {
    console.error('Token refresh failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

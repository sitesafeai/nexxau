import { NextRequest, NextResponse } from 'next/server';
import { mfaManager } from '@/lib/mfa';
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
    const token = jwtManager.extractTokenFromRequest(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const payload = jwtManager.verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      );
    }

    const { code, method, action } = await request.json();

    if (!code || !method) {
      return NextResponse.json(
        { error: 'Code and method required' },
        { status: 400 }
      );
    }

    let verified = false;

    if (method === 'totp') {
      verified = await mfaManager.verifyTOTP(payload.userId, code);
    } else if (method === 'sms' || method === 'email') {
      verified = await mfaManager.verifyMFACode(payload.userId, code, method);
    } else if (method === 'backup') {
      verified = await mfaManager.verifyBackupCode(payload.userId, code);
    } else {
      return NextResponse.json(
        { error: 'Invalid verification method' },
        { status: 400 }
      );
    }

    if (!verified) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    // If enabling MFA, enable it now
    if (action === 'enable' && method === 'totp') {
      await mfaManager.enableMFA(payload.userId);
    }

    const response = NextResponse.json({
      success: true,
      message: 'Verification successful'
    });

    addSecurityHeaders(response);
    return response;

  } catch (error) {
    console.error('MFA verification failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

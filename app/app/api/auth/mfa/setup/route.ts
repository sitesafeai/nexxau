import { NextRequest, NextResponse } from 'next/server';
import { mfaManager } from '@/app/lib/mfa';
import { jwtManager } from '@/app/lib/jwt';
import { rateLimitMiddleware, authRateLimit } from '@/app/lib/rate-limit';
import { securityMiddleware, addSecurityHeaders } from '@/app/lib/security';

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

    const { method } = await request.json();

    if (method === 'totp') {
      // Setup TOTP
      const setup = await mfaManager.setupTOTP(payload.userId, payload.email);
      
      const response = NextResponse.json({
        success: true,
        method: 'totp',
        setup
      });

      addSecurityHeaders(response);
      return response;
    }

    if (method === 'sms') {
      const { phoneNumber } = await request.json();
      
      if (!phoneNumber) {
        return NextResponse.json(
          { error: 'Phone number required' },
          { status: 400 }
        );
      }

      const code = await mfaManager.sendSMSCode(payload.userId, phoneNumber);
      
      const response = NextResponse.json({
        success: true,
        method: 'sms',
        message: 'SMS code sent'
      });

      addSecurityHeaders(response);
      return response;
    }

    if (method === 'email') {
      const code = await mfaManager.sendEmailCode(payload.userId, payload.email);
      
      const response = NextResponse.json({
        success: true,
        method: 'email',
        message: 'Email code sent'
      });

      addSecurityHeaders(response);
      return response;
    }

    return NextResponse.json(
      { error: 'Invalid MFA method' },
      { status: 400 }
    );

  } catch (error) {
    console.error('MFA setup failed:', error);
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

    // Get user MFA methods
    const methods = await mfaManager.getUserMFAMethods(payload.userId);
    
    const response = NextResponse.json({
      success: true,
      methods
    });

    addSecurityHeaders(response);
    return response;

  } catch (error) {
    console.error('MFA methods retrieval failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

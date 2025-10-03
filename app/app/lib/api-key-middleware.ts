import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyManager } from './api-key-manager';

export interface ApiKeyAuthResult {
  isAuthenticated: boolean;
  user?: any;
  apiKey?: any;
  permissions?: any;
  rateLimit?: {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  };
}

/**
 * Middleware to authenticate API key requests
 */
export async function authenticateApiKey(request: NextRequest): Promise<ApiKeyAuthResult> {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!apiKey) {
    return { isAuthenticated: false };
  }

  // Validate API key
  const validation = await ApiKeyManager.validateApiKey(apiKey);
  if (!validation.isValid) {
    return { isAuthenticated: false };
  }

  // Check rate limit
  const rateLimit = await ApiKeyManager.checkRateLimit(apiKey);
  if (!rateLimit.allowed) {
    return {
      isAuthenticated: false,
      rateLimit,
    };
  }

  // Update usage
  await ApiKeyManager.updateUsage(apiKey);

  return {
    isAuthenticated: true,
    user: validation.user,
    apiKey: validation.apiKey,
    permissions: validation.apiKey.permissions,
    rateLimit,
  };
}

/**
 * Middleware to check API key permissions
 */
export function checkApiKeyPermission(apiKey: any, action: string, resource: string): boolean {
  return ApiKeyManager.hasPermission(apiKey, action, resource);
}

/**
 * API key authentication middleware
 */
export function withApiKeyAuth(handler: (request: NextRequest, auth: ApiKeyAuthResult) => Promise<NextResponse>) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const auth = await authenticateApiKey(request);
    
    if (!auth.isAuthenticated) {
      return NextResponse.json(
        { 
          error: 'Invalid or expired API key',
          code: 'INVALID_API_KEY'
        },
        { status: 401 }
      );
    }

    if (auth.rateLimit && !auth.rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          rateLimit: {
            remaining: auth.rateLimit.remaining,
            resetTime: auth.rateLimit.resetTime,
          },
        },
        { status: 429 }
      );
    }

    return handler(request, auth);
  };
}

/**
 * API key permission middleware
 */
export function withApiKeyPermission(
  action: string,
  resource: string,
  handler: (request: NextRequest, auth: ApiKeyAuthResult) => Promise<NextResponse>
) {
  return withApiKeyAuth(async (request: NextRequest, auth: ApiKeyAuthResult) => {
    if (!checkApiKeyPermission(auth.apiKey, action, resource)) {
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          required: { action, resource },
        },
        { status: 403 }
      );
    }

    return handler(request, auth);
  });
}

/**
 * Rate limit headers middleware
 */
export function addRateLimitHeaders(response: NextResponse, rateLimit: any) {
  if (rateLimit) {
    response.headers.set('X-RateLimit-Limit', rateLimit.rateLimit?.toString() || '1000');
    response.headers.set('X-RateLimit-Remaining', rateLimit.remaining?.toString() || '0');
    response.headers.set('X-RateLimit-Reset', rateLimit.resetTime?.getTime().toString() || '0');
  }
  return response;
}

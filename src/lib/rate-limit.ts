import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// In-memory cache for rate limiting
const ipCache = new Map<string, { count: number; lastRequest: number }>();

/**
 * Check if a request should be rate limited
 * @param identifier The identifier to rate limit (e.g., 'signup:ip')
 * @param limit Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns boolean indicating if the request should be allowed
 */
function checkRateLimit(identifier: string, limit: number = 5, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const entry = ipCache.get(identifier);

  if (!entry || now - entry.lastRequest > windowMs) {
    ipCache.set(identifier, { count: 1, lastRequest: now });
    return true;
  }

  if (entry.count < limit) {
    ipCache.set(identifier, { count: entry.count + 1, lastRequest: now });
    return true;
  }

  return false;
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * @param handler The API route handler to wrap
 * @param key The identifier for rate limiting (e.g., 'signup', 'login')
 * @param options Rate limiting options
 */
export function withRateLimit<T>(
  handler: (req: Request) => Promise<NextResponse<T>>,
  key: string,
  options: { limit: number; window: number } = { limit: 5, window: 60 }
) {
  return async function (req: Request): Promise<NextResponse<T | { error: string }>> {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const identifier = `${key}:${ip}`;
    
    if (!checkRateLimit(identifier, options.limit, options.window * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      );
    }

    return handler(req);
  };
}

export function withRateLimitMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  key: string,
  options = { limit: 10, window: 60 } // 10 requests per minute by default
) {
  return async function rateLimitedHandler(req: NextRequest) {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();
    const windowKey = `${ip}:${key}`;
    const windowData = rateLimitStore.get(windowKey);

    // Initialize or reset window if needed
    if (!windowData || now > windowData.resetTime) {
      rateLimitStore.set(windowKey, {
        count: 1,
        resetTime: now + options.window * 1000,
      });
    } else if (windowData.count >= options.limit) {
      // Rate limit exceeded
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((windowData.resetTime - now) / 1000).toString(),
        },
      });
    } else {
      // Increment counter
      windowData.count++;
      rateLimitStore.set(windowKey, windowData);
    }

    // Clean up old entries periodically
    if (Math.random() < 0.1) { // 10% chance to clean up
      for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }

    return handler(req);
  };
} 
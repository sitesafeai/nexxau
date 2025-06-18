import { NextRequest, NextResponse } from 'next/server';

// In-memory store for rate limiting counters
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if a request identified by `identifier` should be allowed under rate limiting.
 * @param identifier Unique key (e.g. 'signup:IP') to track rate limit count
 * @param limit Maximum allowed requests in the window
 * @param windowMs Time window in milliseconds
 * @returns true if allowed, false if limit exceeded
 */
function checkRateLimit(identifier: string, limit: number = 5, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || now > entry.resetTime) {
    // No entry or window expired — start new window
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count < limit) {
    // Increment count within window
    entry.count++;
    rateLimitStore.set(identifier, entry);
    return true;
  }

  // Limit exceeded
  return false;
}

/**
 * Higher-order function to wrap API handlers with rate limiting.
 * @param handler API route handler function (req: Request) => Promise<NextResponse<T>>
 * @param key Identifier prefix for rate limiting (e.g. 'signup')
 * @param options Rate limiting options: limit (requests) and window (seconds)
 * @returns Wrapped handler function with rate limiting applied
 */
export function withRateLimit<T>(
  handler: (req: Request) => Promise<NextResponse<T>>,
  key: string,
  options: { limit: number; window: number } = { limit: 5, window: 60 }
): (req: Request) => Promise<NextResponse<T>> {
  return async function (req: Request): Promise<NextResponse<T>> {
    // Get client IP (supports proxies via x-forwarded-for header)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const identifier = `${key}:${ip}`;

    if (!checkRateLimit(identifier, options.limit, options.window * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests' } as unknown as T,
        {
          status: 429,
          headers: {
            'Retry-After': options.window.toString(),
          },
        }
      );
    }

    return handler(req);
  };
}

/**
 * Middleware variant for NextRequest / NextResponse handlers with rate limiting.
 * (Optional, in case you want to use Next.js middleware-style handlers)
 * @param handler Next.js middleware handler
 * @param key Rate limiting key prefix
 * @param options limit and window (seconds)
 * @returns Rate limited middleware handler
 */
export function withRateLimitMiddleware(
  handler: (req: NextRequest) => Promise<NextResponse>,
  key: string,
  options: { limit: number; window: number } = { limit: 10, window: 60 }
) {
  return async function rateLimitedHandler(req: NextRequest): Promise<NextResponse> {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const now = Date.now();
    const windowKey = `${ip}:${key}`;
    const windowData = rateLimitStore.get(windowKey);

    if (!windowData || now > windowData.resetTime) {
      rateLimitStore.set(windowKey, {
        count: 1,
        resetTime: now + options.window * 1000,
      });
    } else if (windowData.count >= options.limit) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': Math.ceil((windowData.resetTime - now) / 1000).toString(),
        },
      });
    } else {
      windowData.count++;
      rateLimitStore.set(windowKey, windowData);
    }

    // Optional cleanup of expired entries (run randomly ~10% of the time)
    if (Math.random() < 0.1) {
      for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }

    return handler(req);
  };
}

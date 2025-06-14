import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory store for rate limiting
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function withRateLimit(
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
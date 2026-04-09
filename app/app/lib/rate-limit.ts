import { NextRequest, NextResponse } from 'next/server';
import { metrics } from './metrics';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  /** Prometheus label for rate_limit_rejections_total */
  name: string;
}

class RateLimiter {
  private requests: Map<string, { count: number; resetTime: number }> = new Map();
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
    
    // Clean up expired entries every minute
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.requests.entries()) {
        if (value.resetTime < now) {
          this.requests.delete(key);
        }
      }
    }, 60000);
  }

  private getKey(request: NextRequest): string {
    // Use IP address as the key
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
    return ip;
  }

  public check(request: NextRequest): { allowed: boolean; remaining: number; resetTime: number } {
    const key = this.getKey(request);
    const now = Date.now();
    const windowMs = this.config.windowMs;
    const max = this.config.max;

    const current = this.requests.get(key);
    
    if (!current || current.resetTime < now) {
      // First request or window expired
      this.requests.set(key, {
        count: 1,
        resetTime: now + windowMs
      });
      
      return {
        allowed: true,
        remaining: max - 1,
        resetTime: now + windowMs
      };
    }

    if (current.count >= max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: current.resetTime
      };
    }

    // Increment counter
    current.count++;
    this.requests.set(key, current);

    return {
      allowed: true,
      remaining: max - current.count,
      resetTime: current.resetTime
    };
  }
}

// Create rate limiter instances
export const apiRateLimit = new RateLimiter({
  name: 'api',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP, please try again later.'
});

export const authRateLimit = new RateLimiter({
  name: 'auth',
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: 'Too many authentication attempts, please try again later.'
});

export const detectionRateLimit = new RateLimiter({
  name: 'detection',
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 detection requests per minute
  message: 'Too many detection requests, please slow down.'
});

// Middleware function
export function rateLimitMiddleware(
  rateLimiter: RateLimiter,
  request: NextRequest
): NextResponse | null {
  const result = rateLimiter.check(request);
  
    if (!result.allowed) {
    try {
      metrics.rateLimitRejections.inc({ limiter: rateLimiter['config'].name });
    } catch {
      /* ignore metrics errors */
    }
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests, please try again later.',
        retryAfter: Math.ceil((result.resetTime - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': rateLimiter['config'].max.toString(),
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.resetTime.toString()
        }
      }
    );
  }

  return null;
}

// Helper function to add rate limit headers to response
export function addRateLimitHeaders(
  response: NextResponse,
  result: { allowed: boolean; remaining: number; resetTime: number },
  max: number
): NextResponse {
  response.headers.set('X-RateLimit-Limit', max.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toString());
  
  return response;
}

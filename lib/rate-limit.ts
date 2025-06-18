// In-memory cache for rate limiting
const ipCache = new Map<string, { count: number; lastRequest: number }>();

/**
 * Rate limiting middleware for API routes
 * @param ip The IP address to rate limit
 * @param limit Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns boolean indicating if the request should be allowed
 */
export function withRateLimit(ip: string, limit: number = 5, windowMs: number = 60_000): boolean {
  const now = Date.now();
  const entry = ipCache.get(ip);

  if (!entry || now - entry.lastRequest > windowMs) {
    ipCache.set(ip, { count: 1, lastRequest: now });
    return true;
  }

  if (entry.count < limit) {
    ipCache.set(ip, { count: entry.count + 1, lastRequest: now });
    return true;
  }

  return false;
}

/**
 * Higher-order function to wrap API route handlers with rate limiting
 * @param handler The API route handler to wrap
 * @param limit Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 */
export function rateLimit(
  handler: (req: Request) => Promise<Response>,
  limit: number = 5,
  windowMs: number = 60_000
) {
  return async (req: Request) => {
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    
    if (!withRateLimit(ip, limit, windowMs)) {
      return new Response(
        JSON.stringify({ error: 'Too many requests' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return handler(req);
  };
} 
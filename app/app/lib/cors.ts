import { NextRequest, NextResponse } from 'next/server';

const CORS_METHODS = 'GET,OPTIONS,PATCH,DELETE,POST,PUT';
const CORS_HEADERS =
  'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization';

function getAllowedOrigins(): string[] {
  return (process.env.ALLOWED_API_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Apply CORS headers to a response.
 *
 * Rules:
 *  - `Vary: Origin` is always set so caches don't serve the wrong origin's response.
 *  - If the request Origin is in ALLOWED_API_ORIGINS, echo it back as
 *    Access-Control-Allow-Origin.  We never reflect '*'.
 *  - If Origin is absent or not in the allowlist, no ACAO header is added
 *    (browser will block cross-origin requests to this endpoint).
 */
export function applyCors(request: NextRequest, response: NextResponse): NextResponse {
  const origin = request.headers.get('origin') ?? '';
  const allowedOrigins = getAllowedOrigins();

  response.headers.set('Vary', 'Origin');

  if (origin && allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Methods', CORS_METHODS);
    response.headers.set('Access-Control-Allow-Headers', CORS_HEADERS);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  return response;
}

/**
 * Handle an OPTIONS preflight and return a 204 with CORS headers.
 * Call this at the top of route handlers that need it, or let the
 * middleware handle it automatically for /api/* paths.
 */
export function handlePreflight(request: NextRequest): NextResponse {
  return applyCors(request, new NextResponse(null, { status: 204 }));
}

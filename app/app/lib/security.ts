import { NextRequest, NextResponse } from 'next/server';

// Security headers configuration
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' ws: wss:",
    "media-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'"
  ].join('; ')
};

// CORS configuration
export const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || 'http://localhost:3000',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Allow-Credentials': 'true',
  'Access-Control-Max-Age': '86400'
};

// Input validation patterns
export const validationPatterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  alphanumeric: /^[a-zA-Z0-9]+$/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  cameraId: /^[a-zA-Z0-9]{20,}$/,
  worksiteId: /^[a-zA-Z0-9]{20,}$/
};

// Sanitize input to prevent XSS
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

// Validate email format
export function isValidEmail(email: string): boolean {
  return validationPatterns.email.test(email);
}

// Validate phone number format
export function isValidPhone(phone: string): boolean {
  return validationPatterns.phone.test(phone);
}

// Validate UUID format
export function isValidUUID(uuid: string): boolean {
  return validationPatterns.uuid.test(uuid);
}

// Validate camera ID format
export function isValidCameraId(cameraId: string): boolean {
  return validationPatterns.cameraId.test(cameraId);
}

// Validate worksite ID format
export function isValidWorksiteId(worksiteId: string): boolean {
  return validationPatterns.worksiteId.test(worksiteId);
}

// Check if request is from allowed origin
export function isAllowedOrigin(origin: string): boolean {
  const allowedOrigins = [
    process.env.CORS_ORIGIN,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://your-domain.com'
  ].filter(Boolean);
  
  return allowedOrigins.includes(origin);
}

// Security middleware function
export function securityMiddleware(request: NextRequest): NextResponse | null {
  const origin = request.headers.get('origin');
  
  // Check CORS
  if (origin && !isAllowedOrigin(origin)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  // Check for suspicious patterns
  const url = request.url;
  const suspiciousPatterns = [
    /\.\.\//, // Directory traversal
    /<script/i, // Script injection
    /javascript:/i, // JavaScript protocol
    /on\w+=/i, // Event handlers
    /union\s+select/i, // SQL injection
    /drop\s+table/i, // SQL injection
    /delete\s+from/i, // SQL injection
    /insert\s+into/i, // SQL injection
    /update\s+set/i // SQL injection
  ];
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(url)) {
      console.warn('Suspicious request detected:', url);
      return new NextResponse('Bad Request', { status: 400 });
    }
  }
  
  return null;
}

// Add security headers to response
export function addSecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Add CORS headers to response
export function addCorsHeaders(response: NextResponse): NextResponse {
  Object.entries(corsHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  return response;
}

// Rate limiting by IP
const ipRequestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(request: NextRequest, maxRequests: number = 100, windowMs: number = 900000): boolean {
  const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
  const now = Date.now();
  
  const current = ipRequestCounts.get(ip);
  
  if (!current || current.resetTime < now) {
    ipRequestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false;
  }
  
  current.count++;
  ipRequestCounts.set(ip, current);
  return true;
}

// Clean up expired rate limit entries
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of ipRequestCounts.entries()) {
    if (data.resetTime < now) {
      ipRequestCounts.delete(ip);
    }
  }
}, 60000); // Clean up every minute

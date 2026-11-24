import { NextRequest, NextResponse } from 'next/server';
import { metricsCollector } from '@/app/lib/metrics';
import { securityMiddleware, addSecurityHeaders } from '@/app/lib/security';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function GET(request: NextRequest) {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  // Apply security middleware
  const securityCheck = securityMiddleware(request);
  if (securityCheck) return securityCheck;

  try {
    // Get metrics in Prometheus format
    const metrics = await metricsCollector.getMetrics();
    
    const response = new NextResponse(metrics, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

    // Add security headers
    addSecurityHeaders(response);

    return response;

  } catch (error) {
    console.error('Metrics collection failed:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

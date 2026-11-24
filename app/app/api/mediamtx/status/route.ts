/**
 * MediaMTX Status API
 * Checks MediaMTX service status
 */

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';
// MediaMTX service removed

export async function GET() {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  // MediaMTX service has been removed
  return NextResponse.json({
    success: false,
    running: false,
    healthy: false,
    message: 'MediaMTX service has been removed',
  }, { status: 410 }); // 410 Gone
}


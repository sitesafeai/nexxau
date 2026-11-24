/**
 * MediaMTX Start API
 * Starts MediaMTX service
 */

import { NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/app/lib/require-super-admin';

export async function POST() {
  // Not used by any screen. Locked to super admins (Nov 2026 audit): it was
  // reachable by anyone on the internet with no login.
  const superAdminGate = await requireSuperAdmin();
  if (!superAdminGate.ok) return superAdminGate.response;

  // MediaMTX service has been removed
  return NextResponse.json({
    success: false,
    message: 'MediaMTX service has been removed',
  }, { status: 410 }); // 410 Gone
}


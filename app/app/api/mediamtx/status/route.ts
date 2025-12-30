/**
 * MediaMTX Status API
 * Checks MediaMTX service status
 */

import { NextResponse } from 'next/server';
// MediaMTX service removed

export async function GET() {
  // MediaMTX service has been removed
  return NextResponse.json({
    success: false,
    running: false,
    healthy: false,
    message: 'MediaMTX service has been removed',
  }, { status: 410 }); // 410 Gone
}


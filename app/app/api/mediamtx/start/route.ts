/**
 * MediaMTX Start API
 * Starts MediaMTX service
 */

import { NextResponse } from 'next/server';

export async function POST() {
  // MediaMTX service has been removed
  return NextResponse.json({
    success: false,
    message: 'MediaMTX service has been removed',
  }, { status: 410 }); // 410 Gone
}


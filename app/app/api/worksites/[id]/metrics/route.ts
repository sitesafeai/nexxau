import { NextRequest, NextResponse } from 'next/server';
import { enforceWorksiteAccess } from '@/app/lib/worksite-access';
import { getWorksiteMetricsPayload } from '@/app/lib/worksite-metrics-payload';

/**
 * GET /api/worksites/[id]/metrics
 *
 * Returns aggregated metrics for a worksite.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: worksiteId } = await params;

    const denied = await enforceWorksiteAccess(request, worksiteId);
    if (denied) return denied;

    const payload = await getWorksiteMetricsPayload(worksiteId);
    if (!payload) {
      return NextResponse.json(
        { error: 'Worksite not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(payload);
  } catch (error: any) {
    console.error('[metrics] Full error:', error);
    console.error('[metrics] Stack:', error?.stack);
    console.error('[metrics] Message:', error?.message);
    return NextResponse.json(
      { error: 'Failed to fetch metrics', details: error?.message },
      { status: 500 }
    );
  }
}

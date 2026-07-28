/**
 * POST /api/workflows/test
 * Fires a workflow's actions against a synthetic test alert.
 * Used by the workflow builder "Test Workflow" button — actions run for real
 * (emails are actually sent) so the user can verify the configuration works.
 *
 * Body: { worksiteId, actions, triggerType }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { workflowEngine } from '@/app/lib/workflows/workflow-engine';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { worksiteId: string; actions: any[]; triggerType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { worksiteId, actions, triggerType } = body;
  if (!worksiteId || !Array.isArray(actions) || actions.length === 0) {
    return NextResponse.json({ error: 'worksiteId and actions required' }, { status: 400 });
  }

  // Synthetic test alert context
  const context = {
    alertId: `test-${Date.now()}`,
    worksiteId,
    timestamp: new Date(),
    alert: {
      id: `test-${Date.now()}`,
      worksiteId,
      title: '[TEST] Workflow Test Alert',
      violationType: triggerType || 'test',
      severity: 'HIGH',
      source: 'camera',
      status: 'offline',
      location: 'Test location',
      createdAt: new Date(),
      description: 'This is a test alert sent from the workflow builder to verify your workflow configuration.',
    },
  };

  try {
    const results = await workflowEngine.testActions(actions, context);
    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    console.error('[workflows/test] failed:', err.message);
    return NextResponse.json({ error: 'Test failed', details: err.message }, { status: 500 });
  }
}

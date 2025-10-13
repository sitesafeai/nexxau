import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { recoveryManager } from '../../../lib/error-recovery';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const activeRecoveries = recoveryManager.getActiveRecoveries();
    const workflows = recoveryManager.getWorkflows();

    // Format active recoveries for frontend
    const formattedRecoveries = Array.from(activeRecoveries.entries()).map(([id, context]) => ({
      id,
      name: `Recovery for ${context.errorType}`,
      status: context.attempts > 0 ? 'running' : 'active',
      progress: Math.round((context.completedSteps.length / (context.completedSteps.length + context.failedSteps.length)) * 100),
      steps: [
        {
          id: 'check-status',
          name: 'Check System Status',
          status: context.completedSteps.includes('check-status') ? 'completed' : 
                 context.failedSteps.includes('check-status') ? 'failed' : 'pending'
        },
        {
          id: 'execute-recovery',
          name: 'Execute Recovery Actions',
          status: context.completedSteps.includes('execute-recovery') ? 'completed' : 
                 context.failedSteps.includes('execute-recovery') ? 'failed' : 'pending'
        },
        {
          id: 'verify-recovery',
          name: 'Verify Recovery',
          status: context.completedSteps.includes('verify-recovery') ? 'completed' : 
                 context.failedSteps.includes('verify-recovery') ? 'failed' : 'pending'
        }
      ],
      startTime: context.startTime,
      endTime: context.attempts > 3 ? new Date() : undefined
    }));

    return NextResponse.json({
      success: true,
      data: formattedRecoveries
    });

  } catch (error) {
    console.error('Failed to fetch recovery workflows:', error);
    return NextResponse.json({ error: 'Failed to fetch recovery workflows' }, { status: 500 });
  }
}

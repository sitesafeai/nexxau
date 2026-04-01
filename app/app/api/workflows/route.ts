import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSession } from '@/lib/auth';

/**
 * GET /api/workflows
 * Get all workflows for a worksite
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const worksiteId = searchParams.get('worksiteId');

    const workflows = await prisma.workflow.findMany({
      where: worksiteId ? {
        OR: [
          { worksiteId },
          { worksiteId: null } // Include global workflows
        ]
      } : undefined,
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        worksite: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            executions: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: workflows
    });
  } catch (error: any) {
    console.error('[GET /api/workflows] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflows', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/workflows
 * Create a new workflow
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      worksiteId,
      name,
      description,
      type,
      triggerType,
      triggerConfig,
      actions,
      batchingEnabled = false,
      batchWindow = 5,
      rateLimitWindow = 120,
      priority = 1,
      enabled = true
    } = body;

    const workflow = await prisma.workflow.create({
      data: {
        worksiteId: worksiteId || null,
        userId: session.user.id,
        name,
        description,
        type,
        triggerType,
        triggerConfig: triggerConfig || {},
        actions: actions || [],
        batchingEnabled,
        batchWindow,
        rateLimitWindow,
        priority,
        enabled,
        createdBy: session.user.email || session.user.id
      }
    });

    console.log('[POST /api/workflows] Created workflow:', workflow.id);

    return NextResponse.json({
      success: true,
      data: workflow
    }, { status: 201 });
  } catch (error: any) {
    console.error('[POST /api/workflows] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create workflow', details: error.message },
      { status: 500 }
    );
  }
}


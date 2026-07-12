import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';
import { writeAuditLog } from '@/app/lib/audit';

/**
 * GET /api/workflows/:id
 * Get a specific workflow
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        worksite: {
          select: {
            id: true,
            name: true
          }
        },
        executions: {
          take: 10,
          orderBy: {
            startedAt: 'desc'
          }
        }
      }
    });

    if (!workflow) {
      return NextResponse.json(
        { success: false, error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: workflow
    });
  } catch (error: any) {
    console.error('[GET /api/workflows/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch workflow', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/workflows/:id
 * Update a workflow
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    if (body.triggerConfig !== undefined) updateData.triggerConfig = body.triggerConfig;
    if (body.actions !== undefined) updateData.actions = body.actions;
    if (body.batchingEnabled !== undefined) updateData.batchingEnabled = body.batchingEnabled;
    if (body.batchWindow !== undefined) updateData.batchWindow = body.batchWindow;
    if (body.rateLimitWindow !== undefined) updateData.rateLimitWindow = body.rateLimitWindow;
    if (body.priority !== undefined) updateData.priority = body.priority;

    const workflow = await prisma.workflow.update({
      where: { id },
      data: updateData
    });

    // Audit log (fire-and-forget)
    writeAuditLog({
      userId: session.user.id,
      worksiteId: workflow.worksiteId,
      action: 'RULE_UPDATED',
      entity: 'RULE',
      entityId: workflow.id,
      entityName: workflow.name,
      severity: 'INFO',
      result: 'SUCCESS',
      details: { enabled: workflow.enabled, type: workflow.type },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: workflow
    });
  } catch (error: any) {
    console.error('[PATCH /api/workflows/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update workflow', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflows/:id
 * Delete a workflow
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch before delete so we can capture name/worksiteId for audit
    const existing = await prisma.workflow.findUnique({
      where: { id },
      select: { name: true, worksiteId: true, type: true },
    }).catch(() => null);

    await prisma.workflow.delete({
      where: { id }
    });

    // Audit log (fire-and-forget)
    writeAuditLog({
      userId: session.user.id,
      worksiteId: existing?.worksiteId ?? null,
      action: 'RULE_DELETED',
      entity: 'RULE',
      entityId: id,
      entityName: existing?.name || id,
      severity: 'WARNING',
      result: 'SUCCESS',
      details: { type: existing?.type },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      message: 'Workflow deleted successfully'
    });
  } catch (error: any) {
    console.error('[DELETE /api/workflows/:id] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete workflow', details: error.message },
      { status: 500 }
    );
  }
}


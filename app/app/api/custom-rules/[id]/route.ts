import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/lib/logger';
import { retryDatabaseOperation } from '@/app/lib/retry';

// GET /api/custom-rules/[id] - Get a specific rule
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const rule = await prisma.customRule.findUnique({
      where: { id },
      include: {
        camera: {
          select: {
            id: true,
            name: true,
            location: true
          }
        },
        worksite: {
          select: {
            id: true,
            name: true,
            worksiteName: true
          }
        },
        ruleViolations: {
          orderBy: { createdAt: 'desc' },
          take: 10,
          select: {
            id: true,
            detectedAt: true,
            severity: true,
            status: true
          }
        },
        _count: {
          select: {
            ruleViolations: true,
            ruleTriggers: true
          }
        }
      }
    });

    if (!rule) {
      return NextResponse.json(
        { success: false, error: 'Rule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...rule,
        violationCount: rule._count.ruleViolations,
        triggerCount: rule._count.ruleTriggers,
        recentViolations: rule.ruleViolations
      }
    });

  } catch (error) {
    logger.error('Failed to fetch custom rule', { ruleId: params.id }, error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}

// PATCH /api/custom-rules/[id] - Update a rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log(`[Custom Rules API] PATCH request for rule ${id}:`, body);

    // Build update data - only include fields that are provided
    const updateData: any = {
      updatedAt: new Date()
    };

    // Only update fields that are explicitly provided
    if (body.isActive !== undefined) {
      updateData.isActive = body.isActive;
      console.log(`[Custom Rules API] Updating isActive to: ${body.isActive}`);
    }
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.severity !== undefined) updateData.severity = body.severity;
    if (body.confidenceThreshold !== undefined) updateData.confidenceThreshold = body.confidenceThreshold;
    if (body.smsEnabled !== undefined) updateData.smsEnabled = body.smsEnabled;
    if (body.emailEnabled !== undefined) updateData.emailEnabled = body.emailEnabled;
    if (body.dashboardEnabled !== undefined) updateData.dashboardEnabled = body.dashboardEnabled;
    if (body.smsRecipients !== undefined) updateData.smsRecipients = body.smsRecipients;
    if (body.emailRecipients !== undefined) updateData.emailRecipients = body.emailRecipients;
    if (body.triggerConditions !== undefined) updateData.triggerConditions = body.triggerConditions;
    if (body.alertSettings !== undefined) updateData.alertSettings = body.alertSettings;
    if (body.detectionCriteria !== undefined) updateData.detectionCriteria = body.detectionCriteria;

    const rule = await retryDatabaseOperation(async () => {
      return await prisma.customRule.update({
        where: { id },
        data: updateData,
        include: {
          camera: {
            select: {
              id: true,
              name: true,
              location: true
            }
          },
          worksite: {
            select: {
              id: true,
              name: true,
              worksiteName: true
            }
          }
        }
      });
    }, 'update-custom-rule');

    console.log(`[Custom Rules API] Rule ${id} updated successfully. New isActive: ${rule.isActive}`);
    logger.info(`Custom rule updated: ${rule.name}`, { ruleId: id, isActive: rule.isActive });

    // Notify AI service
    notifyAIService(rule, 'update');

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Rule updated successfully'
    });

  } catch (error) {
    console.error(`[Custom Rules API] Failed to update rule ${params.id}:`, error);
    logger.error('Failed to update custom rule', { ruleId: params.id }, error as Error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// DELETE /api/custom-rules/[id] - Delete a rule
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    await retryDatabaseOperation(async () => {
      return await prisma.customRule.delete({
        where: { id }
      });
    }, 'delete-custom-rule');

    logger.info('Custom rule deleted', { ruleId: id });

    // Notify AI service to remove rule
    notifyAIService({ id }, 'delete');

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete custom rule', { ruleId: params.id }, error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete rule' },
      { status: 500 }
    );
  }
}

// Helper to notify AI service
async function notifyAIService(rule: any, action: 'create' | 'update' | 'delete' = 'create') {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/rules/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule }),
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      logger.info(`AI service notified of rule ${action}`, { ruleId: rule.id });
    }
  } catch (error) {
    logger.warn(`Failed to notify AI service of rule ${action}`, { 
      ruleId: rule.id 
    }, error as Error);
  }
}

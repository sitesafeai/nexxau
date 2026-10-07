import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/lib/logger';
import { retryDatabaseOperation } from '@/app/lib/retry';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { writeAuditLog } from '@/app/lib/audit';

// GET /api/custom-rules/[id] - Get a specific rule
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
    const { id: ruleId } = await params;
    logger.error('Failed to fetch custom rule', { ruleId }, error as Error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rule' },
      { status: 500 }
    );
  }
}

// PATCH /api/custom-rules/[id] - Update a rule
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
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
    if (body.cameraId !== undefined) updateData.cameraId = body.cameraId || null;
    if (body.cameraIds !== undefined) updateData.cameraIds = Array.isArray(body.cameraIds) ? body.cameraIds.filter(Boolean) : [];

    // Snapshot the fields that change whether and how this rule fires, BEFORE the
    // update. The audit entry used to record only { isActive, ruleSeverity }, which
    // can't answer the question anyone actually asks later: "this rule stopped
    // catching things — what changed and who changed it?" Dropping
    // confidenceThreshold or repointing objectClass/zoneId are exactly the edits that
    // silently stop alerts, and they were invisible.
    const AUDITED_FIELDS = [
      'name', 'isActive', 'severity', 'confidenceThreshold', 'cooldownMinutes',
      'detectionCriteria', 'cameraId', 'cameraIds',
      'smsEnabled', 'emailEnabled', 'dashboardEnabled',
    ] as const;
    const beforeRule = await prisma.customRule.findUnique({ where: { id } });

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

    // Diff only the fields that affect firing behaviour, so the log stays readable.
    const before: Record<string, unknown> = {};
    const after: Record<string, unknown> = {};
    if (beforeRule) {
      for (const f of AUDITED_FIELDS) {
        const o = (beforeRule as Record<string, unknown>)[f];
        const n = (rule as Record<string, unknown>)[f];
        if (JSON.stringify(o) !== JSON.stringify(n)) {
          before[f] = o;
          after[f] = n;
        }
      }
    }
    const changedFields = Object.keys(after);

    // Loosening detection is the dangerous direction: a lower threshold floods
    // alerts, but deactivating a rule or raising its threshold stops them silently.
    // Flag those so they stand out when someone scans the log months later.
    const deactivated = 'isActive' in after && after.isActive === false;
    const raisedThreshold =
      'confidenceThreshold' in after &&
      Number(after.confidenceThreshold) > Number(before.confidenceThreshold ?? 0);
    const auditSeverity: 'INFO' | 'WARNING' =
      deactivated || raisedThreshold ? 'WARNING' : 'INFO';

    // Audit log (fire-and-forget)
    getServerSession(authOptions).then(session => {
      writeAuditLog({
        userId: session?.user?.id,
        worksiteId: rule.worksiteId,
        action: 'RULE_UPDATED',
        entity: 'RULE',
        entityId: rule.id,
        entityName: rule.name,
        severity: auditSeverity,
        result: 'SUCCESS',
        details: {
          isActive: rule.isActive,
          ruleSeverity: rule.severity,
          changedFields,
          // Spelled out because "RULE_UPDATED" alone tells a reader nothing.
          summary: changedFields.length
            ? `Changed: ${changedFields.join(', ')}`
            : 'No audited field changed',
        },
        changes: changedFields.length ? { old: before, new: after } : undefined,
      });
    }).catch(() => {});

    // Notify AI service
    notifyAIService(rule, 'update');

    return NextResponse.json({
      success: true,
      data: rule,
      message: 'Rule updated successfully'
    });

  } catch (error) {
    console.error(`[Custom Rules API] Failed to update rule ${id}:`, error);
    logger.error('Failed to update custom rule', { ruleId: id }, error as Error);
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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    // Fetch before delete so we can capture name/worksiteId for audit
    const existingRule = await prisma.customRule.findUnique({
      where: { id },
      select: { name: true, worksiteId: true, ruleType: true, severity: true },
    }).catch(() => null);

    await retryDatabaseOperation(async () => {
      return await prisma.customRule.delete({
        where: { id }
      });
    }, 'delete-custom-rule');

    logger.info('Custom rule deleted', { ruleId: id });

    // Audit log (fire-and-forget)
    getServerSession(authOptions).then(session => {
      writeAuditLog({
        userId: session?.user?.id,
        worksiteId: existingRule?.worksiteId ?? null,
        action: 'RULE_DELETED',
        entity: 'RULE',
        entityId: id,
        entityName: existingRule?.name || id,
        severity: 'WARNING',
        result: 'SUCCESS',
        details: { ruleType: existingRule?.ruleType, ruleSeverity: existingRule?.severity },
      });
    }).catch(() => {});

    // Notify AI service to remove rule
    notifyAIService({ id }, 'delete');

    return NextResponse.json({
      success: true,
      message: 'Rule deleted successfully'
    });

  } catch (error) {
    logger.error('Failed to delete custom rule', { ruleId: id }, error as Error);
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

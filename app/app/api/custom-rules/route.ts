import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/lib/logger';
import { retryDatabaseOperation } from '@/app/lib/retry';
import {
  enforceWorksiteAccess,
  enforceWorksiteAdminAccess,
} from '@/app/lib/worksite-access';
import { getCachedSession } from '@/app/lib/session-cache';
import { normalizeRole } from '@/app/lib/roles';

async function getWorksiteIdForCamera(cameraId: string) {
  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    select: { worksiteId: true },
  });

  return camera?.worksiteId || null;
}

async function getCustomRuleListScope(request: NextRequest) {
  const session = await getCachedSession(request);
  if (!session?.user) {
    return {
      denied: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    };
  }

  const role = normalizeRole(session.user.role);
  if (role === 'SUPER_ADMIN') {
    return { where: {} };
  }

  const userEmail = session.user.email;
  const sessionUserId = (session.user as { id?: string }).id;
  const select = {
    id: true,
    companyId: true,
    worksiteAccess: {
      select: { worksiteId: true },
    },
  } as const;

  let user = userEmail
    ? await prisma.user.findUnique({
        where: { email: userEmail },
        select,
      })
    : null;

  if (!user && sessionUserId) {
    user = await prisma.user.findUnique({
      where: { id: sessionUserId },
      select,
    });
  }

  if (!user) {
    return {
      denied: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  const accessibleWorksiteIds = user.worksiteAccess.map(access => access.worksiteId);
  const orFilters: any[] = [];

  if (accessibleWorksiteIds.length > 0) {
    orFilters.push({ worksiteId: { in: accessibleWorksiteIds } });
  }

  if (user.companyId) {
    orFilters.push({ worksite: { companyId: user.companyId } });
  }

  if (orFilters.length === 0) {
    return { where: { id: '__no_access__' } };
  }

  return { where: { OR: orFilters } };
}

// GET /api/custom-rules - Get all custom rules
export async function GET(request: NextRequest) {
  try {
    console.log('[API /custom-rules] GET request received at:', new Date().toISOString());
    console.log('[API /custom-rules] Request URL:', request.url);
    
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const cameraId = searchParams.get('cameraId');
    const worksiteId = searchParams.get('worksiteId');

    console.log('[API /custom-rules] Query params:', { activeOnly, worksiteId, cameraId });

    let authorizedWorksiteId = worksiteId;
    let accessScopeWhere: any = null;
    if (!authorizedWorksiteId && cameraId) {
      authorizedWorksiteId = await getWorksiteIdForCamera(cameraId);
      if (!authorizedWorksiteId) {
        return NextResponse.json(
          { success: false, error: 'Camera not found' },
          { status: 404 }
        );
      }
    }

    if (!authorizedWorksiteId) {
      const scope = await getCustomRuleListScope(request);
      if ('denied' in scope) return scope.denied;
      accessScopeWhere = scope.where;
    } else {
      const denied = await enforceWorksiteAccess(request, authorizedWorksiteId);
      if (denied) return denied;
    }
    
    const rules = await retryDatabaseOperation(async () => {
      const whereClause: any = {};
      
      if (activeOnly) {
        whereClause.isActive = true;
      }
      
      Object.assign(whereClause, accessScopeWhere || { worksiteId: authorizedWorksiteId });
      console.log('[Custom Rules API] Filtering custom rules:', whereClause);
      
      if (cameraId) {
        whereClause.OR = [
          { cameraId },
          { cameraId: null } // Global rules
        ];
      }
      
      console.log('[Custom Rules API] Where clause:', JSON.stringify(whereClause, null, 2));
      
      return await prisma.customRule.findMany({
        where: whereClause,
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
        _count: {
          select: {
            ruleViolations: true,
            ruleTriggers: true
          }
        }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
    }, 'fetch-custom-rules');

    const formattedRules = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      category: rule.category,
      severity: rule.severity,
      isActive: rule.isActive,
      priority: rule.priority,
      detectionCriteria: rule.detectionCriteria,
      triggerConditions: rule.triggerConditions,
      alertSettings: rule.alertSettings,
      timeConstraints: rule.timeConstraints,
      locationConstraints: rule.locationConstraints,
      aiModelType: rule.aiModelType,
      confidenceThreshold: rule.confidenceThreshold,
      smsEnabled: rule.smsEnabled,
      emailEnabled: rule.emailEnabled,
      dashboardEnabled: rule.dashboardEnabled,
      smsRecipients: rule.smsRecipients,
      emailRecipients: rule.emailRecipients,
      cameraId: rule.cameraId,
      camera: rule.camera,
      worksiteId: rule.worksiteId,
      worksite: rule.worksite,
      violationCount: rule._count.ruleViolations,
      triggerCount: rule._count.ruleTriggers,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString()
    }));

    console.log('[Custom Rules API] Found rules:', formattedRules.length);
    console.log('[Custom Rules API] Rules details:', formattedRules.map(r => ({
      id: r.id,
      name: r.name,
      worksiteId: r.worksiteId,
      isActive: r.isActive
    })));
    
    logger.info(`Fetched ${formattedRules.length} custom rules`, { 
      activeOnly, 
      worksiteId: worksiteId || undefined,
      cameraId: cameraId || undefined 
    });

    return NextResponse.json({
      success: true,
      data: formattedRules,
      count: formattedRules.length
    });

  } catch (error: any) {
    console.error('[API /custom-rules] ❌ Error:', error);
    console.error('[API /custom-rules] Error stack:', error.stack);
    console.error('[API /custom-rules] Error name:', error.name);
    logger.error('Failed to fetch custom rules', {}, error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch custom rules',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// POST /api/custom-rules - Create a new custom rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      detectionType,
      objectClass,
      minConfidence = 0.6,
      zoneCoordinates,
      conditions,
      actions,
      severity = 'medium',
      cameraId,
      worksiteId
    } = body;

    // Validate required fields
    if (!name || !detectionType) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required fields: name, detectionType' 
        }, 
        { status: 400 }
      );
    }

    // Validate detection type
    const validTypes = ['object_missing', 'object_present', 'zone_violation', 'person_count', 'proximity_violation', 'behavior_violation'];
    if (!validTypes.includes(detectionType)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid detection type. Must be one of: ${validTypes.join(', ')}` 
        }, 
        { status: 400 }
      );
    }

    // Validate severity
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json(
        { 
          success: false,
          error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}` 
        }, 
        { status: 400 }
      );
    }

    const cameraWorksiteId = cameraId ? await getWorksiteIdForCamera(cameraId) : null;
    if (cameraId && !cameraWorksiteId) {
      return NextResponse.json(
        { success: false, error: 'Camera not found' },
        { status: 404 }
      );
    }

    const targetWorksiteId = worksiteId || cameraWorksiteId;
    if (!targetWorksiteId) {
      return NextResponse.json(
        { success: false, error: 'Valid worksiteId or cameraId is required' },
        { status: 400 }
      );
    }

    if (cameraWorksiteId && cameraWorksiteId !== targetWorksiteId) {
      return NextResponse.json(
        { success: false, error: 'Camera does not belong to the selected worksite' },
        { status: 400 }
      );
    }

    const denied = await enforceWorksiteAdminAccess(request, targetWorksiteId);
    if (denied) return denied;

    // Extract notification settings
    const smsRecipients = body.smsRecipients || [];
    const emailRecipients = body.emailRecipients || [];
    const smsEnabled = actions.includes('send_sms');
    const emailEnabled = actions.includes('send_email');

    // Create rule with transaction
    const rule = await retryDatabaseOperation(async () => {
      return await prisma.$transaction(async (tx) => {
        // Create the rule using the actual schema fields
        const newRule = await tx.customRule.create({
          data: {
            name,
            description,
            ruleType: detectionType === 'zone_violation' ? 'area_monitoring' : 'object_detection',
            category: 'safety',
            severity,
            isActive: true,
            priority: severity === 'critical' ? 1 : severity === 'high' ? 2 : severity === 'medium' ? 3 : 4,
            
            // Rule configuration
            detectionCriteria: {
              detectionType,
              objectClass,
              zoneCoordinates: zoneCoordinates || null,
              zoneObjectTriggers: conditions.zoneObjectTriggers || null
            },
            triggerConditions: conditions || {},
            alertSettings: {
              actions: actions || ['create_alert'],
              severity,
              smsRecipients,
              emailRecipients
            },
            
            // AI Model config
            aiModelType: 'yolo',
            confidenceThreshold: minConfidence,
            
            // Notification settings
            smsEnabled,
            emailEnabled,
            dashboardEnabled: true,
            smsRecipients: smsRecipients.length > 0 ? smsRecipients : null,
            emailRecipients: emailRecipients.length > 0 ? emailRecipients : null,
            
            // Relationships
            cameraId: cameraId || null,
            worksiteId: targetWorksiteId || null
          },
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

        return newRule;
      });
    }, 'create-custom-rule');

    logger.info(`Custom rule created: ${name}`, { 
      ruleId: rule.id,
      detectionType,
      objectClass,
      severity
    });

    // Notify AI detection service (non-blocking)
    notifyAIService(rule);

    const formattedRule = {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      ruleType: rule.ruleType,
      category: rule.category,
      severity: rule.severity,
      isActive: rule.isActive,
      priority: rule.priority,
      detectionCriteria: rule.detectionCriteria,
      triggerConditions: rule.triggerConditions,
      alertSettings: rule.alertSettings,
      timeConstraints: rule.timeConstraints,
      locationConstraints: rule.locationConstraints,
      aiModelType: rule.aiModelType,
      confidenceThreshold: rule.confidenceThreshold,
      smsEnabled: rule.smsEnabled,
      emailEnabled: rule.emailEnabled,
      dashboardEnabled: rule.dashboardEnabled,
      smsRecipients: rule.smsRecipients,
      emailRecipients: rule.emailRecipients,
      cameraId: rule.cameraId,
      camera: rule.camera,
      worksiteId: rule.worksiteId,
      worksite: rule.worksite,
      createdAt: rule.createdAt.toISOString(),
      updatedAt: rule.updatedAt.toISOString()
    };

    return NextResponse.json({
      success: true,
      data: formattedRule,
      message: 'Custom rule created successfully'
    }, { status: 201 });

  } catch (error) {
    logger.error('Failed to create custom rule', {}, error as Error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create custom rule',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
}

// Helper function to notify AI service (with error handling)
async function notifyAIService(rule: any) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/rules/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rule }),
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (response.ok) {
      logger.info('AI service notified of new rule', { ruleId: rule.id });
    } else {
      logger.warn('AI service returned error', { 
        status: response.status,
        ruleId: rule.id 
      });
    }
  } catch (error) {
    logger.warn('Failed to notify AI service (will sync via polling)', { 
      ruleId: rule.id 
    }, error as Error);
    // Don't throw - rule is saved, AI will poll for updates
  }
}

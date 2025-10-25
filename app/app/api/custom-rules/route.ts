import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/lib/logger';
import { retryDatabaseOperation } from '@/app/lib/retry';

// GET /api/custom-rules - Get all custom rules
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const cameraId = searchParams.get('cameraId');

    const rules = await retryDatabaseOperation(async () => {
      return await prisma.customRule.findMany({
        where: {
          ...(activeOnly ? { isActive: true } : {}),
          ...(cameraId ? { 
            OR: [
              { cameraId },
              { cameraId: null } // Global rules
            ]
          } : {})
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

    logger.info(`Fetched ${formattedRules.length} custom rules`, { 
      activeOnly, 
      cameraId 
    });

    return NextResponse.json({
      success: true,
      data: formattedRules,
      count: formattedRules.length
    });

  } catch (error) {
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

    // Extract notification settings
    const smsRecipients = body.smsRecipients || [];
    const emailRecipients = body.emailRecipients || [];
    const smsEnabled = actions.includes('send_sms');
    const emailEnabled = actions.includes('send_email');

    // Create rule with transaction
    const rule = await retryDatabaseOperation(async () => {
      return await prisma.$transaction(async (tx) => {
        // Get default worksite if not provided
        let targetWorksiteId = worksiteId;
        if (!targetWorksiteId && !cameraId) {
          const defaultWorksite = await tx.worksite.findFirst({
            orderBy: { createdAt: 'asc' }
          });
          targetWorksiteId = defaultWorksite?.id;
        }

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

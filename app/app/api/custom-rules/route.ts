import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { logger } from '@/app/lib/logger';
import { retryDatabaseOperation } from '@/app/lib/retry';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { writeAuditLog } from '@/app/lib/audit';

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
    
    const rules = await retryDatabaseOperation(async () => {
      const whereClause: any = {};
      
      if (activeOnly) {
        whereClause.isActive = true;
      }
      
      if (worksiteId) {
        whereClause.worksiteId = worksiteId;
        console.log('[Custom Rules API] Filtering by worksiteId:', worksiteId);
      }
      
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
// Handles two payload shapes:
//   1. Alert-builder: { name, detectionType, objectClass, conditions, actions, severity, ... }
//   2. Dashboard advanced modal: { name, ruleType, detectionCriteria, triggerConditions, alertSettings, severity, ... }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // ── only name is universally required ───────────────────────────────────
    if (!body.name) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    // ── normalise both shapes into one set of locals ─────────────────────────
    // Shape 1 (alert-builder) uses top-level detectionType / objectClass / actions / conditions
    // Shape 2 (dashboard modal) uses detectionCriteria / alertSettings / triggerConditions
    const isAdvancedShape = !body.detectionType && (body.detectionCriteria || body.ruleType);

    const name: string         = body.name;
    const description: string  = body.description || '';
    const severity: string     = (body.severity || 'medium').toLowerCase();
    const cameraId: string | null = body.cameraId || null;
    const cameraIds: string[]  = Array.isArray(body.cameraIds) ? body.cameraIds.filter(Boolean) : [];
    const worksiteId: string | null = body.worksiteId || null;
    // Default matches the YOLO service's own detection floor (YOLO_CONFIDENCE, default 0.5
    // in ai-detection/railway_service.py). Previously this defaulted to 0.6, which is HIGHER
    // than the confidence YOLO needs to log a detection at all — so any rule created without
    // manually touching the confidence slider silently required a stricter bar than the
    // detector itself, and detections in the 0.5-0.6 range would show up in DetectionLog but
    // could never trigger an alert. If you change YOLO_CONFIDENCE on Railway, change this too.
    const minConfidence: number = body.minConfidence ?? body.confidenceThreshold ?? 0.5;

    // Detection criteria
    let detectionType: string;
    let objectClass: string;
    let detectionCriteriaJson: Record<string, any>;
    let triggerConditionsJson: Record<string, any>;
    let alertSettingsJson: Record<string, any>;

    if (isAdvancedShape) {
      // Dashboard advanced modal — use fields as-is
      detectionType     = body.detectionCriteria?.detectionType || 'object_present';
      objectClass       = body.detectionCriteria?.objectClass   || 'person_detected';
      detectionCriteriaJson  = body.detectionCriteria  || {};
      triggerConditionsJson  = body.triggerConditions  || {};
      alertSettingsJson      = body.alertSettings      || { actions: ['create_alert'] };
    } else {
      // Alert-builder shape
      detectionType     = body.detectionType  || 'object_present';
      objectClass       = body.objectClass    || 'person_detected';
      const conditions  = body.conditions     || {};
      const actions: string[] = Array.isArray(body.actions) ? body.actions : ['create_alert'];
      const zoneCoordinates   = body.zoneCoordinates || null;
      detectionCriteriaJson  = {
        detectionType,
        objectClass,
        zoneCoordinates,
        zoneObjectTriggers: conditions.zoneObjectTriggers || null,
      };
      triggerConditionsJson  = conditions;
      alertSettingsJson      = {
        actions,
        severity,
        smsRecipients:  body.smsRecipients  || [],
        emailRecipients: body.emailRecipients || [],
      };
    }

    // ── notification flags ───────────────────────────────────────────────────
    const allActions: string[] = (
      Array.isArray(alertSettingsJson.actions) ? alertSettingsJson.actions : []
    );
    const smsEnabled   = allActions.includes('send_sms');
    const emailEnabled = allActions.includes('send_email');
    const smsRecipients: string[]   = body.smsRecipients   || alertSettingsJson.smsRecipients   || [];
    const emailRecipients: string[] = body.emailRecipients || alertSettingsJson.emailRecipients || [];

    // ── severity validation ──────────────────────────────────────────────────
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    const normSeverity = validSeverities.includes(severity) ? severity : 'medium';

    // ── create ───────────────────────────────────────────────────────────────
    const rule = await retryDatabaseOperation(async () => {
      return await prisma.$transaction(async (tx) => {
        let targetWorksiteId = worksiteId;
        if (!targetWorksiteId && !cameraId) {
          const defaultWorksite = await tx.worksite.findFirst({ orderBy: { createdAt: 'asc' } });
          targetWorksiteId = defaultWorksite?.id ?? null;
        }

        const newRule = await tx.customRule.create({
          data: {
            name,
            description,
            ruleType: isAdvancedShape
              ? (body.ruleType || 'advanced')
              : (detectionType === 'zone_violation' ? 'area_monitoring' : 'object_detection'),
            category: body.category || 'safety',
            severity: normSeverity,
            isActive: true,
            priority: normSeverity === 'critical' ? 1 : normSeverity === 'high' ? 2 : normSeverity === 'medium' ? 3 : 4,
            detectionCriteria:  detectionCriteriaJson,
            triggerConditions:  triggerConditionsJson,
            alertSettings:      alertSettingsJson,
            aiModelType: 'yolo',
            confidenceThreshold: minConfidence,
            smsEnabled,
            emailEnabled,
            dashboardEnabled: true,
            smsRecipients:   smsRecipients.length   > 0 ? smsRecipients   : null,
            emailRecipients: emailRecipients.length > 0 ? emailRecipients : null,
            cameraId:    cameraId,
            cameraIds:   cameraIds,
            worksiteId:  targetWorksiteId,
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

    // Audit log (fire-and-forget)
    getServerSession(authOptions).then(session => {
      writeAuditLog({
        userId: session?.user?.id,
        worksiteId: rule.worksiteId,
        action: 'RULE_CREATED',
        entity: 'RULE',
        entityId: rule.id,
        entityName: rule.name,
        severity: 'INFO',
        result: 'SUCCESS',
        details: { ruleType: rule.ruleType, ruleSeverity: rule.severity, category: rule.category },
      });
    }).catch(() => {});

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

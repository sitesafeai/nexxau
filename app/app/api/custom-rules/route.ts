// API endpoints for Custom Rules management
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { withErrorHandler, AppError } from '@/app/lib/error-handler';
import { customRuleEngine } from '@/app/lib/custom-rule-engine';

export const GET = withErrorHandler(async (req: Request) => {
  const { searchParams } = new URL(req.url);
  const ruleType = searchParams.get('ruleType');
  const category = searchParams.get('category');
  const severity = searchParams.get('severity');
  const isActive = searchParams.get('isActive');
  const worksiteId = searchParams.get('worksiteId');
  const cameraId = searchParams.get('cameraId');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  const skip = (page - 1) * limit;

  const where: any = {};

  if (ruleType && ruleType !== 'all') {
    where.ruleType = ruleType;
  }
  if (category && category !== 'all') {
    where.category = category;
  }
  if (severity && severity !== 'all') {
    where.severity = severity;
  }
  if (isActive !== null) {
    where.isActive = isActive === 'true';
  }
  if (worksiteId) {
    where.worksiteId = worksiteId;
  }
  if (cameraId) {
    where.cameraId = cameraId;
  }

  const rules = await prisma.customRule.findMany({
    where,
    skip,
    take: limit,
    orderBy: [
      { priority: 'asc' },
      { createdAt: 'desc' }
    ],
    include: {
      worksite: {
        select: { name: true, worksiteName: true }
      },
      camera: {
        select: { name: true }
      },
      creator: {
        select: { name: true, email: true }
      },
      _count: {
        select: {
          ruleTriggers: true,
          ruleViolations: true
        }
      }
    }
  });

  const totalRules = await prisma.customRule.count({ where });

  return NextResponse.json({
    data: rules,
    pagination: {
      total: totalRules,
      page,
      limit,
      totalPages: Math.ceil(totalRules / limit)
    }
  });
});

export const POST = withErrorHandler(async (req: Request) => {
  const ruleData = await req.json();

  // Validate required fields
  if (!ruleData.name || !ruleData.ruleType || !ruleData.category || !ruleData.severity) {
    throw new AppError('Missing required fields: name, ruleType, category, severity', 400, 'low', 'validation');
  }

  // Validate rule configuration
  if (!ruleData.detectionCriteria || !ruleData.triggerConditions || !ruleData.alertSettings) {
    throw new AppError('Missing required rule configuration: detectionCriteria, triggerConditions, alertSettings', 400, 'low', 'validation');
  }

  // Set default values
  const newRule = {
    name: ruleData.name,
    description: ruleData.description || null,
    ruleType: ruleData.ruleType,
    category: ruleData.category,
    severity: ruleData.severity,
    isActive: ruleData.isActive ?? true,
    priority: ruleData.priority ?? 1,
    detectionCriteria: ruleData.detectionCriteria,
    triggerConditions: ruleData.triggerConditions,
    alertSettings: ruleData.alertSettings,
    timeConstraints: ruleData.timeConstraints || null,
    locationConstraints: ruleData.locationConstraints || null,
    aiModelType: ruleData.aiModelType || 'yolo',
    confidenceThreshold: ruleData.confidenceThreshold ?? 0.8,
    customModelPath: ruleData.customModelPath || null,
    smsEnabled: ruleData.smsEnabled ?? true,
    emailEnabled: ruleData.emailEnabled ?? false,
    dashboardEnabled: ruleData.dashboardEnabled ?? true,
    smsRecipients: ruleData.smsRecipients || null,
    emailRecipients: ruleData.emailRecipients || null,
    cooldownMinutes: ruleData.cooldownMinutes ?? 15,
    maxAlertsPerHour: ruleData.maxAlertsPerHour ?? 10,
    worksiteId: ruleData.worksiteId || null,
    cameraId: ruleData.cameraId || null,
    createdBy: ruleData.createdBy || null
  };

  const rule = await customRuleEngine.createRule(newRule);

  return NextResponse.json(rule, { status: 201 });
});

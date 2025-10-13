// API endpoints for specific Custom Rule management
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { withErrorHandler, AppError } from '@/app/lib/error-handler';
import { customRuleEngine } from '@/app/lib/custom-rule-engine';

export const GET = withErrorHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;

  const rule = await prisma.customRule.findUnique({
    where: { id },
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
      ruleTriggers: {
        orderBy: { timestamp: 'desc' },
        take: 10
      },
      ruleViolations: {
        orderBy: { detectedAt: 'desc' },
        take: 10
      },
      _count: {
        select: {
          ruleTriggers: true,
          ruleViolations: true
        }
      }
    }
  });

  if (!rule) {
    throw new AppError('Custom rule not found', 404, 'low', 'validation');
  }

  // Get rule status from engine
  const ruleStatus = customRuleEngine.getRuleStatus(id);

  return NextResponse.json({
    ...rule,
    status: ruleStatus
  });
});

export const PUT = withErrorHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const updateData = await req.json();

  // Remove fields that shouldn't be updated directly
  delete updateData.id;
  delete updateData.createdAt;
  delete updateData.updatedAt;
  delete updateData.triggerCount;
  delete updateData.lastTriggeredAt;

  const rule = await customRuleEngine.updateRule(id, updateData);

  return NextResponse.json(rule);
});

export const DELETE = withErrorHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;

  await customRuleEngine.deleteRule(id);

  return NextResponse.json({ message: 'Custom rule deleted successfully' }, { status: 204 });
});

// API endpoint for testing custom rules
import { NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { withErrorHandler, AppError } from '@/app/lib/error-handler';
import { customRuleEngine } from '@/app/lib/custom-rule-engine';

export const POST = withErrorHandler(async (req: Request, { params }: { params: { id: string } }) => {
  const { id } = params;
  const { testData } = await req.json();

  // Get the rule
  const rule = await prisma.customRule.findUnique({
    where: { id },
    include: {
      worksite: { select: { name: true } },
      camera: { select: { name: true } }
    }
  });

  if (!rule) {
    throw new AppError('Custom rule not found', 404, 'low', 'validation');
  }

  if (!rule.isActive) {
    throw new AppError('Cannot test inactive rule', 400, 'low', 'validation');
  }

  // Create test detection data
  const testDetectionData = {
    objects: testData.objects || [
      {
        class: 'person',
        confidence: 0.9,
        bbox: [100, 100, 200, 300],
        id: 'test-1'
      }
    ],
    timestamp: new Date(),
    cameraId: rule.cameraId || 'test-camera',
    frameData: testData.frameData || null,
    metadata: {
      location: testData.location || 'Test Location',
      ...testData.metadata
    }
  };

  try {
    // Process the test detection
    await customRuleEngine.processDetection(testDetectionData);

    return NextResponse.json({
      message: 'Test detection processed successfully',
      testData: testDetectionData,
      rule: {
        id: rule.id,
        name: rule.name,
        ruleType: rule.ruleType,
        category: rule.category,
        severity: rule.severity
      }
    });
  } catch (error) {
    throw new AppError(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`, 500, 'medium', 'system');
  }
});

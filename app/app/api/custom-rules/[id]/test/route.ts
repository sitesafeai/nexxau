// API endpoint for testing custom rules
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorHandler } from '@/lib/error-handler';
import { customRuleEngine } from '@/lib/custom-rule-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
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
      return NextResponse.json(
        { success: false, error: 'Custom rule not found' },
        { status: 404 }
      );
  }

  if (!rule.isActive) {
      return NextResponse.json(
        { success: false, error: 'Cannot test inactive rule' },
        { status: 400 }
      );
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
        success: true,
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
      return NextResponse.json(
        {
          success: false,
          error: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    return errorHandler.handleError(error, req);
  }
}

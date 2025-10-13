import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { safetyViolationDetector } from '../../../lib/safety-violation-detector';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      violationType = 'hard_hat_violation',
      severity = 'high',
      confidence = 85,
      location = 'Construction Site A',
      description = 'Worker detected without hard hat in restricted area',
      cameraId,
      worksiteId
    } = body;

    // Create violation detection object
    const detection = {
      violationType,
      severity,
      confidence,
      location,
      description,
      cameraId,
      worksiteId,
      detectedAt: new Date(),
      metadata: {
        testMode: true,
        triggeredBy: session.user.id,
        timestamp: new Date().toISOString()
      }
    };

    // Process the violation detection
    const processed = await safetyViolationDetector.processViolationDetection(detection);

    return NextResponse.json({
      success: true,
      message: processed 
        ? 'Safety violation processed and SMS notifications sent' 
        : 'Safety violation was not processed (may be in cooldown or below threshold)',
      data: {
        detection,
        processed,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to test safety violation:', error);
    return NextResponse.json({ error: 'Failed to test safety violation' }, { status: 500 });
  }
}

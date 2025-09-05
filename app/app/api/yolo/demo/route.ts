import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { cameraId } = await request.json();
    
    // Simulate YOLO detection with random data
    const detections = generateDemoDetections(cameraId);
    
    // Send to YOLO processing endpoint
    const response = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/yolo/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frameData: detections,
        cameraId,
        timestamp: new Date().toISOString()
      })
    });

    if (response.ok) {
      const result = await response.json();
      return NextResponse.json({
        success: true,
        detections: detections,
        alerts: result.alerts,
        message: 'Demo detection processed successfully'
      });
    } else {
      throw new Error('Failed to process detection');
    }

  } catch (error) {
    console.error('Demo YOLO error:', error);
    return NextResponse.json(
      { error: 'Failed to process demo detection' },
      { status: 500 }
    );
  }
}

function generateDemoDetections(cameraId: string) {
  const detectionTypes = [
    {
      class: 'person',
      confidence: 0.85,
      bbox: [100, 100, 200, 300],
      metadata: { speed: 5, inZone: false }
    },
    {
      class: 'hard_hat',
      confidence: 0.92,
      bbox: [110, 80, 140, 120],
      metadata: { present: true }
    },
    {
      class: 'safety_vest',
      confidence: 0.78,
      bbox: [120, 150, 180, 200],
      metadata: { present: true }
    },
    {
      class: 'vehicle',
      confidence: 0.88,
      bbox: [300, 200, 500, 350],
      metadata: { speed: 25, speedLimit: 15 }
    }
  ];

  // Randomly select 1-3 detections
  const numDetections = Math.floor(Math.random() * 3) + 1;
  const selectedDetections = detectionTypes
    .sort(() => Math.random() - 0.5)
    .slice(0, numDetections);

  return {
    confidence: Math.random() * 0.3 + 0.7, // 0.7 - 1.0
    objects: selectedDetections,
    metadata: {
      frameId: Date.now(),
      cameraId,
      timestamp: new Date().toISOString()
    }
  };
}

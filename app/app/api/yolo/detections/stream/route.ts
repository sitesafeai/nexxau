import { NextRequest } from 'next/server';

// Persistent detection positions for smoother, more realistic detections
const detectionStates = new Map();

// Mock detection data generator for demo purposes
function generateMockDetections(cameraId: string) {
  const objectClasses = [
    'person',
    'hard_hat',
    'safety_vest',
    'vehicle',
    'forklift',
    'barrier',
    'equipment'
  ];

  // Get or initialize camera state
  if (!detectionStates.has(cameraId)) {
    const numObjects = Math.floor(Math.random() * 3) + 2; // 2-4 persistent objects
    const initialObjects = [];
    
    for (let i = 0; i < numObjects; i++) {
      const classIndex = Math.floor(Math.random() * objectClasses.length);
      initialObjects.push({
        class_id: classIndex,
        class_name: objectClasses[classIndex],
        x: Math.random() * 600 + 100,
        y: Math.random() * 300 + 50,
        width: Math.random() * 100 + 80,
        height: Math.random() * 150 + 100,
        vx: (Math.random() - 0.5) * 10, // Slower movement
        vy: (Math.random() - 0.5) * 10,
        confidence: 0.80 + Math.random() * 0.15
      });
    }
    detectionStates.set(cameraId, initialObjects);
  }

  const objects = detectionStates.get(cameraId);
  const detections = [];

  // Update positions with smoother movement
  objects.forEach((obj: any) => {
    // Update position slightly
    obj.x += obj.vx;
    obj.y += obj.vy;
    
    // Bounce off edges
    if (obj.x < 50 || obj.x > 750) obj.vx *= -1;
    if (obj.y < 50 || obj.y > 400) obj.vy *= -1;
    
    // Slight confidence variation
    obj.confidence = Math.min(0.95, Math.max(0.75, obj.confidence + (Math.random() - 0.5) * 0.02));

    detections.push({
      class_id: obj.class_id,
      class_name: obj.class_name,
      confidence: obj.confidence,
      bbox: {
        x1: Math.round(obj.x),
        y1: Math.round(obj.y),
        x2: Math.round(obj.x + obj.width),
        y2: Math.round(obj.y + obj.height)
      },
      timestamp: new Date().toISOString()
    });
  });

  return detections;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get('camera_id');

  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send detection updates every 500ms for smoother animations
      const interval = setInterval(() => {
        const detections = generateMockDetections(cameraId || 'default');
        const data = JSON.stringify({
          camera_id: cameraId,
          detections,
          timestamp: new Date().toISOString()
        });

        try {
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          console.error('Error sending detection data:', error);
          clearInterval(interval);
          controller.close();
        }
      }, 500);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

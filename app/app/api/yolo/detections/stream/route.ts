import { NextRequest } from 'next/server';

// Mock detection data generator for demo purposes
function generateMockDetections() {
  const objectClasses = [
    'person',
    'hard_hat',
    'safety_vest',
    'vehicle',
    'forklift',
    'barrier',
    'equipment'
  ];

  const numDetections = Math.floor(Math.random() * 5) + 1; // 1-5 objects
  const detections = [];

  for (let i = 0; i < numDetections; i++) {
    const classIndex = Math.floor(Math.random() * objectClasses.length);
    const className = objectClasses[classIndex];
    
    // Random position (ensure boxes stay within frame)
    const x1 = Math.random() * 500 + 50;
    const y1 = Math.random() * 300 + 50;
    const width = Math.random() * 150 + 80;
    const height = Math.random() * 200 + 100;

    detections.push({
      class_id: classIndex,
      class_name: className,
      confidence: 0.75 + Math.random() * 0.24, // 75-99% confidence
      bbox: {
        x1: Math.round(x1),
        y1: Math.round(y1),
        x2: Math.round(x1 + width),
        y2: Math.round(y1 + height)
      },
      timestamp: new Date().toISOString()
    });
  }

  return detections;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get('camera_id');

  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send detection updates every 2 seconds
      const interval = setInterval(() => {
        const detections = generateMockDetections();
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
      }, 2000);

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

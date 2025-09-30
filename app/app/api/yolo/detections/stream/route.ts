import { NextRequest } from 'next/server';

// Store active detection streams
const activeStreams = new Map<string, ReadableStreamDefaultController>();

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get('camera_id');

  if (!cameraId) {
    return new Response('Missing camera_id parameter', { status: 400 });
  }

  console.log(`🎯 Starting detection stream for camera: ${cameraId}`);

  const stream = new ReadableStream({
    start(controller) {
      // Store the controller for this camera
      activeStreams.set(cameraId, controller);
      
      // Send initial connection message
      const data = JSON.stringify({
        type: 'connection',
        camera_id: cameraId,
        message: 'Detection stream connected',
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
    },
    
    cancel() {
      console.log(`🛑 Detection stream cancelled for camera: ${cameraId}`);
      activeStreams.delete(cameraId);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Function to broadcast detection data to all active streams
export function broadcastDetection(cameraId: string, detections: any[]) {
  const controller = activeStreams.get(cameraId);
  if (controller) {
    try {
      const data = JSON.stringify({
        type: 'detection',
        camera_id: cameraId,
        detections: detections,
        timestamp: new Date().toISOString()
      });
      
      controller.enqueue(`data: ${data}\n\n`);
      console.log(`📡 Broadcasted ${detections.length} detections to camera ${cameraId}`);
    } catch (error) {
      console.error('Error broadcasting detection:', error);
      activeStreams.delete(cameraId);
    }
  }
}

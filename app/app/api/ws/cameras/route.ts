/**
 * WebSocket API for Real-Time Camera Status Updates
 * 
 * Note: Next.js doesn't natively support WebSockets in the App Router.
 * This is a placeholder implementation. For production, consider:
 * 
 * 1. Using Server-Sent Events (SSE) instead
 * 2. Deploying a separate WebSocket server (Socket.io, ws)
 * 3. Using a service like Pusher, Ably, or Socket.io
 * 4. Implementing polling as a fallback
 * 
 * For now, we'll implement SSE which works with Next.js
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getSession } from '@/app/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/ws/cameras?worksite=<worksiteId>
 * Server-Sent Events endpoint for real-time camera status updates
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const worksiteId = searchParams.get('worksite');

  if (!worksiteId) {
    return new Response('Missing worksite parameter', { status: 400 });
  }

  // Create a TransformStream for SSE
  const encoder = new TextEncoder();
  let intervalId: NodeJS.Timeout;

  const stream = new ReadableStream({
    async start(controller) {
      console.log(`[SSE] Client connected for worksite: ${worksiteId}`);

      // Send initial connection message
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ type: 'connection', message: 'Connected' })}\n\n`)
      );

      // Function to fetch and send camera status
      const sendCameraStatus = async () => {
        try {
          const cameras = await prisma.camera.findMany({
            where: { worksiteId },
            select: {
              id: true,
              name: true,
              status: true,
              lastActivity: true,
              metadata: true,
              updatedAt: true,
            },
          });

          const statusUpdate = {
            type: 'camera_status',
            timestamp: new Date().toISOString(),
            cameras: cameras.map((camera) => ({
              id: camera.id,
              name: camera.name,
              status: camera.status || 'active',
              lastActivity: camera.lastActivity || camera.updatedAt?.toISOString(),
              metadata: camera.metadata,
            })),
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(statusUpdate)}\n\n`)
          );
        } catch (error) {
          console.error('[SSE] Error fetching camera status:', error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: 'error', message: 'Failed to fetch camera status' })}\n\n`
            )
          );
        }
      };

      // Send initial status immediately
      await sendCameraStatus();

      // Send updates every 3 seconds
      intervalId = setInterval(sendCameraStatus, 3000);

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatId = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch (error) {
          console.log('[SSE] Connection closed during heartbeat');
          clearInterval(heartbeatId);
        }
      }, 30000);

      // Clean up when client disconnects
      request.signal.addEventListener('abort', () => {
        console.log(`[SSE] Client disconnected for worksite: ${worksiteId}`);
        clearInterval(intervalId);
        clearInterval(heartbeatId);
        controller.close();
      });
    },

    cancel() {
      console.log('[SSE] Stream cancelled');
      if (intervalId) {
        clearInterval(intervalId);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable buffering in nginx
    },
  });
}


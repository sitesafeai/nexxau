import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cameraId = searchParams.get('cameraId') || 'unknown';

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      function send(event: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      }

      // Heartbeat to keep connection alive
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      }, 15000);

      // Demo detections: emit random boxes normalized 0..1
      const interval = setInterval(() => {
        const num = Math.floor(Math.random() * 3); // 0-2 boxes
        const detections = Array.from({ length: num }).map(() => {
          const w = 0.1 + Math.random() * 0.2;
          const h = 0.1 + Math.random() * 0.2;
          const x = Math.random() * (1 - w);
          const y = Math.random() * (1 - h);
          return {
            id: Math.random().toString(36).slice(2),
            label: 'person',
            score: +(0.6 + Math.random() * 0.4).toFixed(2),
            box: { x, y, w, h },
          };
        });
        send({ cameraId, ts: Date.now(), detections });
      }, 1000);

      const cancel = () => {
        clearInterval(interval);
        clearInterval(heartbeat);
        controller.close();
      };

      // Close on client disconnect
      (request as any).signal?.addEventListener('abort', cancel);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}


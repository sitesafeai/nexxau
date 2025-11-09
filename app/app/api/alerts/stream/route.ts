import { NextRequest } from 'next/server';
import { onAlertCreated } from '@/app/lib/alert-events';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const worksiteId = searchParams.get('worksiteId');

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        if (worksiteId && data.worksiteId !== worksiteId) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // initial message
      controller.enqueue(encoder.encode('data: {"ready": true}\n\n'));

      const unsubscribe = onAlertCreated(send);
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      controller.onCancel = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}


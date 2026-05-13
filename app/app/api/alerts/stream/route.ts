import { NextRequest, NextResponse } from 'next/server';
import { onAlertCreated } from '@/app/lib/alert-events';
import { prisma } from '@/app/lib/prisma';
import { requireApiSession } from '@/app/lib/api-route-auth';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const auth = await requireApiSession();
  if (!auth.ok) {
    return auth.response;
  }

  const { searchParams } = new URL(request.url);
  const worksiteId = searchParams.get('worksiteId');
  let allowedWorksiteIds: Set<string> | null = null;

  if (auth.userRole !== 'SUPER_ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: auth.session.user.id },
      select: {
        companyId: true,
        worksiteId: true,
        worksiteAccess: {
          select: { worksiteId: true },
        },
      },
    });

    const ids = new Set<string>();
    if (auth.userRole === 'COMPANY_ADMIN' && user?.companyId) {
      const worksites = await prisma.worksite.findMany({
        where: { companyId: user.companyId },
        select: { id: true },
      });
      worksites.forEach((site) => ids.add(site.id));
    } else {
      if (user?.worksiteId) ids.add(user.worksiteId);
      user?.worksiteAccess.forEach((access) => ids.add(access.worksiteId));
    }

    if (worksiteId && !ids.has(worksiteId)) {
      return NextResponse.json({ error: 'Access denied to worksite' }, { status: 403 });
    }
    allowedWorksiteIds = ids;
  }

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      const send = (data: any) => {
        if (worksiteId && data.worksiteId !== worksiteId) return;
        if (!worksiteId && allowedWorksiteIds && !allowedWorksiteIds.has(data.worksiteId)) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      // initial message
      controller.enqueue(encoder.encode('data: {"ready": true}\n\n'));

      const unsubscribe = onAlertCreated(send);
      const keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(': keep-alive\n\n'));
      }, 15000);

      // Note: ReadableStreamDefaultController doesn't have onCancel property
      // Use AbortController or signal-based cancellation instead
      // For now, handle cleanup in the stream close
      const abortController = new AbortController();
      abortController.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        unsubscribe();
      });
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


import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST as restartMediaMTX } from '@/app/api/mediamtx/restart/route';
import { POST as registerStream } from '@/app/api/streams/register/route';
import { GET as proxyHls } from '@/app/api/hls/[...path]/route';
import { prisma } from '@/app/lib/prisma';
import { exec } from 'child_process';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    camera: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('MediaMTX API security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockReset();
  });

  it('rejects unauthenticated MediaMTX restarts before executing host commands', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await restartMediaMTX();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(exec).not.toHaveBeenCalled();
  });

  it('rejects non-super-admin stream registration before DB writes or host commands', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'COMPANY_ADMIN' },
    });

    const request = new NextRequest('http://localhost:3000/api/streams/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Camera 1',
        streamUrl: 'rtsp://example.test/stream',
        mediamtxPath: 'camera-1',
        worksiteId: 'worksite-1',
      }),
      headers: { 'content-type': 'application/json' },
    });

    const response = await registerStream(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Forbidden');
    expect(prisma.camera.create).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });

  it('rejects anonymous HLS proxy requests before contacting MediaMTX', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8');
    const response = await proxyHls(request, {
      params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }),
    });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('allows an authorized HLS viewer and forwards credentials only upstream', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'WORKER', companyId: 'company-1' },
    });
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      worksiteId: 'worksite-1',
      worksite: { companyId: 'company-1' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      companyId: 'company-1',
      worksiteAccess: [],
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response('#EXTM3U', {
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      })
    );

    const request = new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8');
    const response = await proxyHls(request, {
      params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }),
    });

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8888/camera-1/index.m3u8',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
  });
});

import { NextRequest } from 'next/server';
import { GET } from '../../app/api/hls/[...path]/route';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';

jest.mock('@/app/lib/session-cache', () => ({
  getCachedSession: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    camera: {
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    worksite: {
      findFirst: jest.fn(),
    },
  },
}));

function requestFor(path: string) {
  return new NextRequest(`http://localhost:3000/api/hls/${path}`);
}

function paramsFor(path: string) {
  return { params: Promise.resolve({ path: path.split('/') }) };
}

describe('/api/hls proxy access control', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MEDIAMTX_HLS_ORIGIN = 'http://mediamtx.local';
    process.env.MEDIAMTX_API_USERNAME = 'mtx-user';
    process.env.MEDIAMTX_API_PASSWORD = 'mtx-pass';
    global.fetch = jest.fn();
  });

  it('does not proxy a known stream without an authenticated session', async () => {
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-1',
    });
    (getCachedSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(requestFor('camera-1/index.m3u8'), paramsFor('camera-1/index.m3u8'));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('proxies only after the viewer has access to the camera worksite', async () => {
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-1',
    });
    (getCachedSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'viewer@example.com', role: 'WORKER' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      companyId: 'company-1',
      role: 'WORKER',
      worksiteAccess: [{ worksiteId: 'worksite-1' }],
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response('#EXTM3U', {
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      })
    );

    const response = await GET(
      new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8?foo=bar'),
      paramsFor('camera-1/index.m3u8')
    );

    expect(response.status).toBe(200);
    expect(await response.text()).toBe('#EXTM3U');
    expect(global.fetch).toHaveBeenCalledWith('http://mediamtx.local/camera-1/index.m3u8?foo=bar', {
      headers: {
        Authorization: `Basic ${Buffer.from('mtx-user:mtx-pass').toString('base64')}`,
      },
      cache: 'no-store',
    });
  });

  it('does not proxy streams for another tenant worksite', async () => {
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-1',
    });
    (getCachedSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', email: 'viewer@example.com', role: 'WORKER' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      companyId: 'company-2',
      role: 'WORKER',
      worksiteAccess: [],
    });
    (prisma.worksite.findFirst as jest.Mock).mockResolvedValue(null);

    const response = await GET(requestFor('camera-1/index.m3u8'), paramsFor('camera-1/index.m3u8'));
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe('Access denied');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

import { NextRequest } from 'next/server';
import { GET as hlsGET } from '@/app/api/hls/[...path]/route';
import { GET as globalStatsGET } from '@/app/api/admin/global-stats/route';
import { GET as systemStatusGET } from '@/app/api/admin/system-status/route';
import { getCachedSession } from '@/app/lib/session-cache';
import { prisma } from '@/app/lib/prisma';
import { withCache } from '@/app/lib/cache';

jest.mock('@/app/lib/session-cache', () => ({
  getCachedSession: jest.fn(),
}));

jest.mock('@/app/lib/cache', () => ({
  withCache: jest.fn((_: string, __: number, cb: () => Promise<unknown>) => cb()),
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    camera: {
      findUnique: jest.fn(),
    },
    user: {
      count: jest.fn(),
    },
    worksite: {
      groupBy: jest.fn(),
    },
    alertRule: {
      count: jest.fn(),
    },
    alert: {
      count: jest.fn(),
    },
    alertResponse: {
      count: jest.fn(),
    },
    safetyScore: {
      aggregate: jest.fn(),
    },
    auditLog: {
      findFirst: jest.fn(),
    },
  },
}));

const mockSession = (role: string, companyId = 'company-1') => ({
  user: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role,
    companyId,
  },
});

describe('security-sensitive API authorization', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MEDIAMTX_HLS_ORIGIN = 'http://mediamtx.internal:8888';
    process.env.MEDIAMTX_API_USERNAME = 'proxy-user';
    process.env.MEDIAMTX_API_PASSWORD = 'proxy-pass';
    global.fetch = jest.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MEDIAMTX_HLS_ORIGIN;
    delete process.env.MEDIAMTX_API_USERNAME;
    delete process.env.MEDIAMTX_API_PASSWORD;
  });

  it('requires authentication before proxying HLS requests', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(null);

    const response = await hlsGET(
      new NextRequest('http://localhost/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(401);
    expect(prisma.camera.findUnique).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('blocks HLS access when the user cannot access the camera worksite', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(mockSession('WORKER'));
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksite: {
        companyId: 'company-2',
        worksiteUsers: [],
      },
    });

    const response = await hlsGET(
      new NextRequest('http://localhost/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('proxies HLS only after camera access is authorized', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(mockSession('COMPANY_ADMIN'));
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksite: {
        companyId: 'company-1',
        worksiteUsers: [],
      },
    });
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response('#EXTM3U', {
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      })
    );

    const response = await hlsGET(
      new NextRequest('http://localhost/api/hls/camera-1/index.m3u8?token=abc'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://mediamtx.internal:8888/camera-1/index.m3u8?token=abc',
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          Authorization: `Basic ${Buffer.from('proxy-user:proxy-pass').toString('base64')}`,
        },
      })
    );
  });

  it('requires super-admin for global platform stats', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(mockSession('WORKER'));

    const response = await globalStatsGET(
      new NextRequest('http://localhost/api/admin/global-stats')
    );

    expect(response.status).toBe(403);
    expect(withCache).not.toHaveBeenCalled();
  });

  it('requires super-admin for system status', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(mockSession('COMPANY_ADMIN'));

    const response = await systemStatusGET(
      new NextRequest('http://localhost/api/admin/system-status')
    );

    expect(response.status).toBe(403);
    expect(withCache).not.toHaveBeenCalled();
  });
});

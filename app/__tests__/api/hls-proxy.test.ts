import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { GET } from '@/app/api/hls/[...path]/route';
import { prisma } from '@/app/lib/prisma';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    camera: {
      findFirst: jest.fn(),
    },
  },
}));

describe('/api/hls proxy authorization', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock as any;
  });

  it('rejects unauthenticated requests before proxying to MediaMTX', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await GET(
      new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(401);
    expect(prisma.camera.findFirst).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects users outside the camera worksite before proxying', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'WORKER',
        companyId: 'company-2',
      },
    });
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-1',
      worksite: {
        companyId: 'company-1',
        worksiteUsers: [],
      },
    });

    const response = await GET(
      new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies HLS only after validating stream access', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'WORKER',
        companyId: 'company-1',
      },
    });
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-1',
      worksite: {
        companyId: 'company-1',
        worksiteUsers: [],
      },
    });
    fetchMock.mockResolvedValue(
      new Response('#EXTM3U', {
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      })
    );

    const response = await GET(
      new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8?part=1'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(200);
    expect(prisma.camera.findFirst).toHaveBeenCalledWith({
      where: {
        OR: [{ id: 'camera-1' }, { mediamtxPath: 'camera-1' }],
      },
      select: expect.any(Object),
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8888/camera-1/index.m3u8?part=1',
      expect.objectContaining({
        headers: {
          Authorization: `Basic ${Buffer.from('admin:nexxau').toString('base64')}`,
        },
        cache: 'no-store',
      })
    );
  });
});

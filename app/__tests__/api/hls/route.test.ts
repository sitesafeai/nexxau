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
    user: {
      findUnique: jest.fn(),
    },
  },
}));

describe('/api/hls/[...path]', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = fetchMock;
  });

  it('rejects anonymous HLS requests before proxying upstream', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8');
    const response = await GET(request, {
      params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }),
    });

    expect(response.status).toBe(401);
    expect(prisma.camera.findFirst).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects authenticated users without access to the camera worksite', async () => {
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
        companyId: 'company-2',
      },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      companyId: 'company-1',
      worksiteAccess: [],
    });

    const request = new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8');
    const response = await GET(request, {
      params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }),
    });

    expect(response.status).toBe(403);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('proxies HLS requests for users in the camera company', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'VIEWER',
        companyId: 'company-1',
      },
    });
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-1',
      worksite: {
        companyId: 'company-1',
      },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      companyId: 'company-1',
      worksiteAccess: [],
    });
    fetchMock.mockResolvedValue(
      new Response('#EXTM3U', {
        status: 200,
        headers: {
          'content-type': 'application/vnd.apple.mpegurl',
        },
      })
    );

    const request = new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8');
    const response = await GET(request, {
      params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }),
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:8888/camera-1/index.m3u8',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: expect.stringMatching(/^Basic /),
        }),
      })
    );
  });
});

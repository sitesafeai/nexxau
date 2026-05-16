import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { GET as getHls } from '@/app/api/hls/[...path]/route';
import { DELETE as deleteWorksite } from '@/app/api/worksites/[id]/route';

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
    worksite: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedGetServerSession = getServerSession as jest.Mock;
const mockedPrisma = prisma as unknown as {
  camera: { findFirst: jest.Mock };
  user: { findUnique: jest.Mock };
  worksite: { findFirst: jest.Mock; delete: jest.Mock };
};

function makeRequest(path: string, sessionToken?: string): NextRequest {
  const headers = sessionToken
    ? { cookie: `next-auth.session-token=${sessionToken}` }
    : undefined;

  return new NextRequest(new Request(`http://localhost${path}`, { headers }));
}

describe('security critical API route guards', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  describe('GET /api/hls/[...path]', () => {
    it('rejects anonymous HLS requests before proxying to MediaMTX', async () => {
      const response = await getHls(
        makeRequest('/api/hls/camera-1/index.m3u8'),
        { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
      );

      expect(response.status).toBe(401);
      expect(mockedPrisma.camera.findFirst).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('does not proxy HLS for authenticated users without worksite access', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'viewer@example.com', role: 'VIEWER' },
      });
      mockedPrisma.camera.findFirst.mockResolvedValue({
        id: 'camera-1',
        worksiteId: 'worksite-1',
      });
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: 'company-2',
        worksiteId: null,
        worksiteAccess: [],
      });
      mockedPrisma.worksite.findFirst.mockResolvedValue(null);

      const response = await getHls(
        makeRequest('/api/hls/camera-1/index.m3u8', 'deny-token'),
        { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
      );

      expect(response.status).toBe(403);
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('proxies HLS only after the user is authorized for the camera worksite', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'viewer@example.com', role: 'VIEWER' },
      });
      mockedPrisma.camera.findFirst.mockResolvedValue({
        id: 'camera-1',
        worksiteId: 'worksite-1',
      });
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        worksiteId: null,
        worksiteAccess: [],
      });
      mockedPrisma.worksite.findFirst.mockResolvedValue({ id: 'worksite-1' });
      fetchMock.mockResolvedValue(
        new Response('#EXTM3U', {
          status: 200,
          headers: { 'content-type': 'application/vnd.apple.mpegurl' },
        })
      );

      const response = await getHls(
        makeRequest('/api/hls/camera-1/index.m3u8', 'allow-token'),
        { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
      );

      expect(response.status).toBe(200);
      await expect(response.text()).resolves.toBe('#EXTM3U');
      expect(fetchMock).toHaveBeenCalledWith(
        'http://localhost:8888/camera-1/index.m3u8',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: `Basic ${Buffer.from('admin:nexxau').toString('base64')}`,
          }),
          cache: 'no-store',
        })
      );
    });
  });

  describe('DELETE /api/worksites/[id]', () => {
    it('rejects anonymous worksite deletion before touching the database row', async () => {
      const response = await deleteWorksite(
        makeRequest('/api/worksites/worksite-1'),
        { params: Promise.resolve({ id: 'worksite-1' }) }
      );

      expect(response.status).toBe(401);
      expect(mockedPrisma.worksite.delete).not.toHaveBeenCalled();
    });

    it('blocks delete for non-admin users even when they can view the worksite', async () => {
      mockedGetServerSession.mockResolvedValue({
        user: { id: 'user-1', email: 'viewer@example.com', role: 'VIEWER' },
      });
      mockedPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        companyId: 'company-1',
        worksiteId: null,
        worksiteAccess: [],
      });
      mockedPrisma.worksite.findFirst.mockResolvedValue({ id: 'worksite-1' });

      const response = await deleteWorksite(
        makeRequest('/api/worksites/worksite-1', 'viewer-delete-token'),
        { params: Promise.resolve({ id: 'worksite-1' }) }
      );

      expect(response.status).toBe(403);
      expect(mockedPrisma.worksite.delete).not.toHaveBeenCalled();
    });
  });
});

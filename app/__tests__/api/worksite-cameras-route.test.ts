import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { POST } from '@/app/api/worksites/[id]/cameras/route';
import { prisma } from '@/app/lib/prisma';
import { addStreamToMediaMTX } from '@/app/lib/services/mediamtxClient';
import { seedDefaultRules } from '@/app/lib/defaultRules';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    worksite: {
      findUnique: jest.fn(),
    },
    camera: {
      create: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/services/mediamtxClient', () => ({
  addStreamToMediaMTX: jest.fn(),
}));

jest.mock('@/app/lib/defaultRules', () => ({
  seedDefaultRules: jest.fn(),
}));

const originalMediaMtxApiUrl = process.env.MEDIAMTX_API_URL;

function createRequest(streamUrl: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/worksites/worksite-1/cameras', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      name: 'Gate camera',
      rtspUrl: streamUrl,
      location: 'Gate',
      enableAi: true,
    }),
  });
}

function createCamera(streamUrl: string) {
  const timestamp = new Date('2026-01-01T00:00:00.000Z');
  return {
    id: 'camera-1',
    name: 'Gate camera',
    type: 'IP Camera',
    status: 'online',
    streamUrl,
    worksiteId: 'worksite-1',
    metadata: {
      aiEnabled: true,
      overlayEnabled: true,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe('POST /api/worksites/[id]/cameras', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MEDIAMTX_API_URL = 'http://mediamtx.test';

    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        id: 'user-1',
        role: 'SUPER_ADMIN',
      },
    });
    (prisma.worksite.findUnique as jest.Mock).mockResolvedValue({
      id: 'worksite-1',
      name: 'Main site',
    });
    (prisma.camera.create as jest.Mock).mockImplementation(async ({ data }) => createCamera(data.streamUrl));
    (seedDefaultRules as jest.Mock).mockResolvedValue(undefined);
    (addStreamToMediaMTX as jest.Mock).mockResolvedValue(true);
  });

  afterAll(() => {
    if (originalMediaMtxApiUrl === undefined) {
      delete process.env.MEDIAMTX_API_URL;
    } else {
      process.env.MEDIAMTX_API_URL = originalMediaMtxApiUrl;
    }
  });

  it.each([
    ['HLS', 'https://streams.example.com/live/index.m3u8'],
    ['HTTP', 'http://camera.example.com/video'],
    ['RTMP', 'rtmp://streams.example.com/live/gate'],
    ['RTSPS', 'rtsps://camera.example.com/live'],
  ])('accepts %s stream URLs when creating cameras', async (_label, streamUrl) => {
    const response = await POST(createRequest(streamUrl), {
      params: Promise.resolve({ id: 'worksite-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.streamUrl).toBe(streamUrl);
    expect(prisma.camera.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ingestUrl: streamUrl,
          streamUrl,
          worksiteId: 'worksite-1',
        }),
      })
    );
    expect(addStreamToMediaMTX).toHaveBeenCalledWith('http://mediamtx.test', 'camera-1', streamUrl);
  });

  it('rejects unsupported stream URL schemes before writing camera data', async () => {
    const response = await POST(createRequest('ftp://camera.example.com/video'), {
      params: Promise.resolve({ id: 'worksite-1' }),
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toContain('Invalid stream URL');
    expect(prisma.camera.create).not.toHaveBeenCalled();
    expect(seedDefaultRules).not.toHaveBeenCalled();
    expect(addStreamToMediaMTX).not.toHaveBeenCalled();
  });
});

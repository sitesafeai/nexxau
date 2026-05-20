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

describe('POST /api/worksites/[id]/cameras stream URL support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getServerSession as jest.Mock).mockResolvedValue({
      user: {
        email: 'admin@example.com',
        role: 'SUPER_ADMIN',
      },
    });
    (prisma.worksite.findUnique as jest.Mock).mockResolvedValue({
      id: 'worksite-1',
      name: 'Downtown',
    });
    (prisma.camera.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'camera-1',
        name: data.name,
        type: data.type,
        status: data.status,
        streamUrl: data.streamUrl,
        worksiteId: data.worksiteId,
        metadata: data.metadata,
        createdAt: new Date('2026-01-01T00:00:00Z'),
        updatedAt: new Date('2026-01-01T00:00:00Z'),
      })
    );
    (seedDefaultRules as jest.Mock).mockResolvedValue(undefined);
    (addStreamToMediaMTX as jest.Mock).mockResolvedValue(true);
  });

  it('creates an HLS camera URL that passed validation instead of rejecting it as non-RTSP', async () => {
    const request = new NextRequest('http://localhost/api/worksites/worksite-1/cameras', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'HLS Camera',
        rtspUrl: 'https://example.com/live/stream.m3u8',
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: 'worksite-1' }) });
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.success).toBe(true);
    expect(prisma.camera.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'Cloud Stream',
          streamProvider: 'hls',
          ingestUrl: 'https://example.com/live/stream.m3u8',
          streamUrl: 'https://example.com/live/stream.m3u8',
          hlsUrl: 'https://example.com/live/stream.m3u8',
        }),
      })
    );
    expect(addStreamToMediaMTX).toHaveBeenCalledWith(
      expect.any(String),
      'camera-1',
      'https://example.com/live/stream.m3u8'
    );
  });
});

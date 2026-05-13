import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { GET as hlsGET } from '@/app/api/hls/[...path]/route';
import { GET as legacyStreamGET } from '@/app/api/streams/[cameraId]/route';
import { POST as mediamtxRestartPOST } from '@/app/api/mediamtx/restart/route';
import { GET as cameraStreamGET } from '@/app/api/cameras/[id]/stream/route';
import { authOptions } from '@/app/lib/auth';
import { ensureHlsStream } from '@/app/lib/streaming/hlsManager';
import { addStreamToMediaMTX } from '@/app/lib/services/mediamtxClient';
import { exec } from 'child_process';
import bcrypt from 'bcryptjs';

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
    },
    company: {
      findUnique: jest.fn(),
    },
    camera: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    worksite: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/streaming/hlsManager', () => ({
  ensureHlsStream: jest.fn(),
  getHlsUrl: jest.fn(),
  stopHlsStream: jest.fn(),
}));

jest.mock('@/app/lib/streaming/ffmpeg', () => ({
  ffmpegManager: {
    hasProcess: jest.fn(() => false),
    getProcess: jest.fn(),
  },
}));

jest.mock('@/app/lib/services/mediamtxClient', () => ({
  addStreamToMediaMTX: jest.fn(),
  getMediaMTXHLSUrl: jest.fn((cameraId: string) => `/api/hls/${cameraId}/index.m3u8`),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  compare: jest.fn(),
}));

describe('streaming API security', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('rejects anonymous HLS proxy requests before proxying upstream', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await hlsGET(
      new NextRequest('http://localhost:3000/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
    expect(prisma.camera.findUnique).not.toHaveBeenCalled();
  });

  it('rejects anonymous legacy stream starts before spawning FFmpeg or writing camera state', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await legacyStreamGET(
      new NextRequest('http://localhost:3000/api/streams/camera-1?rtspUrl=rtsp://attacker/source'),
      { params: Promise.resolve({ cameraId: 'camera-1' }) }
    );

    expect(response.status).toBe(401);
    expect(ensureHlsStream).not.toHaveBeenCalled();
    expect(prisma.camera.update).not.toHaveBeenCalled();
  });

  it('rejects anonymous MediaMTX restarts before shelling out', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await mediamtxRestartPOST();

    expect(response.status).toBe(401);
    expect(exec).not.toHaveBeenCalled();
  });

  it('denies company admins access to cameras in another company', async () => {
    (getServerSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'COMPANY_ADMIN' },
    });
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      worksiteId: 'worksite-2',
      streamUrl: 'rtsp://camera/source',
      hlsUrl: null,
      mediamtxPath: null,
      worksite: { companyId: 'company-2' },
    });
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'user-1',
      role: 'COMPANY_ADMIN',
      companyId: 'company-1',
      worksiteId: null,
      isActivated: true,
      approved: true,
      worksiteAccess: [],
    });

    const response = await cameraStreamGET(
      new NextRequest('http://localhost:3000/api/cameras/camera-1/stream'),
      { params: Promise.resolve({ id: 'camera-1' }) }
    );

    expect(response.status).toBe(403);
    expect(addStreamToMediaMTX).not.toHaveBeenCalled();
  });

  it('does not issue a credentials session to inactive users', async () => {
    (prisma.user.findFirst as jest.Mock).mockResolvedValue({
      id: 'user-1',
      email: 'inactive@example.com',
      name: 'Inactive User',
      password: 'hash',
      role: 'WORKER',
      companyId: 'company-1',
      worksiteId: 'worksite-1',
      isActivated: false,
      approved: true,
    });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    const credentialsProvider = authOptions.providers[0] as any;
    const result = await credentialsProvider.authorize({
      email: 'inactive@example.com',
      password: 'correct-password',
    });

    expect(result).toBeNull();
    expect(prisma.company.findUnique).not.toHaveBeenCalled();
  });
});

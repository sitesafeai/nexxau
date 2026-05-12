import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/app/lib/prisma';
import { GET as hlsGET } from '@/app/api/hls/[...path]/route';
import { GET as streamGET } from '@/app/api/streams/[cameraId]/route';
import { POST as restartPOST } from '@/app/api/mediamtx/restart/route';
import { POST as registerPOST } from '@/app/api/streams/register/route';
import { ensureHlsStream } from '@/app/lib/streaming/hlsManager';
import { exec } from 'child_process';

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
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/streaming/hlsManager', () => ({
  ensureHlsStream: jest.fn(() => '/streams/camera-1/index.m3u8'),
  getHlsUrl: jest.fn(),
}));

jest.mock('@/app/lib/streaming/ffmpeg', () => ({
  ffmpegManager: {
    hasProcess: jest.fn(() => false),
    getProcess: jest.fn(),
  },
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const session = (role: string, companyId = 'company-1') => ({
  user: {
    id: 'user-1',
    email: 'user@example.com',
    name: 'Test User',
    role,
    companyId,
  },
});

const camera = (companyId = 'company-1') => ({
  id: 'camera-1',
  streamUrl: 'rtsp://camera.example/live',
  hlsUrl: null,
  mediamtxPath: 'mediamtx-camera-1',
  worksiteId: 'worksite-1',
  worksite: {
    companyId,
    worksiteUsers: [],
  },
});

describe('streaming API authorization', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
    process.env.MEDIAMTX_HLS_ORIGIN = 'http://mediamtx.internal:8888';
    process.env.MEDIAMTX_API_USERNAME = 'proxy-user';
    process.env.MEDIAMTX_API_PASSWORD = 'proxy-pass';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.MEDIAMTX_HLS_ORIGIN;
    delete process.env.MEDIAMTX_API_USERNAME;
    delete process.env.MEDIAMTX_API_PASSWORD;
  });

  it('rejects anonymous HLS proxy requests before contacting MediaMTX', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await hlsGET(
      new NextRequest('http://localhost/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(401);
    expect(prisma.camera.findFirst).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects HLS proxy access for users outside the camera company', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(session('WORKER', 'company-1'));
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue(camera('company-2'));

    const response = await hlsGET(
      new NextRequest('http://localhost/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(403);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('proxies HLS only after authorizing camera access', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(session('VIEWER'));
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue(camera());
    (global.fetch as jest.Mock).mockResolvedValue(
      new Response('#EXTM3U', {
        status: 200,
        headers: { 'content-type': 'application/vnd.apple.mpegurl' },
      })
    );

    const response = await hlsGET(
      new NextRequest('http://localhost/api/hls/mediamtx-camera-1/index.m3u8?part=1'),
      { params: Promise.resolve({ path: ['mediamtx-camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://mediamtx.internal:8888/mediamtx-camera-1/index.m3u8?part=1',
      expect.objectContaining({
        cache: 'no-store',
        headers: {
          Authorization: `Basic ${Buffer.from('proxy-user:proxy-pass').toString('base64')}`,
        },
      })
    );
  });

  it('rejects anonymous FFmpeg stream starts before using caller RTSP input', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await streamGET(
      new NextRequest('http://localhost/api/streams/camera-1?rtspUrl=rtsp://attacker/internal'),
      { params: Promise.resolve({ cameraId: 'camera-1' }) }
    );

    expect(response.status).toBe(401);
    expect(prisma.camera.findFirst).not.toHaveBeenCalled();
    expect(ensureHlsStream).not.toHaveBeenCalled();
  });

  it('starts FFmpeg with the stored camera RTSP URL, not a query override', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(session('VIEWER'));
    (prisma.camera.findFirst as jest.Mock).mockResolvedValue(camera());
    (prisma.camera.update as jest.Mock).mockResolvedValue({});

    const response = await streamGET(
      new NextRequest('http://localhost/api/streams/camera-1?rtspUrl=rtsp://attacker/internal'),
      { params: Promise.resolve({ cameraId: 'camera-1' }) }
    );

    expect(response.status).toBe(200);
    expect(ensureHlsStream).toHaveBeenCalledWith('camera-1', 'rtsp://camera.example/live');
  });

  it('requires super-admin before restarting MediaMTX', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(session('COMPANY_ADMIN'));

    const response = await restartPOST();

    expect(response.status).toBe(403);
    expect(exec).not.toHaveBeenCalled();
  });

  it('requires authentication before registering streams', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await registerPOST(
      new NextRequest('http://localhost/api/streams/register', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Bad Camera',
          streamUrl: 'rtsp://attacker/internal',
          mediamtxPath: 'bad-camera',
          worksiteId: 'worksite-1',
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(prisma.camera.create).not.toHaveBeenCalled();
    expect(exec).not.toHaveBeenCalled();
  });
});

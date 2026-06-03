const mockGetServerSession = jest.fn();
const mockAddStreamToMediaMTX = jest.fn();
const mockSeedDefaultRules = jest.fn();
const mockPrisma = {
  worksite: {
    findUnique: jest.fn(),
  },
  camera: {
    create: jest.fn(),
    delete: jest.fn(),
    findUnique: jest.fn(),
  },
  detectionLog: {
    create: jest.fn(),
  },
  safetyViolation: {
    create: jest.fn(),
  },
};

jest.mock('next-auth', () => ({
  getServerSession: mockGetServerSession,
}));

jest.mock('@/app/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/app/lib/prisma', () => ({
  prisma: mockPrisma,
}));

jest.mock('@/app/lib/services/mediamtxClient', () => ({
  addStreamToMediaMTX: mockAddStreamToMediaMTX,
}));

jest.mock('@/app/lib/defaultRules', () => ({
  seedDefaultRules: mockSeedDefaultRules,
}));

jest.mock('@/app/lib/cooldown', () => ({
  isOnCooldown: jest.fn(() => false),
  setCooldown: jest.fn(),
}));

jest.mock('@/app/lib/twilio', () => ({
  sendBothAlerts: jest.fn(),
  sendSMSAlert: jest.fn(),
  sendWhatsAppAlert: jest.fn(),
}));

describe('stream camera creation and YOLO ingest auth', () => {
  const originalInternalToken = process.env.INTERNAL_SERVICE_TOKEN;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.INTERNAL_SERVICE_TOKEN = originalInternalToken;
    process.env.MEDIAMTX_API_URL = 'http://mediamtx.local:9997';
  });

  afterAll(() => {
    process.env.INTERNAL_SERVICE_TOKEN = originalInternalToken;
  });

  it('accepts HLS stream URLs in the worksite camera creation route', async () => {
    const { POST } = await import('@/app/api/worksites/[id]/cameras/route');
    const createdAt = new Date('2026-05-21T00:00:00Z');
    const updatedAt = new Date('2026-05-21T00:00:01Z');

    mockGetServerSession.mockResolvedValue({ user: { role: 'SUPER_ADMIN' } });
    mockPrisma.worksite.findUnique.mockResolvedValue({ id: 'worksite-1', name: 'Site One' });
    mockPrisma.camera.create.mockResolvedValue({
      id: 'camera-1',
      name: 'North Gate HLS',
      type: 'IP Camera',
      status: 'online',
      streamUrl: 'https://streams.example.com/live/index.m3u8',
      worksiteId: 'worksite-1',
      metadata: { aiEnabled: true, overlayEnabled: true },
      createdAt,
      updatedAt,
    });
    mockAddStreamToMediaMTX.mockResolvedValue(true);

    const request = new Request('http://localhost/api/worksites/worksite-1/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'North Gate HLS',
        rtspUrl: 'https://streams.example.com/live/index.m3u8',
        enableAi: true,
      }),
    });

    const response = await POST(request as any, { params: Promise.resolve({ id: 'worksite-1' }) });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(mockPrisma.camera.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          streamProvider: 'hls',
          ingestUrl: 'https://streams.example.com/live/index.m3u8',
          streamUrl: 'https://streams.example.com/live/index.m3u8',
        }),
      })
    );
    expect(mockAddStreamToMediaMTX).toHaveBeenCalledWith(
      'http://mediamtx.local:9997',
      'camera-1',
      'https://streams.example.com/live/index.m3u8'
    );
  });

  it('rejects unsupported stream protocols before creating a camera', async () => {
    const { POST } = await import('@/app/api/worksites/[id]/cameras/route');

    mockGetServerSession.mockResolvedValue({ user: { role: 'SUPER_ADMIN' } });

    const request = new Request('http://localhost/api/worksites/worksite-1/cameras', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Bad Stream',
        rtspUrl: 'ftp://streams.example.com/live',
      }),
    });

    const response = await POST(request as any, { params: Promise.resolve({ id: 'worksite-1' }) });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Invalid stream URL');
    expect(mockPrisma.camera.create).not.toHaveBeenCalled();
  });

  it('fails closed when INTERNAL_SERVICE_TOKEN is missing for YOLO ingest', async () => {
    const { POST } = await import('@/app/api/yolo/ingest/route');
    delete process.env.INTERNAL_SERVICE_TOKEN;

    const request = new Request('http://localhost/api/yolo/ingest', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ',
      },
      body: JSON.stringify({
        camera_id: 'camera-1',
        violations: [{ type: 'no_helmet', confidence: 0.9, bbox: [1, 2, 3, 4] }],
      }),
    });

    const response = await POST(request as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(mockPrisma.camera.findUnique).not.toHaveBeenCalled();
  });
});

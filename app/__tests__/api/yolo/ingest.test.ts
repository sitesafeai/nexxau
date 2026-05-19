import { NextRequest } from 'next/server';
import { POST } from '../../../app/api/yolo/ingest/route';
import { prisma } from '@/app/lib/prisma';

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    camera: {
      findUnique: jest.fn(),
    },
    detectionLog: {
      create: jest.fn(),
    },
    safetyViolation: {
      create: jest.fn(),
    },
  },
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

const originalInternalToken = process.env.INTERNAL_SERVICE_TOKEN;

function makeRequest(authHeader: string) {
  return new NextRequest('http://localhost:3000/api/yolo/ingest', {
    method: 'POST',
    headers: {
      authorization: authHeader,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      camera_id: 'camera-1',
      violations: [{ type: 'no_helmet', confidence: 0.92, bbox: [1, 2, 3, 4] }],
      frame_data: 'frame',
    }),
  });
}

describe('/api/yolo/ingest', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.INTERNAL_SERVICE_TOKEN;
  });

  afterAll(() => {
    if (originalInternalToken === undefined) {
      delete process.env.INTERNAL_SERVICE_TOKEN;
    } else {
      process.env.INTERNAL_SERVICE_TOKEN = originalInternalToken;
    }
  });

  it('rejects bearer requests when INTERNAL_SERVICE_TOKEN is unset', async () => {
    const response = await POST(makeRequest('Bearer '));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ error: 'Unauthorized' });
    expect(prisma.camera.findUnique).not.toHaveBeenCalled();
    expect(prisma.detectionLog.create).not.toHaveBeenCalled();
    expect(prisma.safetyViolation.create).not.toHaveBeenCalled();
  });

  it('accepts the configured internal service token', async () => {
    process.env.INTERNAL_SERVICE_TOKEN = 'service-token';
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      id: 'camera-1',
      name: 'Camera 1',
      zone: 'Zone A',
      worksiteId: 'worksite-1',
      worksite: {
        name: 'Site 1',
        alertContacts: [],
      },
      rules: [],
    });
    (prisma.detectionLog.create as jest.Mock).mockResolvedValue({});

    const response = await POST(makeRequest('Bearer service-token'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true });
    expect(prisma.camera.findUnique).toHaveBeenCalledWith({
      where: { id: 'camera-1' },
      include: {
        worksite: {
          include: { alertContacts: { where: { active: true } } },
        },
        rules: { where: { enabled: true } },
      },
    });
    expect(prisma.detectionLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        cameraId: 'camera-1',
        worksiteId: 'worksite-1',
        type: 'no_helmet',
        confidence: 0.92,
        bbox: [1, 2, 3, 4],
        frameData: 'frame',
      }),
    });
  });
});

import { NextRequest } from 'next/server';
import { POST } from '@/app/api/cameras/snapshot/route';

jest.mock('@/app/lib/prisma', () => ({ prisma: { alert: { findFirst: jest.fn() } } }));
jest.mock('@/app/lib/storage', () => ({ uploadViolationSnapshot: jest.fn() }));
jest.mock('@/app/lib/notifications', () => ({ sendAlerts: jest.fn() }));

const VALID_TOKEN = 'test-service-token-at-least-32-chars-long';

function makeRequest(authHeader?: string, body = { camera_id: 'cam1', snapshot: 'abc' }) {
  return new NextRequest('http://localhost:3000/api/cameras/snapshot', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: {
      'content-type': 'application/json',
      ...(authHeader ? { authorization: authHeader } : {}),
    },
  });
}

describe('POST /api/cameras/snapshot — auth', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV, INTERNAL_SERVICE_TOKEN: VALID_TOKEN };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  it('returns 401 when no Authorization header is sent', async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when the wrong token is sent', async () => {
    const res = await POST(makeRequest('Bearer wrong-token'));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 503 when INTERNAL_SERVICE_TOKEN is not configured', async () => {
    delete process.env.INTERNAL_SERVICE_TOKEN;
    const res = await POST(makeRequest(`Bearer ${VALID_TOKEN}`));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('Service token not configured');
  });
});

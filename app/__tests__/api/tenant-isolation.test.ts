/**
 * Tenant isolation tests.
 *
 * These tests verify that routes correctly enforce company-level scoping.
 * All external dependencies (Prisma, session providers) are mocked.
 * No real database is required.
 */
import { NextRequest } from 'next/server';

// ── mock declarations must come before any module imports ──────────────────

jest.mock('@/app/lib/session-cache', () => ({ getCachedSession: jest.fn() }));
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }));
jest.mock('@/app/lib/auth', () => ({ authOptions: {}, getSession: jest.fn() }));
jest.mock('@/app/lib/roles', () => ({
  normalizeRole: (r?: string | null) => (r ?? '').trim().toUpperCase(),
}));
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    $queryRaw: jest.fn(),
    user: { findUnique: jest.fn() },
    camera: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    worksite: { findUnique: jest.fn() },
    auditLog: { create: jest.fn() },
  },
}));
// Silence modules not relevant to these tests
jest.mock('@/app/lib/streaming/hlsManager', () => ({}));
jest.mock('@/app/lib/services/cameraIngestClient', () => ({}));
jest.mock('@/app/lib/services/mediamtxClient', () => ({}));
jest.mock('@/app/lib/rtsp-validation', () => ({}));
jest.mock('@/app/lib/audit-logger', () => ({
  logUpdate: jest.fn(),
  logDelete: jest.fn(),
}));

// ── now import after mocks are registered ─────────────────────────────────

import { getCachedSession } from '@/app/lib/session-cache';
import { getServerSession } from 'next-auth';
import { getSession } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

import { GET as listCameras } from '@/app/api/cameras/route';
import { GET as getCamera, PATCH as patchCamera } from '@/app/api/cameras/[id]/route';
import { PATCH as patchUser } from '@/app/api/users/[id]/route';

// ── helpers ────────────────────────────────────────────────────────────────

function makeRequest(url: string, method = 'GET', body?: unknown) {
  return new NextRequest(url, {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  });
}

const COMPANY_A = 'company-a';
const COMPANY_B = 'company-b';

const workerSessionA = { user: { id: 'user-a', email: 'worker@a.com', role: 'WORKER' } };
const adminSessionA = { user: { id: 'admin-a', email: 'admin@a.com', role: 'COMPANY_ADMIN' } };
const superAdminSession = { user: { id: 'super', email: 'super@test.com', role: 'SUPER_ADMIN' } };

const userRecordA = {
  id: 'user-a',
  email: 'worker@a.com',
  role: 'WORKER',
  isActivated: true,
  companyId: COMPANY_A,
  worksiteAccess: [],
};

// ── test 1: GET /api/cameras scopes to actor's company ─────────────────────

describe('GET /api/cameras — tenant scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$queryRaw as jest.Mock).mockResolvedValue([{ '?column?': 1 }]);
    (prisma.camera.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('non-SUPER_ADMIN query always includes worksite.companyId filter', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(workerSessionA);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(userRecordA);

    const req = makeRequest('http://localhost/api/cameras');
    await listCameras(req);

    expect(prisma.camera.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          worksite: { companyId: COMPANY_A },
        }),
      })
    );
  });

  it('SUPER_ADMIN query does NOT add a company filter', async () => {
    const superUser = { ...userRecordA, role: 'SUPER_ADMIN', companyId: null };
    (getCachedSession as jest.Mock).mockResolvedValue(superAdminSession);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(superUser);

    const req = makeRequest('http://localhost/api/cameras');
    await listCameras(req);

    const call = (prisma.camera.findMany as jest.Mock).mock.calls[0][0];
    expect(call?.where?.worksite).toBeUndefined();
  });
});

// ── test 2: GET /api/cameras/[id] blocks cross-tenant access ──────────────

describe('GET /api/cameras/[id] — cross-tenant 403', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when camera belongs to a different company', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(workerSessionA);
    // Camera is in company B
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      id: 'cam-1',
      name: 'Cam B',
      worksite: { companyId: COMPANY_B },
      streamUrl: null,
      password: null,
    });
    // enforceCompanyScope DB lookup returns company A for the actor
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyId: COMPANY_A });

    const req = makeRequest('http://localhost/api/cameras/cam-1');
    const res = await getCamera(req, { params: Promise.resolve({ id: 'cam-1' }) });

    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN can access a camera in any company', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(superAdminSession);
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      id: 'cam-1',
      name: 'Cam B',
      worksite: { companyId: COMPANY_B },
      streamUrl: null,
      password: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const req = makeRequest('http://localhost/api/cameras/cam-1');
    const res = await getCamera(req, { params: Promise.resolve({ id: 'cam-1' }) });

    expect(res.status).toBe(200);
  });
});

// ── test 3: PATCH /api/users/[id] — cross-tenant 403 ─────────────────────

describe('PATCH /api/users/[id] — tenant isolation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 403 when actor tries to edit a user in a different company', async () => {
    (getSession as jest.Mock).mockResolvedValue(adminSessionA);

    // Target user is in company B
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-b', name: 'B User', email: 'b@b.com', role: 'WORKER', companyId: COMPANY_B })
      // enforceCompanyScope looks up actor's companyId
      .mockResolvedValueOnce({ companyId: COMPANY_A });

    const req = makeRequest('http://localhost/api/users/user-b', 'PATCH', { name: 'Hacked' });
    const res = await patchUser(req, { params: Promise.resolve({ id: 'user-b' }) });

    expect(res.status).toBe(403);
  });

  it('returns 403 when COMPANY_ADMIN tries to set role to SUPER_ADMIN', async () => {
    (getSession as jest.Mock).mockResolvedValue(adminSessionA);

    // Target is in the same company
    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-c', name: 'C User', email: 'c@a.com', role: 'WORKER', companyId: COMPANY_A })
      .mockResolvedValueOnce({ companyId: COMPANY_A });

    const req = makeRequest('http://localhost/api/users/user-c', 'PATCH', { role: 'SUPER_ADMIN' });
    const res = await patchUser(req, { params: Promise.resolve({ id: 'user-c' }) });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toMatch(/SUPER_ADMIN/);
  });

  it('SUPER_ADMIN can edit a user in any company', async () => {
    (getSession as jest.Mock).mockResolvedValue(superAdminSession);

    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-b', name: 'B User', email: 'b@b.com', role: 'WORKER', companyId: COMPANY_B });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-b', name: 'Updated', email: 'b@b.com', role: 'WORKER',
    });

    const req = makeRequest('http://localhost/api/users/user-b', 'PATCH', { name: 'Updated' });
    const res = await patchUser(req, { params: Promise.resolve({ id: 'user-b' }) });

    expect(res.status).toBe(200);
  });

  it('SUPER_ADMIN can assign any role including SUPER_ADMIN', async () => {
    (getSession as jest.Mock).mockResolvedValue(superAdminSession);

    (prisma.user.findUnique as jest.Mock)
      .mockResolvedValueOnce({ id: 'user-d', name: 'D', email: 'd@a.com', role: 'WORKER', companyId: COMPANY_A });
    (prisma.user.update as jest.Mock).mockResolvedValue({
      id: 'user-d', name: 'D', email: 'd@a.com', role: 'SUPER_ADMIN',
    });

    const req = makeRequest('http://localhost/api/users/user-d', 'PATCH', { role: 'SUPER_ADMIN' });
    const res = await patchUser(req, { params: Promise.resolve({ id: 'user-d' }) });

    expect(res.status).toBe(200);
  });
});

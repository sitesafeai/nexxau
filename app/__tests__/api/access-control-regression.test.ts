import { NextRequest, NextResponse } from 'next/server';
import {
  GET as getWorksite,
  PATCH as patchWorksite,
  DELETE as deleteWorksite,
} from '@/app/api/worksites/[id]/route';
import {
  POST as restartMediaMTX,
} from '@/app/api/mediamtx/restart/route';
import {
  POST as createCustomRule,
} from '@/app/api/custom-rules/route';
import { prisma } from '@/app/lib/prisma';
import {
  enforceWorksiteAccess,
  enforceWorksiteAdminAccess,
} from '@/app/lib/worksite-access';
import { requireSuperAdminOrInternalToken } from '@/app/lib/internal-route-auth';

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    worksite: {
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    cameraSystemConfig: {
      upsert: jest.fn(),
    },
    camera: {
      findUnique: jest.fn(),
    },
    customRule: {
      create: jest.fn(),
    },
  },
}));

jest.mock('@/app/lib/worksite-settings', () => ({
  clearWorksiteSettingsCache: jest.fn(),
}));

jest.mock('@/app/lib/worksite-access', () => ({
  enforceWorksiteAccess: jest.fn(),
  enforceWorksiteAdminAccess: jest.fn(),
}));

jest.mock('@/app/lib/internal-route-auth', () => ({
  requireSuperAdminOrInternalToken: jest.fn(),
}));

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

const routeParams = { params: Promise.resolve({ id: 'worksite-1' }) };

describe('critical API access-control regressions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('blocks unauthenticated worksite detail reads before querying tenant data', async () => {
    (enforceWorksiteAccess as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/worksites/worksite-1');
    const response = await getWorksite(request, routeParams);

    expect(response.status).toBe(401);
    expect(enforceWorksiteAccess).toHaveBeenCalledWith(request, 'worksite-1');
    expect(prisma.worksite.findFirst).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated worksite updates before applying changes', async () => {
    (enforceWorksiteAdminAccess as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/worksites/worksite-1', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'Compromised' }),
    });
    const response = await patchWorksite(request, routeParams);

    expect(response.status).toBe(401);
    expect(enforceWorksiteAdminAccess).toHaveBeenCalledWith(request, 'worksite-1');
    expect(prisma.worksite.update).not.toHaveBeenCalled();
    expect(prisma.cameraSystemConfig.upsert).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated worksite deletes before deleting data', async () => {
    (enforceWorksiteAdminAccess as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    );

    const request = new NextRequest('http://localhost/api/worksites/worksite-1', {
      method: 'DELETE',
    });
    const response = await deleteWorksite(request, routeParams);

    expect(response.status).toBe(401);
    expect(enforceWorksiteAdminAccess).toHaveBeenCalledWith(request, 'worksite-1');
    expect(prisma.worksite.delete).not.toHaveBeenCalled();
  });

  it('blocks unauthenticated host-control routes before shelling out', async () => {
    (requireSuperAdminOrInternalToken as jest.Mock).mockResolvedValue(
      NextResponse.json({ error: 'Forbidden' }, { status: 401 })
    );

    const response = await restartMediaMTX(
      new Request('http://localhost/api/mediamtx/restart', { method: 'POST' })
    );

    expect(response.status).toBe(401);
    expect(requireSuperAdminOrInternalToken).toHaveBeenCalled();
  });

  it('rejects custom rule creation when camera and worksite do not match', async () => {
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      worksiteId: 'other-worksite',
    });

    const response = await createCustomRule(
      new NextRequest('http://localhost/api/custom-rules', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Unsafe cross-tenant rule',
          detectionType: 'object_present',
          conditions: {},
          actions: ['create_alert'],
          cameraId: 'camera-1',
          worksiteId: 'worksite-1',
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(enforceWorksiteAdminAccess).not.toHaveBeenCalled();
    expect(prisma.customRule.create).not.toHaveBeenCalled();
  });
});

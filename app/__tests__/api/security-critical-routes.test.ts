import { NextRequest } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { getCachedSession } from '@/app/lib/session-cache';
import { getServerSession } from 'next-auth';
import { GET as getHls } from '@/app/api/hls/[...path]/route';
import { GET as getGlobalStats } from '@/app/api/admin/global-stats/route';
import { POST as postInvitation } from '@/app/api/invitations/send/route';
import { DELETE as deleteWorksite } from '@/app/api/worksites/[id]/route';

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    auditLog: { findFirst: jest.fn() },
    alert: { count: jest.fn() },
    camera: { count: jest.fn(), findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
    safetyScore: { aggregate: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    worksite: {
      delete: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      groupBy: jest.fn(),
    },
    worksiteUser: { create: jest.fn() },
    companyUser: { create: jest.fn() },
  },
}));

jest.mock('@/app/lib/session-cache', () => ({
  getCachedSession: jest.fn(),
}));

jest.mock('next-auth', () => ({
  getServerSession: jest.fn(),
}));

jest.mock('@/app/lib/auth', () => ({
  authOptions: {},
}));

jest.mock('@/app/lib/cache', () => ({
  withCache: jest.fn((_key: string, _ttl: number, fn: () => Promise<unknown>) => fn()),
}));

jest.mock('@/app/lib/email-service', () => ({
  sendInvitationEmail: jest.fn(),
}));

jest.mock('@/app/lib/worksite-settings', () => ({
  clearWorksiteSettingsCache: jest.fn(),
}));

describe('critical API authorization guards', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  it('rejects anonymous HLS proxy requests before fetching upstream video', async () => {
    (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
      worksiteId: 'worksite-1',
    });
    (getCachedSession as jest.Mock).mockResolvedValue(null);

    const response = await getHls(
      new NextRequest('http://localhost/api/hls/camera-1/index.m3u8'),
      { params: Promise.resolve({ path: ['camera-1', 'index.m3u8'] }) }
    );

    expect(response.status).toBe(401);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects anonymous worksite deletes before deleting data', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue(null);

    const response = await deleteWorksite(
      new NextRequest('http://localhost/api/worksites/worksite-1', {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: 'worksite-1' }) }
    );

    expect(response.status).toBe(401);
    expect(prisma.worksite.delete).not.toHaveBeenCalled();
  });

  it('rejects non-super-admin access to global stats before querying fleet data', async () => {
    (getCachedSession as jest.Mock).mockResolvedValue({
      user: { id: 'user-1', role: 'WORKER' },
    });

    const response = await getGlobalStats(
      new NextRequest('http://localhost/api/admin/global-stats')
    );

    expect(response.status).toBe(403);
    expect(prisma.worksite.groupBy).not.toHaveBeenCalled();
  });

  it('rejects anonymous invitations before creating users', async () => {
    (getServerSession as jest.Mock).mockResolvedValue(null);

    const response = await postInvitation(
      new NextRequest('http://localhost/api/invitations/send', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invitee@example.com',
          role: 'WORKER',
          companyId: 'company-1',
          invitedBy: 'spoofed-user',
        }),
      })
    );

    expect(response.status).toBe(401);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});

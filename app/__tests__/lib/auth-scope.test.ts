import { enforceCompanyScope, getActorCompanyId } from '@/app/lib/auth-scope';

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('@/app/lib/roles', () => ({
  normalizeRole: (r?: string | null) => (r ?? '').trim().toUpperCase(),
}));

import { prisma } from '@/app/lib/prisma';

const mkSession = (role: string, email = 'user@test.com') => ({
  user: { email, role },
});

describe('enforceCompanyScope', () => {
  beforeEach(() => jest.clearAllMocks());

  it('SUPER_ADMIN passes without touching the database', async () => {
    const result = await enforceCompanyScope({
      session: mkSession('SUPER_ADMIN'),
      resourceCompanyId: 'company-b',
    });
    expect(result).toEqual({ ok: true });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('allows access when actor and resource share the same company', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-a' });
    const result = await enforceCompanyScope({
      session: mkSession('COMPANY_ADMIN'),
      resourceCompanyId: 'company-a',
    });
    expect(result).toEqual({ ok: true });
  });

  it('denies access when actor is in a different company', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-a' });
    const result = await enforceCompanyScope({
      session: mkSession('COMPANY_ADMIN'),
      resourceCompanyId: 'company-b',
    });
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('denies when actor has no companyId', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyId: null });
    const result = await enforceCompanyScope({
      session: mkSession('COMPANY_ADMIN'),
      resourceCompanyId: 'company-a',
    });
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
  });

  it('denies when actor email is missing from session', async () => {
    const result = await enforceCompanyScope({
      session: { user: { email: null, role: 'WORKER' } },
      resourceCompanyId: 'company-a',
    });
    expect(result).toEqual({ ok: false, status: 403, error: 'Forbidden' });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});

describe('getActorCompanyId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns companyId for a known user', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ companyId: 'company-x' });
    const id = await getActorCompanyId({ user: { email: 'a@b.com', role: 'WORKER' } });
    expect(id).toBe('company-x');
  });

  it('returns null when email is absent', async () => {
    const id = await getActorCompanyId({ user: { email: null, role: 'WORKER' } });
    expect(id).toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when user is not found', async () => {
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const id = await getActorCompanyId({ user: { email: 'ghost@test.com', role: 'WORKER' } });
    expect(id).toBeNull();
  });
});

import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';

jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    company: {
      findUnique: jest.fn(),
    },
  },
}));

describe('authOptions jwt callback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-05-01T03:10:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('refreshes company suspension state even when pilot expiry refresh is not due', async () => {
    (prisma.company.findUnique as jest.Mock).mockResolvedValue({
      suspended: true,
      deletedAt: null,
    });

    const jwtCallback = authOptions.callbacks?.jwt;
    expect(jwtCallback).toBeDefined();

    const oneMinuteAgo = Date.now() - 60 * 1000;
    const elevenMinutesAgo = Date.now() - 11 * 60 * 1000;
    const token = await jwtCallback!({
      token: {
        id: 'user-1',
        role: 'COMPANY_ADMIN',
        companyId: 'company-1',
        pilotEndsAt: '2026-05-02T03:10:00.000Z',
        pilotEndsAtCheckedAt: oneMinuteAgo,
        companySuspended: false,
        companyStatusCheckedAt: elevenMinutesAgo,
      },
    } as any);

    expect(prisma.company.findUnique).toHaveBeenCalledWith({
      where: { id: 'company-1' },
      select: { suspended: true, deletedAt: true },
    });
    expect(token.companySuspended).toBe(true);
    expect(token.pilotEndsAt).toBe('2026-05-02T03:10:00.000Z');
    expect(token.pilotEndsAtCheckedAt).toBe(oneMinuteAgo);
    expect(token.companyStatusCheckedAt).toBe(Date.now());
  });
});

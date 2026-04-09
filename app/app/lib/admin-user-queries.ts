import { prisma } from '@/app/lib/prisma';
import type { Prisma } from '@prisma/client';

export type AdminUserListRow = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  companyId: string | null;
  worksiteId: string | null;
  isActivated: boolean;
  approved: boolean;
  mfaEnabled: boolean;
  lastLogin: string | null;
  createdAt: string;
  inviteExpires: string | null;
  company: { id: string; name: string } | null;
  worksite: { id: string; name: string; companyId: string } | null;
  worksiteAccess: Array<{
    id: string;
    worksiteId: string;
    role: string;
    worksite: { id: string; name: string; companyId: string };
  }>;
  companyAccess: Array<{
    id: string;
    companyId: string;
    role: string;
    company: { id: string; name: string };
  }>;
};

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  companyId: true,
  worksiteId: true,
  isActivated: true,
  approved: true,
  mfaEnabled: true,
  lastLogin: true,
  createdAt: true,
  inviteExpires: true,
  company: { select: { id: true, name: true } },
  worksite: { select: { id: true, name: true, companyId: true } },
  worksiteAccess: {
    select: {
      id: true,
      worksiteId: true,
      role: true,
      worksite: { select: { id: true, name: true, companyId: true } },
    },
  },
  companyAccess: {
    select: {
      id: true,
      companyId: true,
      role: true,
      company: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.UserSelect;

function mapUser(u: Prisma.UserGetPayload<{ select: typeof userSelect }>): AdminUserListRow {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    companyId: u.companyId,
    worksiteId: u.worksiteId,
    isActivated: u.isActivated,
    approved: u.approved,
    mfaEnabled: u.mfaEnabled,
    lastLogin: u.lastLogin?.toISOString() ?? null,
    createdAt: u.createdAt.toISOString(),
    inviteExpires: u.inviteExpires?.toISOString() ?? null,
    company: u.company,
    worksite: u.worksite,
    worksiteAccess: u.worksiteAccess.map((a) => ({
      id: a.id,
      worksiteId: a.worksiteId,
      role: a.role,
      worksite: a.worksite,
    })),
    companyAccess: u.companyAccess.map((a) => ({
      id: a.id,
      companyId: a.companyId,
      role: a.role,
      company: a.company,
    })),
  };
}

/**
 * List users visible to super-admin, optionally scoped by company and/or worksite.
 */
export async function listUsersForSuperAdmin(filters: {
  companyId?: string;
  worksiteId?: string;
}): Promise<AdminUserListRow[]> {
  const { companyId, worksiteId } = filters;

  if (worksiteId) {
    if (companyId) {
      const ws = await prisma.worksite.findUnique({
        where: { id: worksiteId },
        select: { companyId: true },
      });
      if (!ws) {
        return [];
      }
      if (ws.companyId !== companyId) {
        return [];
      }
    }

    const where: Prisma.UserWhereInput = {
      OR: [{ worksiteId }, { worksiteAccess: { some: { worksiteId } } }],
    };

    const rows = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map(mapUser);
  }

  if (companyId) {
    const where: Prisma.UserWhereInput = {
      OR: [
        { companyId },
        { companyAccess: { some: { companyId } } },
        { worksite: { companyId } },
        { worksiteAccess: { some: { worksite: { companyId } } } },
      ],
    };

    const rows = await prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return rows.map(mapUser);
  }

  const rows = await prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  return rows.map(mapUser);
}

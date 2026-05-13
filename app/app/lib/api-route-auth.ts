import { NextResponse } from 'next/server';
import type { Session } from 'next-auth';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/lib/auth';
import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

type AuthFailure = {
  ok: false;
  response: NextResponse;
};

type AuthSuccess<T extends Record<string, unknown> = Record<string, never>> = {
  ok: true;
  session: Session;
  userRole: string;
} & T;

export type AuthorizedCamera = {
  id: string;
  worksiteId: string;
  streamUrl: string | null;
  hlsUrl: string | null;
  mediamtxPath: string | null;
  worksite: {
    companyId: string;
  };
};

function authFailure(error: string, status: number): AuthFailure {
  return {
    ok: false,
    response: NextResponse.json({ error }, { status }),
  };
}

async function getActiveSessionUser(session: Session) {
  const userId = session.user?.id;
  if (!userId) return null;

  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      companyId: true,
      worksiteId: true,
      isActivated: true,
      approved: true,
    },
  });
}

export async function requireApiSession(): Promise<AuthSuccess | AuthFailure> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return authFailure('Unauthorized', 401);
  }

  const user = await getActiveSessionUser(session);
  if (!user || !user.isActivated || !user.approved) {
    return authFailure('Account not activated or approved', 403);
  }

  return {
    ok: true,
    session,
    userRole: normalizeRole(user.role || session.user.role),
  };
}

export async function requireSuperAdminSession(): Promise<AuthSuccess | AuthFailure> {
  const auth = await requireApiSession();
  if (!auth.ok) return auth;

  if (auth.userRole !== 'SUPER_ADMIN') {
    return authFailure('Forbidden', 403);
  }

  return auth;
}

export async function requireCameraAccess(
  cameraId: string
): Promise<AuthSuccess<{ camera: AuthorizedCamera }> | AuthFailure> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return authFailure('Unauthorized', 401);
  }

  const camera = await prisma.camera.findUnique({
    where: { id: cameraId },
    select: {
      id: true,
      worksiteId: true,
      streamUrl: true,
      hlsUrl: true,
      mediamtxPath: true,
      worksite: {
        select: {
          companyId: true,
        },
      },
    },
  });

  if (!camera) {
    return authFailure('Camera not found', 404);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      companyId: true,
      worksiteId: true,
      isActivated: true,
      approved: true,
      worksiteAccess: {
        where: { worksiteId: camera.worksiteId },
        select: { id: true },
      },
    },
  });

  if (!user || !user.isActivated || !user.approved) {
    return authFailure('Account not activated or approved', 403);
  }

  const userRole = normalizeRole(user.role || session.user.role);
  const canAccess =
    userRole === 'SUPER_ADMIN' ||
    (userRole === 'COMPANY_ADMIN' && user.companyId === camera.worksite.companyId) ||
    user.worksiteId === camera.worksiteId ||
    user.worksiteAccess.length > 0;

  if (!canAccess) {
    return authFailure('Access denied to camera', 403);
  }

  return {
    ok: true,
    session,
    userRole,
    camera,
  };
}

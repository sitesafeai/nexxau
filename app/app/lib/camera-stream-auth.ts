import { prisma } from '@/app/lib/prisma';
import { normalizeRole } from '@/app/lib/roles';

type SessionUser = {
  id?: string | null;
  role?: string | null;
  companyId?: string | null;
  worksiteId?: string | null;
};

export type AuthorizedStreamCamera = {
  id: string;
  streamUrl: string | null;
  hlsUrl: string | null;
  mediamtxPath: string | null;
  worksiteId: string;
};

type CameraAccessResult =
  | { status: 'ok'; camera: AuthorizedStreamCamera }
  | { status: 'not_found' }
  | { status: 'forbidden' };

export function isSuperAdmin(user?: SessionUser | null): boolean {
  return normalizeRole(user?.role) === 'SUPER_ADMIN';
}

export async function getAuthorizedStreamCamera(
  user: SessionUser,
  cameraKey: string,
  options: { allowMediamtxPath?: boolean } = {}
): Promise<CameraAccessResult> {
  const trimmedCameraKey = cameraKey.trim();
  if (!trimmedCameraKey) {
    return { status: 'not_found' };
  }

  const camera = await prisma.camera.findFirst({
    where: options.allowMediamtxPath
      ? { OR: [{ id: trimmedCameraKey }, { mediamtxPath: trimmedCameraKey }] }
      : { id: trimmedCameraKey },
    select: {
      id: true,
      streamUrl: true,
      hlsUrl: true,
      mediamtxPath: true,
      worksiteId: true,
      worksite: {
        select: {
          companyId: true,
          worksiteUsers: {
            where: user.id ? { userId: user.id } : { userId: '__missing_user__' },
            select: { id: true },
            take: 1,
          },
        },
      },
    },
  });

  if (!camera) {
    return { status: 'not_found' };
  }

  const hasAccess =
    isSuperAdmin(user) ||
    (Boolean(user.companyId) && user.companyId === camera.worksite.companyId) ||
    (Boolean(user.worksiteId) && user.worksiteId === camera.worksiteId) ||
    camera.worksite.worksiteUsers.length > 0;

  if (!hasAccess) {
    return { status: 'forbidden' };
  }

  return {
    status: 'ok',
    camera: {
      id: camera.id,
      streamUrl: camera.streamUrl,
      hlsUrl: camera.hlsUrl,
      mediamtxPath: camera.mediamtxPath,
      worksiteId: camera.worksiteId,
    },
  };
}

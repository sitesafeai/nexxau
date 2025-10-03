import { RBACManager, Permission, ResourceAccess } from '@/app/lib/rbac';
import { prisma } from '@/app/lib/prisma';

// Mock Prisma
jest.mock('@/app/lib/prisma', () => ({
  prisma: {
    camera: {
      findUnique: jest.fn(),
    },
    worksite: {
      findUnique: jest.fn(),
    },
    detection: {
      findUnique: jest.fn(),
    },
  },
}));

describe('RBACManager', () => {
  let rbacManager: RBACManager;

  beforeEach(() => {
    rbacManager = RBACManager.getInstance();
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true for admin with any permission', () => {
      const hasPermission = rbacManager.hasPermission('admin', Permission.CREATE_USER);
      expect(hasPermission).toBe(true);
    });

    it('should return true for site-manager with appropriate permissions', () => {
      const hasPermission = rbacManager.hasPermission('site-manager', Permission.READ_CAMERA);
      expect(hasPermission).toBe(true);
    });

    it('should return false for site-manager with admin-only permissions', () => {
      const hasPermission = rbacManager.hasPermission('site-manager', Permission.SYSTEM_ADMIN);
      expect(hasPermission).toBe(false);
    });

    it('should return true for worker with read permissions', () => {
      const hasPermission = rbacManager.hasPermission('worker', Permission.READ_CAMERA);
      expect(hasPermission).toBe(true);
    });

    it('should return false for worker with write permissions', () => {
      const hasPermission = rbacManager.hasPermission('worker', Permission.CREATE_CAMERA);
      expect(hasPermission).toBe(false);
    });

    it('should return true for viewer with read permissions', () => {
      const hasPermission = rbacManager.hasPermission('viewer', Permission.READ_ALERT);
      expect(hasPermission).toBe(true);
    });

    it('should return false for viewer with write permissions', () => {
      const hasPermission = rbacManager.hasPermission('viewer', Permission.CREATE_ALERT);
      expect(hasPermission).toBe(false);
    });

    it('should return false for unknown role', () => {
      const hasPermission = rbacManager.hasPermission('unknown-role', Permission.READ_USER);
      expect(hasPermission).toBe(false);
    });
  });

  describe('canAccessResource', () => {
    beforeEach(() => {
      (prisma.camera.findUnique as jest.Mock).mockResolvedValue({
        id: 'camera-1',
        worksiteId: 'worksite-1',
        worksite: { companyId: 'company-1' },
      });

      (prisma.worksite.findUnique as jest.Mock).mockResolvedValue({
        id: 'worksite-1',
        companyId: 'company-1',
      });

      (prisma.detection.findUnique as jest.Mock).mockResolvedValue({
        id: 'detection-1',
        camera: {
          worksiteId: 'worksite-1',
          worksite: { companyId: 'company-1' },
        },
      });
    });

    it('should return true for admin accessing any resource', async () => {
      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'camera-1',
        'admin',
        'worksite-1',
        'company-1'
      );
      expect(canAccess).toBe(true);
    });

    it('should return true for site-manager accessing worksite resource', async () => {
      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'camera-1',
        'site-manager',
        'worksite-1',
        'company-1'
      );
      expect(canAccess).toBe(true);
    });

    it('should return false for site-manager accessing different worksite resource', async () => {
      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'camera-1',
        'site-manager',
        'worksite-2', // Different worksite
        'company-1'
      );
      expect(canAccess).toBe(false);
    });

    it('should return true for worker accessing worksite resource', async () => {
      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'camera-1',
        'worker',
        'worksite-1',
        'company-1'
      );
      expect(canAccess).toBe(true);
    });

    it('should return false for worker accessing different worksite resource', async () => {
      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'camera-1',
        'worker',
        'worksite-2', // Different worksite
        'company-1'
      );
      expect(canAccess).toBe(false);
    });

    it('should return false when resource is not found', async () => {
      (prisma.camera.findUnique as jest.Mock).mockResolvedValue(null);

      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'non-existent-camera',
        'site-manager',
        'worksite-1',
        'company-1'
      );
      expect(canAccess).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      (prisma.camera.findUnique as jest.Mock).mockRejectedValue(new Error('Database error'));

      const canAccess = await rbacManager.canAccessResource(
        'user-1',
        'camera',
        'camera-1',
        'site-manager',
        'worksite-1',
        'company-1'
      );
      expect(canAccess).toBe(false);
    });
  });

  describe('getUserPermissions', () => {
    it('should return all permissions for admin', () => {
      const permissions = rbacManager.getUserPermissions('admin');
      expect(permissions).toContain(Permission.CREATE_USER);
      expect(permissions).toContain(Permission.SYSTEM_ADMIN);
      expect(permissions).toContain(Permission.READ_ANALYTICS);
      expect(permissions.length).toBeGreaterThan(20);
    });

    it('should return limited permissions for site-manager', () => {
      const permissions = rbacManager.getUserPermissions('site-manager');
      expect(permissions).toContain(Permission.READ_CAMERA);
      expect(permissions).toContain(Permission.CREATE_CAMERA);
      expect(permissions).not.toContain(Permission.SYSTEM_ADMIN);
      expect(permissions).not.toContain(Permission.DELETE_USER);
    });

    it('should return read-only permissions for worker', () => {
      const permissions = rbacManager.getUserPermissions('worker');
      expect(permissions).toContain(Permission.READ_CAMERA);
      expect(permissions).toContain(Permission.READ_DETECTION);
      expect(permissions).not.toContain(Permission.CREATE_CAMERA);
      expect(permissions).not.toContain(Permission.DELETE_CAMERA);
    });

    it('should return read-only permissions for viewer', () => {
      const permissions = rbacManager.getUserPermissions('viewer');
      expect(permissions).toContain(Permission.READ_CAMERA);
      expect(permissions).toContain(Permission.READ_ALERT);
      expect(permissions).not.toContain(Permission.CREATE_CAMERA);
      expect(permissions).not.toContain(Permission.UPDATE_CAMERA);
    });

    it('should return empty array for unknown role', () => {
      const permissions = rbacManager.getUserPermissions('unknown-role');
      expect(permissions).toEqual([]);
    });
  });

  describe('hasAllPermissions', () => {
    it('should return true when user has all required permissions', () => {
      const hasAll = rbacManager.hasAllPermissions('admin', [
        Permission.READ_USER,
        Permission.CREATE_USER,
        Permission.UPDATE_USER,
      ]);
      expect(hasAll).toBe(true);
    });

    it('should return false when user lacks any required permission', () => {
      const hasAll = rbacManager.hasAllPermissions('worker', [
        Permission.READ_CAMERA,
        Permission.CREATE_CAMERA, // Worker doesn't have this
      ]);
      expect(hasAll).toBe(false);
    });

    it('should return true for empty permission list', () => {
      const hasAll = rbacManager.hasAllPermissions('admin', []);
      expect(hasAll).toBe(true);
    });
  });

  describe('hasAnyPermission', () => {
    it('should return true when user has at least one permission', () => {
      const hasAny = rbacManager.hasAnyPermission('worker', [
        Permission.CREATE_CAMERA, // Worker doesn't have this
        Permission.READ_CAMERA,    // Worker has this
      ]);
      expect(hasAny).toBe(true);
    });

    it('should return false when user has none of the permissions', () => {
      const hasAny = rbacManager.hasAnyPermission('worker', [
        Permission.CREATE_CAMERA,
        Permission.DELETE_CAMERA,
        Permission.SYSTEM_ADMIN,
      ]);
      expect(hasAny).toBe(false);
    });

    it('should return false for empty permission list', () => {
      const hasAny = rbacManager.hasAnyPermission('admin', []);
      expect(hasAny).toBe(false);
    });
  });
});

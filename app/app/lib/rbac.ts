import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './prisma';
import { jwtManager, JWTPayload } from './jwt';
import { ADMIN_ROLES, isAdminRole, normalizeRole } from './roles';

// Define permission types
export enum Permission {
  // User Management
  CREATE_USER = 'create:user',
  READ_USER = 'read:user',
  UPDATE_USER = 'update:user',
  DELETE_USER = 'delete:user',
  
  // Worksite Management
  CREATE_WORKSITE = 'create:worksite',
  READ_WORKSITE = 'read:worksite',
  UPDATE_WORKSITE = 'update:worksite',
  DELETE_WORKSITE = 'delete:worksite',
  
  // Camera Management
  CREATE_CAMERA = 'create:camera',
  READ_CAMERA = 'read:camera',
  UPDATE_CAMERA = 'update:camera',
  DELETE_CAMERA = 'delete:camera',
  
  // Detection Management
  READ_DETECTION = 'read:detection',
  CREATE_DETECTION = 'create:detection',
  UPDATE_DETECTION = 'update:detection',
  DELETE_DETECTION = 'delete:detection',
  
  // Alert Management
  CREATE_ALERT = 'create:alert',
  READ_ALERT = 'read:alert',
  UPDATE_ALERT = 'update:alert',
  DELETE_ALERT = 'delete:alert',
  
  // Analytics
  READ_ANALYTICS = 'read:analytics',
  EXPORT_ANALYTICS = 'export:analytics',
  
  // System Administration
  SYSTEM_ADMIN = 'system:admin',
  MANAGE_SETTINGS = 'manage:settings',
  VIEW_LOGS = 'view:logs'
}

// Define role permissions
const ADMIN_PERMISSIONS: Permission[] = [
  Permission.CREATE_USER,
  Permission.READ_USER,
  Permission.UPDATE_USER,
  Permission.DELETE_USER,
  Permission.CREATE_WORKSITE,
  Permission.READ_WORKSITE,
  Permission.UPDATE_WORKSITE,
  Permission.DELETE_WORKSITE,
  Permission.CREATE_CAMERA,
  Permission.READ_CAMERA,
  Permission.UPDATE_CAMERA,
  Permission.DELETE_CAMERA,
  Permission.READ_DETECTION,
  Permission.CREATE_DETECTION,
  Permission.UPDATE_DETECTION,
  Permission.DELETE_DETECTION,
  Permission.CREATE_ALERT,
  Permission.READ_ALERT,
  Permission.UPDATE_ALERT,
  Permission.DELETE_ALERT,
  Permission.READ_ANALYTICS,
  Permission.EXPORT_ANALYTICS,
  Permission.SYSTEM_ADMIN,
  Permission.MANAGE_SETTINGS,
  Permission.VIEW_LOGS,
];

const SITE_ADMIN_PERMISSIONS: Permission[] = [
  Permission.READ_USER,
  Permission.UPDATE_USER,
  Permission.CREATE_WORKSITE,
  Permission.READ_WORKSITE,
  Permission.UPDATE_WORKSITE,
  Permission.CREATE_CAMERA,
  Permission.READ_CAMERA,
  Permission.UPDATE_CAMERA,
  Permission.DELETE_CAMERA,
  Permission.READ_DETECTION,
  Permission.CREATE_DETECTION,
  Permission.READ_ALERT,
  Permission.UPDATE_ALERT,
  Permission.READ_ANALYTICS,
  Permission.EXPORT_ANALYTICS,
];

const SUPERVISOR_PERMISSIONS: Permission[] = [
  Permission.READ_CAMERA,
  Permission.READ_DETECTION,
  Permission.CREATE_ALERT,
  Permission.READ_ALERT,
  Permission.UPDATE_ALERT,
  Permission.READ_ANALYTICS,
];

const WORKER_PERMISSIONS: Permission[] = [
  Permission.READ_CAMERA,
  Permission.READ_DETECTION,
  Permission.READ_ALERT,
  Permission.READ_ANALYTICS,
];

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  SUPER_ADMIN: ADMIN_PERMISSIONS,
  COMPANY_ADMIN: ADMIN_PERMISSIONS,
  SALES_ADMIN: ADMIN_PERMISSIONS,
  MARKETING_ADMIN: ADMIN_PERMISSIONS,
  OPERATIONS_ADMIN: ADMIN_PERMISSIONS,
  SAFETY_ADMIN: ADMIN_PERMISSIONS,
  FINANCE_ADMIN: ADMIN_PERMISSIONS,
  HR_ADMIN: ADMIN_PERMISSIONS,
  SUPPORT_ADMIN: ADMIN_PERMISSIONS,
  CUSTOMER_SUCCESS: ADMIN_PERMISSIONS,
  SITE_ADMIN: SITE_ADMIN_PERMISSIONS,
  SUPERVISOR: SUPERVISOR_PERMISSIONS,
  WORKER: WORKER_PERMISSIONS,
  VIEWER: WORKER_PERMISSIONS,
};

// Resource access levels
export enum ResourceAccess {
  OWN = 'own',           // Only own resources
  WORKSITE = 'worksite', // Worksite resources
  COMPANY = 'company',   // Company resources
  GLOBAL = 'global'      // All resources
}

export class RBACManager {
  private static instance: RBACManager;

  private constructor() {}

  public static getInstance(): RBACManager {
    if (!RBACManager.instance) {
      RBACManager.instance = new RBACManager();
    }
    return RBACManager.instance;
  }

  // Check if user has permission
  public hasPermission(userRole: string, permission: Permission): boolean {
    const normalizedRole = normalizeRole(userRole);
    const rolePermissions = ROLE_PERMISSIONS[normalizedRole] || [];
    return rolePermissions.includes(permission);
  }

  // Check if user can access resource
  public async canAccessResource(
    userId: string,
    resourceType: string,
    resourceId: string,
    userRole: string,
    userWorksiteId?: string,
    userCompanyId?: string
  ): Promise<boolean> {
    try {
      const normalizedRole = normalizeRole(userRole);

      if (isAdminRole(normalizedRole)) {
        return true;
      }

      // Get resource details
      const resource = await this.getResourceDetails(resourceType, resourceId);
      if (!resource) return false;

      // Check access based on role
      switch (normalizedRole) {
        case 'SITE_ADMIN':
        case 'SUPERVISOR':
          return resource.worksiteId === userWorksiteId;
        
        case 'WORKER':
        case 'VIEWER':
          return resource.worksiteId === userWorksiteId;
        
        default:
          return false;
      }
    } catch (error) {
      console.error('Resource access check failed:', error);
      return false;
    }
  }

  // Get user permissions
  public getUserPermissions(userRole: string): Permission[] {
    const normalizedRole = normalizeRole(userRole);
    return ROLE_PERMISSIONS[normalizedRole] || [];
  }

  // Check multiple permissions
  public hasAllPermissions(userRole: string, permissions: Permission[]): boolean {
    return permissions.every(permission => this.hasPermission(normalizeRole(userRole), permission));
  }

  // Check any permission
  public hasAnyPermission(userRole: string, permissions: Permission[]): boolean {
    return permissions.some(permission => this.hasPermission(normalizeRole(userRole), permission));
  }

  // Get resource details
  private async getResourceDetails(resourceType: string, resourceId: string): Promise<any> {
    switch (resourceType) {
      case 'camera':
        return await prisma.camera.findUnique({
          where: { id: resourceId },
          select: { id: true, worksiteId: true, worksite: { select: { companyId: true } } }
        });
      
      case 'worksite':
        return await prisma.worksite.findUnique({
          where: { id: resourceId },
          select: { id: true, companyId: true }
        });
      
      case 'detection':
        return await prisma.detection.findUnique({
          where: { id: resourceId },
          select: { 
            id: true, 
            camera: { 
              select: { 
                worksiteId: true, 
                worksite: { select: { companyId: true } } 
              } 
            } 
          }
        });
      
      default:
        return null;
    }
  }
}

// Middleware for permission checking
export function requirePermission(permission: Permission) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const token = jwtManager.extractTokenFromRequest(request);
      if (!token) {
        return new NextResponse('Unauthorized', { status: 401 });
      }

      const payload = jwtManager.verifyAccessToken(token);
      if (!payload) {
        return new NextResponse('Invalid token', { status: 401 });
      }

      const rbac = RBACManager.getInstance();
      if (!rbac.hasPermission(payload.role, permission)) {
        const errorMessage = `Forbidden. You don't have permission to access this resource. Your role is ${payload.role}.`;
        
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: errorMessage,
            userRole: payload.role,
          },
          { status: 403 }
        );
      }

      return null; // Allow request to proceed
    } catch (error) {
      console.error('Permission check failed:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  };
}

// Middleware for resource access checking
export function requireResourceAccess(resourceType: string, resourceIdParam: string) {
  return async (request: NextRequest): Promise<NextResponse | null> => {
    try {
      const token = jwtManager.extractTokenFromRequest(request);
      if (!token) {
        return new NextResponse('Unauthorized', { status: 401 });
      }

      const payload = jwtManager.verifyAccessToken(token);
      if (!payload) {
        return new NextResponse('Invalid token', { status: 401 });
      }

      const resourceId = request.nextUrl.searchParams.get(resourceIdParam);
      if (!resourceId) {
        return new NextResponse('Resource ID required', { status: 400 });
      }

      const rbac = RBACManager.getInstance();
      const canAccess = await rbac.canAccessResource(
        payload.userId,
        resourceType,
        resourceId,
        payload.role,
        payload.worksiteId,
        payload.companyId
      );

      if (!canAccess) {
        return new NextResponse('Forbidden', { status: 403 });
      }

      return null; // Allow request to proceed
    } catch (error) {
      console.error('Resource access check failed:', error);
      return new NextResponse('Internal Server Error', { status: 500 });
    }
  };
}

// Export singleton instance
export const rbacManager = RBACManager.getInstance();

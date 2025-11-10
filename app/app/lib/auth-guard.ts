import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";
import {
  hasRequiredRole,
  normalizeRole,
  normalizeRoles,
} from "./roles";

export interface AuthGuardOptions {
  requiredRole?: string;
  redirectTo?: string;
  requireAuth?: boolean;
}

export interface UserSession {
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
  };
}

// Server-side authentication guard
export async function requireAuth(options: AuthGuardOptions = {}) {
  const {
    requiredRole,
    redirectTo = "/login",
    requireAuth = true,
  } = options;

  const session = await getServerSession(authOptions);

  if (requireAuth && !session) {
    redirect(redirectTo);
  }

  if (requiredRole && !hasRequiredRole(session?.user?.role, requiredRole)) {
    redirect(redirectTo);
  }

  return session as UserSession;
}

// Role-based access control
export function hasRole(userRole: string, requiredRoles: string | string[]): boolean {
  return hasRequiredRole(userRole, requiredRoles);
}

// Route protection based on user role
export function getProtectedRoutes(userRole: string) {
  const normalizedRole = normalizeRole(userRole);
  const routes: Record<string, string[]> = {
    SUPER_ADMIN: [
      "/admin",
      "/admin/companies",
      "/admin/worksites",
      "/admin/workers",
      "/admin/settings",
    ],
    COMPANY_ADMIN: [
      "/admin",
      "/admin/companies",
      "/admin/worksites",
      "/admin/workers",
      "/admin/settings",
    ],
    SITE_ADMIN: [
      "/dashboard",
      "/dashboard/object-detection",
      "/workflow",
      "/cameras",
    ],
    SUPERVISOR: [
      "/dashboard",
      "/dashboard/object-detection",
    ],
    WORKER: [
      "/dashboard",
      "/dashboard/object-detection",
    ],
    VIEWER: [
      "/dashboard",
    ],
  };

  return routes[normalizedRole] || [];
}

// Check if user can access a specific route
export function canAccessRoute(userRole: string, route: string): boolean {
  const protectedRoutes = getProtectedRoutes(userRole);
  return protectedRoutes.some(protectedRoute =>
    route.startsWith(protectedRoute)
  );
}
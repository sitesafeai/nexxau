'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import {
  ADMIN_ROLES,
  hasRequiredRole,
  normalizeRole,
  normalizeRoles,
} from './roles';

export interface UseAuthOptions {
  requiredRole?: string;
  redirectTo?: string;
  requireAuth?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const {
    requiredRole,
    redirectTo = '/login',
    requireAuth = true,
  } = options;

  const { data: session, status } = useSession();
  const router = useRouter();
  const userRole = normalizeRole(session?.user?.role);

  useEffect(() => {
    if (status === 'loading') return;

    if (requireAuth && status === 'unauthenticated') {
      router.push(redirectTo);
      return;
    }

    if (requiredRole && !hasRequiredRole(userRole, requiredRole)) {
      router.push(redirectTo);
    }
  }, [
    status,
    requireAuth,
    requiredRole,
    redirectTo,
    router,
    userRole,
    ADMIN_ROLES,
  ]);

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const user = session?.user;

  const hasRole = (requiredRoles: string | string[]) => {
    if (isLoading) return false;
    return hasRequiredRole(userRole, requiredRoles);
  };

  const canAccessRoute = (route: string) => {
    if (!userRole) return false;

    const protectedRoutes = {
      SUPER_ADMIN: [
        '/admin',
        '/admin/companies',
        '/admin/worksites',
        '/admin/workers',
        '/admin/settings',
      ],
      COMPANY_ADMIN: [
        '/admin',
        '/admin/companies',
        '/admin/worksites',
        '/admin/workers',
        '/admin/settings',
      ],
      SITE_ADMIN: [
        '/dashboard',
        '/dashboard/object-detection',
        '/workflow',
        '/cameras',
      ],
      SUPERVISOR: [
        '/dashboard',
        '/dashboard/object-detection',
      ],
      WORKER: [
        '/dashboard',
      ],
      VIEWER: [
        '/dashboard',
      ],
    } as Record<string, string[]>;

    const userRoutes = protectedRoutes[userRole] || [];
    return userRoutes.some(protectedRoute => route.startsWith(protectedRoute));
  };

  const safeHasRole = (requiredRoles: string | string[]) => {
    return hasRole(requiredRoles);
  };

  return {
    session,
    user,
    isAuthenticated,
    isLoading,
    hasRole: safeHasRole,
    canAccessRoute,
    status,
    userRole,
  };
}
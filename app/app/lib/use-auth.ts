'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export interface UseAuthOptions {
  requiredRole?: string;
  redirectTo?: string;
  requireAuth?: boolean;
}

export function useAuth(options: UseAuthOptions = {}) {
  const {
    requiredRole,
    redirectTo = "/login",
    requireAuth = true,
  } = options;

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If still loading, don't do anything
    if (status === 'loading') return;

    // If authentication is required and user is not authenticated, redirect
    if (requireAuth && status === 'unauthenticated') {
      router.push(redirectTo);
      return;
    }

    // If a specific role is required
    if (requiredRole && session?.user?.role !== requiredRole) {
      // Redirect based on user's role
      switch (session?.user?.role) {
        case "admin":
          router.push("/admin");
          break;
        case "site-manager":
        case "worker":
        case "viewer":
          router.push("/dashboard");
          break;
        default:
          router.push("/login");
          break;
      }
      return;
    }
  }, [session, status, requireAuth, requiredRole, redirectTo, router]);

  const isAuthenticated = status === 'authenticated';
  const isLoading = status === 'loading';
  const user = session?.user;

  // Role-based access control helpers
  const hasRole = (requiredRoles: string | string[]) => {
    if (!user?.role) return false;
    
    if (typeof requiredRoles === "string") {
      requiredRoles = [requiredRoles];
    }

    // Admin has access to everything
    if (user.role === "admin") return true;

    // Site manager has access to most things
    if (user.role === "site-manager" && requiredRoles.includes("site-manager")) return true;

    // Worker has limited access
    if (user.role === "worker" && requiredRoles.includes("worker")) return true;

    // Viewer has very limited access
    if (user.role === "viewer" && requiredRoles.includes("viewer")) return true;

    return false;
  };

  const canAccessRoute = (route: string) => {
    if (!user?.role) return false;

    const protectedRoutes = {
      admin: [
        "/admin",
        "/admin/companies",
        "/admin/worksites",
        "/admin/workers",
        "/admin/settings",
      ],
      "site-manager": [
        "/dashboard",
        "/dashboard/object-detection",
        "/workflow",
        "/cameras",
      ],
      worker: [
        "/dashboard",
        "/dashboard/object-detection",
      ],
      viewer: [
        "/dashboard",
      ],
    };

    const userRoutes = protectedRoutes[user.role as keyof typeof protectedRoutes] || [];
    return userRoutes.some(protectedRoute => route.startsWith(protectedRoute));
  };

  // Ensure hasRole is always a function, even during loading
  const safeHasRole = (requiredRoles: string | string[]) => {
    if (isLoading || !user?.role) return false;
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
  };
} 
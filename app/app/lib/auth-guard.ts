import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "./auth";

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

  // If authentication is required but no session exists
  // Temporarily disable hard redirect to allow dashboard work without auth
  if (requireAuth && !session) {
    return { session: null } as any;
  }

  // If a specific role is required
  if (requiredRole && session?.user?.role !== requiredRole) {
    // Redirect based on user's role
    switch (session?.user?.role) {
      case "admin":
        redirect("/admin");
      case "site-manager":
        redirect("/dashboard");
      case "worker":
        redirect("/dashboard");
      case "viewer":
        redirect("/dashboard");
      default:
        redirect("/login");
    }
  }

  return session as UserSession;
}

// Role-based access control
export function hasRole(userRole: string, requiredRoles: string | string[]): boolean {
  if (typeof requiredRoles === "string") {
    requiredRoles = [requiredRoles];
  }

  // Admin has access to everything
  if (userRole === "admin") return true;

  // Site manager has access to most things
  if (userRole === "site-manager" && requiredRoles.includes("site-manager")) return true;

  // Worker has limited access
  if (userRole === "worker" && requiredRoles.includes("worker")) return true;

  // Viewer has very limited access
  if (userRole === "viewer" && requiredRoles.includes("viewer")) return true;

  return false;
}

// Route protection based on user role
export function getProtectedRoutes(userRole: string) {
  const routes = {
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

  return routes[userRole as keyof typeof routes] || [];
}

// Check if user can access a specific route
export function canAccessRoute(userRole: string, route: string): boolean {
  const protectedRoutes = getProtectedRoutes(userRole);
  return protectedRoutes.some(protectedRoute => 
    route.startsWith(protectedRoute)
  );
} 
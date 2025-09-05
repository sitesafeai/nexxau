'use client';

import { useAuth } from '../lib/use-auth';
import { ReactNode } from 'react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string;
  redirectTo?: string;
  requireAuth?: boolean;
  fallback?: ReactNode;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = "/login",
  requireAuth = true,
  fallback = <div>Loading...</div>,
}: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, hasRole, user } = useAuth({
    requiredRole,
    redirectTo,
    requireAuth,
  });

  // Show loading state while checking authentication
  if (isLoading) {
    return <>{fallback}</>;
  }

  // If authentication is not required, render children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If not authenticated, redirect will happen automatically
  if (!isAuthenticated) {
    return null;
  }

  // If role is required, check if user has it
  if (requiredRole && !hasRole(requiredRole)) {
    return null; // Redirect will happen automatically
  }

  // User is authenticated and has required role (if any)
  return <>{children}</>;
}

// Convenience components for specific roles
export function AdminOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="admin" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function SiteManagerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="site-manager" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function WorkerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="worker" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function ViewerOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requiredRole="viewer" fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
}

export function AuthenticatedOnly({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <ProtectedRoute requireAuth={true} fallback={fallback}>
      {children}
    </ProtectedRoute>
  );
} 
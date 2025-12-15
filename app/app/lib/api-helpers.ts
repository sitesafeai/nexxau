/**
 * Helper functions for API routes to return consistent error messages with role information
 */

import { NextResponse } from 'next/server';
import { getForbiddenMessage } from './error-messages';
import { normalizeRole } from './roles';

/**
 * Check if user has required role and return forbidden response if not
 */
export function checkRole(
  userRole: string | null | undefined,
  requiredRole: string | string[],
  action: string = 'access this resource'
): NextResponse | null {
  if (!userRole) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource.',
      },
      { status: 401 }
    );
  }

  const normalizedUserRole = normalizeRole(userRole);
  const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
  const normalizedRequired = requiredRoles.map(r => normalizeRole(r));

  // Check if user role matches any required role
  const hasAccess = normalizedRequired.some(role => {
    // SUPER_ADMIN has access to everything
    if (normalizedUserRole === 'SUPER_ADMIN') return true;
    return normalizedUserRole === role;
  });

  if (!hasAccess) {
    const errorMessage = getForbiddenMessage({
      requiredRole: requiredRoles.length === 1 ? requiredRoles[0] : requiredRoles,
      userRole: userRole,
      action: action,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: errorMessage,
        requiredRole: requiredRoles.length === 1 ? requiredRoles[0] : requiredRoles,
        userRole: userRole,
      },
      { status: 403 }
    );
  }

  return null; // User has access
}

/**
 * Check if user is admin (any admin role)
 */
export function requireAdmin(
  userRole: string | null | undefined,
  action: string = 'access this resource'
): NextResponse | null {
  if (!userRole) {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized',
        message: 'You must be logged in to access this resource.',
      },
      { status: 401 }
    );
  }

  const normalizedRole = normalizeRole(userRole);
  const adminRoles = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'];

  if (!adminRoles.includes(normalizedRole)) {
    const errorMessage = getForbiddenMessage({
      requiredRole: 'an administrator',
      userRole: userRole,
      action: action,
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden',
        message: errorMessage,
        requiredRole: 'ADMIN',
        userRole: userRole,
      },
      { status: 403 }
    );
  }

  return null; // User is admin
}

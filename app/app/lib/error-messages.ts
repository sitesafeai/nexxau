/**
 * Utility functions for generating helpful error messages with role information
 */

import { formatRoleLabel, normalizeRole } from './roles';

export interface ForbiddenErrorOptions {
  requiredRole?: string | string[];
  userRole?: string;
  resource?: string;
  action?: string;
}

/**
 * Generate a helpful forbidden error message with role information
 */
export function getForbiddenMessage(options: ForbiddenErrorOptions): string {
  const { requiredRole, userRole, resource, action } = options;
  
  const normalizedUserRole = userRole ? normalizeRole(userRole) : null;
  const formattedUserRole = normalizedUserRole ? formatRoleLabel(normalizedUserRole) : null;
  
  // Handle multiple required roles
  let formattedRequiredRoles: string;
  if (Array.isArray(requiredRole)) {
    formattedRequiredRoles = requiredRole.map(r => formatRoleLabel(r)).join(' or ');
  } else if (requiredRole) {
    formattedRequiredRoles = formatRoleLabel(requiredRole);
  } else {
    formattedRequiredRoles = 'an authorized role';
  }
  
  // Build the message
  let message = 'Access forbidden. ';
  
  if (requiredRole && userRole) {
    message += `Only ${formattedRequiredRoles} can ${action || 'access this page'}. `;
    message += `You are currently logged in as ${formattedUserRole}.`;
  } else if (requiredRole) {
    message += `Only ${formattedRequiredRoles} can ${action || 'access this page'}.`;
  } else if (userRole) {
    message += `You don't have permission to ${action || 'access this resource'}. `;
    message += `Your current role is ${formattedUserRole}.`;
  } else {
    message += `You don't have permission to ${action || 'access this resource'}.`;
  }
  
  if (resource) {
    message += ` Resource: ${resource}`;
  }
  
  return message;
}

/**
 * Create a NextResponse with a helpful forbidden error message
 */
export function createForbiddenResponse(
  options: ForbiddenErrorOptions,
  status: number = 403
) {
  const message = getForbiddenMessage(options);
  
  return {
    success: false,
    error: 'Forbidden',
    message,
    requiredRole: options.requiredRole,
    userRole: options.userRole,
  };
}

/**
 * Create query parameters for redirecting to forbidden page with role info
 */
export function createForbiddenRedirectParams(options: ForbiddenErrorOptions): string {
  const params = new URLSearchParams();
  
  if (options.requiredRole) {
    if (Array.isArray(options.requiredRole)) {
      params.append('requiredRole', options.requiredRole.join(','));
    } else {
      params.append('requiredRole', options.requiredRole);
    }
  }
  
  if (options.userRole) {
    params.append('userRole', options.userRole);
  }
  
  return params.toString();
}

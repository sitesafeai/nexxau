const ROLE_ALIAS_MAP: Record<string, string> = {
  ADMIN: 'COMPANY_ADMIN',
  SITE_MANAGER: 'SITE_ADMIN',
  MANAGER: 'SUPERVISOR',
  SUPERADMIN: 'SUPER_ADMIN',
};

export const ADMIN_ROLES = new Set<string>([
  'SUPER_ADMIN',
  'COMPANY_ADMIN',
  'SITE_ADMIN',
  'SALES_ADMIN',
  'MARKETING_ADMIN',
  'OPERATIONS_ADMIN',
  'SAFETY_ADMIN',
  'FINANCE_ADMIN',
  'HR_ADMIN',
  'SUPPORT_ADMIN',
  'CUSTOMER_SUCCESS',
]);

export const normalizeRole = (role?: string | null): string => {
  if (!role) return '';
  const normalized = role.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');
  return ROLE_ALIAS_MAP[normalized] || normalized;
};

export const normalizeRoles = (roles?: string | string[]): string[] => {
  if (!roles) return [];
  const roleArray = Array.isArray(roles) ? roles : [roles];
  return roleArray.map(normalizeRole);
};

export const isAdminRole = (role?: string | null): boolean => {
  return ADMIN_ROLES.has(normalizeRole(role));
};

export const hasRequiredRole = (
  userRole: string | null | undefined,
  requiredRoles?: string | string[]
): boolean => {
  if (!requiredRoles) return true;
  const normalizedUserRole = normalizeRole(userRole);
  if (!normalizedUserRole) return false;
  if (normalizedUserRole === 'SUPER_ADMIN') return true;

  const normalizedRequired = normalizeRoles(requiredRoles);
  if (normalizedRequired.includes('ADMIN')) {
    return isAdminRole(normalizedUserRole);
  }

  return normalizedRequired.includes(normalizedUserRole);
};

export const formatRoleLabel = (role?: string | null): string => {
  const normalized = normalizeRole(role);
  if (!normalized) return 'User';
  return normalized
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};


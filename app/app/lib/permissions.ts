/**
 * Role-Based Access Control (RBAC) Permissions System
 * 
 * This module defines what each role can do in the system.
 * Use these functions in both UI (to show/hide features) and API (to validate access).
 */

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'COMPANY_ADMIN' 
  | 'SITE_ADMIN' 
  | 'SUPERVISOR' 
  | 'WORKER' 
  | 'VIEWER';

// ============================================================================
// COMPANY PERMISSIONS
// ============================================================================

export function canCreateCompany(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canEditCompany(role: UserRole, userId: string, company: any): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'COMPANY_ADMIN' && company.id === userId) return true;
  return false;
}

export function canDeleteCompany(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canViewCompanyAnalytics(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}

// ============================================================================
// WORKSITE PERMISSIONS
// ============================================================================

export function canCreateWorksite(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}

export function canEditWorksite(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canDeleteWorksite(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}

export function canViewWorksite(role: UserRole): boolean {
  // All roles can view worksites they have access to
  return true;
}


// ============================================================================
// USER MANAGEMENT PERMISSIONS
// ============================================================================

/**
 * Check if a user can invite another user with a specific role
 */
export function canInviteUser(inviterRole: UserRole, targetRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    'SUPER_ADMIN': 6,
    'COMPANY_ADMIN': 5,
    'SITE_ADMIN': 4,
    'SUPERVISOR': 3,
    'WORKER': 2,
    'VIEWER': 1
  };

  // Specific invitation rules
  if (inviterRole === 'SUPER_ADMIN') {
    // Super admin can invite anyone
    return true;
  }

  if (inviterRole === 'COMPANY_ADMIN') {
    // Company admin can invite everyone except SUPER_ADMIN and COMPANY_ADMIN
    return !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(targetRole);
  }

  if (inviterRole === 'SITE_ADMIN') {
    // Site admin can only invite SUPERVISOR, WORKER, VIEWER
    return ['SUPERVISOR', 'WORKER', 'VIEWER'].includes(targetRole);
  }

  // SUPERVISOR, WORKER, VIEWER cannot invite anyone
  return false;
}

export function canRemoveUser(role: UserRole, targetUserRole: UserRole): boolean {
  if (role === 'SUPER_ADMIN') return true;
  if (role === 'COMPANY_ADMIN') {
    // Cannot remove other COMPANY_ADMINs or SUPER_ADMINs
    return !['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(targetUserRole);
  }
  if (role === 'SITE_ADMIN') {
    // Can only remove users they invited (SUPERVISOR, WORKER, VIEWER)
    return ['SUPERVISOR', 'WORKER', 'VIEWER'].includes(targetUserRole);
  }
  return false;
}

export function canEditUserRole(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}

export function canViewUsers(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

// ============================================================================
// CAMERA PERMISSIONS
// ============================================================================

/**
 * Only super-admins can add cameras.
 * Backend provisions Janus automatically (DB first → mountpoint → RTP).
 */
export function canCreateCamera(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canEditCamera(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canDeleteCamera(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canViewCameras(role: UserRole): boolean {
  // All roles can view cameras
  return true;
}

export function canConfigureCameraSettings(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

// ============================================================================
// ALERT PERMISSIONS
// ============================================================================

export function canCreateAlertRule(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canEditAlertRule(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canDeleteAlertRule(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canAcknowledgeAlerts(role: UserRole): boolean {
  // WORKER and VIEWER cannot acknowledge alerts
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR'].includes(role);
}

export function canResolveAlerts(role: UserRole): boolean {
  // Same as acknowledge
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR'].includes(role);
}

export function canDeleteAlerts(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canViewAlerts(role: UserRole): boolean {
  // All roles can view alerts
  return true;
}

// ============================================================================
// ANALYTICS & REPORTS PERMISSIONS
// ============================================================================

export function canViewWorksiteAnalytics(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR'].includes(role);
}

export function canExportReports(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN', 'SUPERVISOR'].includes(role);
}

export function canViewSystemAnalytics(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

// ============================================================================
// CUSTOM RULES & SAFETY PERMISSIONS
// ============================================================================

export function canCreateCustomRule(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canEditCustomRule(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canDeleteCustomRule(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canConfigureSafetyScore(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

// ============================================================================
// SETTINGS & CONFIGURATION PERMISSIONS
// ============================================================================

export function canAccessSystemSettings(role: UserRole): boolean {
  return role === 'SUPER_ADMIN';
}

export function canAccessCompanySettings(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}

export function canAccessWorksiteSettings(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canManageEmergencyContacts(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

// ============================================================================
// WORKFLOW & AUTOMATION PERMISSIONS
// ============================================================================

export function canCreateWorkflow(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canEditWorkflow(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

export function canDeleteWorkflow(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

// ============================================================================
// API & INTEGRATION PERMISSIONS
// ============================================================================

export function canManageApiKeys(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN'].includes(role);
}

export function canAccessApiDocs(role: UserRole): boolean {
  return ['SUPER_ADMIN', 'COMPANY_ADMIN', 'SITE_ADMIN'].includes(role);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get all permissions for a role as a boolean map
 */
export function getPermissionsForRole(role: UserRole): Record<string, boolean> {
  return {
    // Companies
    createCompany: canCreateCompany(role),
    deleteCompany: canDeleteCompany(role),
    viewCompanyAnalytics: canViewCompanyAnalytics(role),
    
    // Worksites
    createWorksite: canCreateWorksite(role),
    editWorksite: canEditWorksite(role),
    deleteWorksite: canDeleteWorksite(role),
    
    // Users
    viewUsers: canViewUsers(role),
    editUserRole: canEditUserRole(role),
    
    // Cameras
    createCamera: canCreateCamera(role),
    editCamera: canEditCamera(role),
    deleteCamera: canDeleteCamera(role),
    configureCameraSettings: canConfigureCameraSettings(role),
    
    // Alerts
    createAlertRule: canCreateAlertRule(role),
    editAlertRule: canEditAlertRule(role),
    deleteAlertRule: canDeleteAlertRule(role),
    acknowledgeAlerts: canAcknowledgeAlerts(role),
    resolveAlerts: canResolveAlerts(role),
    deleteAlerts: canDeleteAlerts(role),
    
    // Analytics
    viewWorksiteAnalytics: canViewWorksiteAnalytics(role),
    viewSystemAnalytics: canViewSystemAnalytics(role),
    exportReports: canExportReports(role),
    
    // Custom Rules
    createCustomRule: canCreateCustomRule(role),
    editCustomRule: canEditCustomRule(role),
    deleteCustomRule: canDeleteCustomRule(role),
    configureSafetyScore: canConfigureSafetyScore(role),
    
    // Settings
    accessSystemSettings: canAccessSystemSettings(role),
    accessCompanySettings: canAccessCompanySettings(role),
    accessWorksiteSettings: canAccessWorksiteSettings(role),
    manageEmergencyContacts: canManageEmergencyContacts(role),
    
    // Workflows
    createWorkflow: canCreateWorkflow(role),
    editWorkflow: canEditWorkflow(role),
    deleteWorkflow: canDeleteWorkflow(role),
    
    // API
    manageApiKeys: canManageApiKeys(role),
    accessApiDocs: canAccessApiDocs(role),
  };
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    'SUPER_ADMIN': 'Super Administrator',
    'COMPANY_ADMIN': 'Company Administrator',
    'SITE_ADMIN': 'Site Administrator',
    'SUPERVISOR': 'Supervisor',
    'WORKER': 'Worker',
    'VIEWER': 'Viewer'
  };
  return names[role] || role;
}

/**
 * Get role badge color for UI
 */
export function getRoleBadgeColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    'SUPER_ADMIN': 'bg-red-100 text-red-800 border-red-200',
    'COMPANY_ADMIN': 'bg-purple-100 text-purple-800 border-purple-200',
    'SITE_ADMIN': 'bg-blue-100 text-blue-800 border-blue-200',
    'SUPERVISOR': 'bg-green-100 text-green-800 border-green-200',
    'WORKER': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'VIEWER': 'bg-gray-100 text-gray-800 border-gray-200'
  };
  return colors[role] || colors['VIEWER'];
}

/**
 * Check if user has access to a specific worksite
 */
export function hasWorksiteAccess(
  userId: string,
  worksiteId: string,
  userRole: UserRole,
  userCompanyId?: string,
  worksiteCompanyId?: string,
  worksiteUsers?: Array<{ userId: string }>
): boolean {
  // Super admin has access to everything
  if (userRole === 'SUPER_ADMIN') return true;
  
  // Company admin has access to all worksites in their company
  if (userRole === 'COMPANY_ADMIN' && userCompanyId === worksiteCompanyId) {
    return true;
  }
  
  // Other roles need explicit WorksiteUser access
  if (worksiteUsers) {
    return worksiteUsers.some(wu => wu.userId === userId);
  }
  
  return false;
}

/**
 * Check if user has access to a specific company
 */
export function hasCompanyAccess(
  userId: string,
  companyId: string,
  userRole: UserRole,
  userCompanyId?: string
): boolean {
  // Super admin has access to everything
  if (userRole === 'SUPER_ADMIN') return true;
  
  // Users can access their own company
  return userCompanyId === companyId;
}


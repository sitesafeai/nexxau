"use client";

import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/Toast';
import { X, Search, Plus, Edit2, Power, Trash2, Loader2, CheckCircle } from 'lucide-react';

interface WorksiteUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string; // WorksiteRole from WorksiteUser
  status: 'ACTIVE' | 'INACTIVE'; // Derived from User.isActivated
  worksiteUserId?: string; // WorksiteUser.id for updates
  requiresOnboarding?: boolean; // True if user hasn't completed onboarding
}

interface WorksiteUserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  worksiteId: string;
  worksiteName: string;
}

const WORKSITE_ROLES = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'SUPERVISOR', label: 'Supervisor' },
  { value: 'WORKER', label: 'Worker' },
  { value: 'VIEWER', label: 'Viewer' }
];

export default function WorksiteUserManagementModal({
  isOpen,
  onClose,
  worksiteId,
  worksiteName
}: WorksiteUserManagementModalProps) {
  const { success, error } = useToast();
  const [users, setUsers] = useState<WorksiteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  
  // Current user's worksite role and permissions
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserGlobalRole, setCurrentUserGlobalRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(false);
  
  // Add user form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState('WORKER');
  const [addingUser, setAddingUser] = useState(false);
  const [addUserError, setAddUserError] = useState('');
  
  // Edit role
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [newRole, setNewRole] = useState('');
  
  // Actions
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Email sent popup
  const [showEmailSentPopup, setShowEmailSentPopup] = useState(false);
  const [sentEmailAddress, setSentEmailAddress] = useState('');
  const [resendingEmail, setResendingEmail] = useState(false);
  
  // Determine which roles the current user can add
  const getAllowedRoles = (userRole: string | null): Array<{ value: string; label: string }> => {
    if (!userRole) return [];
    
    if (userRole === 'ADMIN') {
      // ADMIN can add any role
      return WORKSITE_ROLES;
    }
    
    if (userRole === 'SUPERVISOR') {
      // SUPERVISOR can add only WORKER and VIEWER
      return WORKSITE_ROLES.filter(r => r.value === 'WORKER' || r.value === 'VIEWER');
    }
    
    // WORKER and VIEWER cannot add anyone
    return [];
  };
  
  // Compute permissions based on current user role
  const allowedRoles = useMemo(() => getAllowedRoles(currentUserRole), [currentUserRole]);
  const canAddUsers = currentUserRole === 'ADMIN' || currentUserRole === 'SUPERVISOR';

  useEffect(() => {
    if (isOpen && worksiteId) {
      fetchUsers();
      fetchCurrentUserRole();
    }
  }, [isOpen, worksiteId]);

  const fetchCurrentUserRole = async () => {
    try {
      setLoadingRole(true);
      const response = await fetch(`/api/worksites/${worksiteId}/users?includeCurrentUserRole=true`);
      const data = await response.json();
      
      if (data.success) {
        // Use worksite role if available, otherwise use global role (treat COMPANY_ADMIN as ADMIN)
        const role = data.currentUserRole || 
                     (data.currentUserGlobalRole === 'COMPANY_ADMIN' || 
                      data.currentUserGlobalRole === 'ADMIN' || 
                      data.currentUserGlobalRole === 'SUPER_ADMIN' ? 'ADMIN' : null);
        
        setCurrentUserRole(role);
        setCurrentUserGlobalRole(data.currentUserGlobalRole || null);
        
        // Set default role to first allowed role
        const allowed = getAllowedRoles(role);
        if (allowed.length > 0) {
          setNewUserRole(allowed[0].value);
        }
      }
    } catch (err: any) {
      console.error('Failed to fetch current user role:', err);
    } finally {
      setLoadingRole(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/worksites/${worksiteId}/users`);
      const data = await response.json();
      
      if (data.success) {
        setUsers(data.data || []);
      } else {
        error('Failed to load users', data.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Failed to load users', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUserEmail || !newUserEmail.includes('@')) {
      setAddUserError('Please enter a valid email address');
      return;
    }
    
    try {
      setAddingUser(true);
      setAddUserError('');
      
      const response = await fetch(`/api/worksites/${worksiteId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newUserEmail,
          role: newUserRole
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Show email sent popup if user requires onboarding
        if (data.data?.requiresOnboarding) {
          setSentEmailAddress(newUserEmail);
          setShowEmailSentPopup(true);
        } else {
          success('User added', `${newUserEmail} has been added to this worksite`);
        }
        setNewUserEmail('');
        setNewUserRole('WORKER');
        setShowAddForm(false);
        await fetchUsers();
      } else {
        setAddUserError(data.error || 'Failed to add user');
        error('Failed to add user', data.error || 'Unknown error');
      }
    } catch (err: any) {
      setAddUserError(err.message);
      error('Failed to add user', err.message);
    } finally {
      setAddingUser(false);
    }
  };

  const handleEditRole = async (userId: string, currentRole: string) => {
    if (!newRole || newRole === currentRole) {
      setEditingRole(null);
      return;
    }
    
    try {
      setActionLoading(`edit-${userId}`);
      
      const response = await fetch(`/api/worksites/${worksiteId}/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('Role updated', 'User role has been updated');
        await fetchUsers();
      } else {
        error('Failed to update role', data.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Failed to update role', err.message);
    } finally {
      setActionLoading(null);
      setEditingRole(null);
    }
  };

  const handleToggleStatus = async (userId: string, currentStatus: 'ACTIVE' | 'INACTIVE') => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    
    try {
      setActionLoading(`status-${userId}`);
      
      const response = await fetch(`/api/worksites/${worksiteId}/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      
      if (data.success) {
        success(
          newStatus === 'ACTIVE' ? 'User activated' : 'User deactivated',
          `User status has been updated to ${newStatus}`
        );
        await fetchUsers();
      } else {
        error('Failed to update status', data.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Failed to update status', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleResendEmail = async (userId: string, userEmail: string, showPopup: boolean = true) => {
    try {
      setResendingEmail(true);
      setActionLoading(`resend-${userId}`);
      
      const response = await fetch(`/api/worksites/${worksiteId}/users/${userId}/resend-invite`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (showPopup) {
          // Show popup
          setSentEmailAddress(userEmail);
          setShowEmailSentPopup(true);
        } else {
          success('Email resent', `Invitation email has been resent to ${userEmail}`);
        }
      } else {
        error('Failed to resend email', data.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Failed to resend email', err.message);
    } finally {
      setResendingEmail(false);
      setActionLoading(null);
    }
  };

  const handleRemoveUser = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName || 'this user'} from this worksite?`)) {
      return;
    }
    
    try {
      setActionLoading(`remove-${userId}`);
      
      const response = await fetch(`/api/worksites/${worksiteId}/users/${userId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        success('User removed', `${userName || 'User'} has been removed from this worksite`);
        await fetchUsers();
      } else {
        error('Failed to remove user', data.error || 'Unknown error');
      }
    } catch (err: any) {
      error('Failed to remove user', err.message);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredUsers = useMemo(() => {
    let result = [...users];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(user =>
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }
    
    if (roleFilter !== 'all') {
      result = result.filter(user => user.role === roleFilter);
    }
    
    return result;
  }, [users, searchQuery, roleFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white">Manage Users</h2>
            <p className="text-sm text-slate-400 mt-1">{worksiteName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Search and Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <option value="all">All Roles</option>
                {WORKSITE_ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
              {canAddUsers && (
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add User
                </button>
              )}
            </div>
            
            {/* Add User Form */}
            {showAddForm && (
              <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-4 space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => {
                      setNewUserEmail(e.target.value);
                      setAddUserError('');
                    }}
                    placeholder="Enter email address"
                    className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    disabled={allowedRoles.length === 0}
                  >
                    {allowedRoles.length > 0 ? (
                      allowedRoles.map(role => (
                        <option key={role.value} value={role.value}>{role.label}</option>
                      ))
                    ) : (
                      <option value="">No roles available</option>
                    )}
                  </select>
                  <button
                    onClick={handleAddUser}
                    disabled={addingUser}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    {addingUser ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Invite
                  </button>
                  <button
                    onClick={() => {
                      setShowAddForm(false);
                      setNewUserEmail('');
                      setAddUserError('');
                    }}
                    className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
                {addUserError && (
                  <p className="text-sm text-red-400">{addUserError}</p>
                )}
              </div>
            )}
          </div>
          
          {/* User Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400">No users found</p>
              {users.length === 0 && (
                <p className="text-sm text-slate-500 mt-2">Add users to get started</p>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider border-b border-slate-700">
                    <th className="px-4 py-3 text-left font-medium">Name</th>
                    <th className="px-4 py-3 text-left font-medium">Email</th>
                    <th className="px-4 py-3 text-left font-medium">Role</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm text-white">{user.name || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-300">{user.email || 'N/A'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {editingRole === user.id ? (
                          <div className="flex items-center gap-2">
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              autoFocus
                            >
                              {WORKSITE_ROLES.map(role => (
                                <option key={role.value} value={role.value}>{role.label}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleEditRole(user.id, user.role)}
                              disabled={actionLoading === `edit-${user.id}`}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 disabled:bg-green-600/50 text-white rounded text-sm transition-colors"
                            >
                              {actionLoading === `edit-${user.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setEditingRole(null);
                                setNewRole('');
                              }}
                              className="px-2 py-1 bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-300">
                              {WORKSITE_ROLES.find(r => r.value === user.role)?.label || user.role}
                            </span>
                            <button
                              onClick={() => {
                                setEditingRole(user.id);
                                setNewRole(user.role);
                              }}
                              disabled={actionLoading !== null}
                              className="p-1 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
                              title="Edit role"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                          user.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {/* Resend Email button for users who haven't completed onboarding */}
                          {user.requiresOnboarding && (
                            <button
                              onClick={() => handleResendEmail(user.id, user.email || '', true)}
                              disabled={actionLoading !== null || resendingEmail}
                              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded transition-colors flex items-center gap-1"
                              title="Resend invitation email"
                            >
                              {actionLoading === `resend-${user.id}` ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <>
                                  <Plus className="w-3 h-3" />
                                  Resend Email
                                </>
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            disabled={actionLoading !== null}
                            className={`p-2 rounded transition-colors ${
                              user.status === 'ACTIVE'
                                ? 'text-amber-400 hover:bg-amber-500/10'
                                : 'text-emerald-400 hover:bg-emerald-500/10'
                            } disabled:opacity-50`}
                            title={user.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {actionLoading === `status-${user.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Power className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemoveUser(user.id, user.name || user.email || 'User')}
                            disabled={actionLoading !== null}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors disabled:opacity-50"
                            title="Remove from worksite"
                          >
                            {actionLoading === `remove-${user.id}` ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* Email Sent Popup */}
      {showEmailSentPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowEmailSentPopup(false)}
          />
          
          {/* Popup */}
          <div className="relative bg-slate-800 border border-slate-700 rounded-xl shadow-2xl max-w-md w-full p-6">
            {/* Close Button */}
            <button
              onClick={() => setShowEmailSentPopup(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Content */}
            <div className="pr-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Email Sent!</h3>
              </div>

              <p className="text-slate-300 mb-4">
                An invitation email has been sent to <span className="font-semibold text-white">{sentEmailAddress}</span>
              </p>

              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-300 mb-2">
                  <strong>Please check:</strong>
                </p>
                <ul className="text-sm text-blue-200 space-y-1 list-disc list-inside">
                  <li>Inbox folder</li>
                  <li>Spam/Junk folder</li>
                  <li>Promotions tab (if using Gmail)</li>
                </ul>
                <p className="text-sm text-blue-300 mt-3">
                  You should receive the email within <strong>5 minutes</strong>. If you don't see it, click the button below to resend.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    // Find user ID from email
                    const user = users.find(u => u.email === sentEmailAddress);
                    if (user) {
                      await handleResendEmail(user.id, sentEmailAddress, true);
                    }
                  }}
                  disabled={resendingEmail}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {resendingEmail ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Resending...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Resend Email
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowEmailSentPopup(false)}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


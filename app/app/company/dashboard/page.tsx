'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { canCreateWorksite, canDeleteWorksite, canInviteUser, UserRole } from '@/app/lib/permissions';
import DashboardHeader from '@/components/DashboardHeader';

interface Worksite {
  id: string;
  name: string;
  worksiteName: string;
  location: string | null;
  address: string | null;
  status: string;
  cameraSystemType: string;
  createdAt: string;
  _count?: {
    cameras: number;
    worksiteUsers: number;
  };
}

interface Company {
  id: string;
  companyUsername: string;
  email: string;
  contactEmail: string | null;
  phone: string | null;
  address: string | null;
  worksites: Worksite[];
  _count?: {
    worksites: number;
    companyUsers: number;
  };
}

export default function CompanyDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Worksite creation now uses dedicated wizard page (/company/worksites/create)

  // User invitation modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'SITE_ADMIN',
    worksiteId: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      // Check if user is COMPANY_ADMIN
      const userRole = (session.user as any).role;
      if (userRole !== 'COMPANY_ADMIN') {
        if (userRole === 'SUPER_ADMIN') {
          router.push('/admin'); // Super admin goes to admin panel
        } else {
          router.push('/dashboard'); // Others go to worksite dashboard
        }
        return;
      }

      fetchCompanyData();
    }
  }, [status, session, router]);

  const fetchCompanyData = async () => {
    try {
      setLoading(true);
      const companyId = (session?.user as any).companyId;
      
      console.log('🔍 Session:', session);
      console.log('🔍 CompanyId:', companyId);
      
      if (!companyId) {
        setError('No company associated with this account. Please contact support.');
        setLoading(false);
        return;
      }

      console.log('📡 Fetching company:', companyId);
      const response = await fetch(`/api/admin/companies/${companyId}`);
      const data = await response.json();
      
      console.log('📦 Company data:', data);

      if (data.success) {
        setCompany(data.data);
      } else {
        setError(data.error || 'Failed to load company data');
      }
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError('Failed to load company data');
    } finally {
      setLoading(false);
    }
  };

  // Worksite creation moved to /company/worksites/create wizard

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteFormData.email,
          role: inviteFormData.role,
          companyId: company?.id,
          worksiteId: inviteFormData.worksiteId || null,
          invitedBy: (session?.user as any).id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Invitation sent successfully!');
        setShowInviteModal(false);
        setInviteFormData({ email: '', role: 'SITE_ADMIN', worksiteId: '' });
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      alert('Failed to send invitation');
    }
  };

  const handleDeleteWorksite = async (worksiteId: string, worksiteName: string) => {
    if (!confirm(`Are you sure you want to delete worksite "${worksiteName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/worksites/${worksiteId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        fetchCompanyData(); // Refresh data
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error deleting worksite:', err);
      alert('Failed to delete worksite');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-white">{error || 'Company not found'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <DashboardHeader />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                {company.companyUsername}
              </h1>
              <p className="text-slate-300">Company Dashboard</p>
            </div>
            <div className="flex gap-3">
              {canInviteUser((session?.user as any).role as UserRole, 'SITE_ADMIN') && (
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Invite User
                </button>
              )}
              {canCreateWorksite((session?.user as any).role as UserRole) && (
                <Link
                  href="/company/worksites/create"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-flex items-center gap-2"
                >
                  + Create Worksite
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Worksites</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {company._count?.worksites || company.worksites.length}
                </p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Total Users</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {company._count?.companyUsers || 0}
                </p>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Cameras</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {company.worksites.reduce((sum, ws) => sum + (ws._count?.cameras || 0), 0)}
                </p>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Worksites Table */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white">Your Worksites</h2>
          </div>

          {company.worksites.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 mb-4">No worksites yet</p>
              <Link
                href="/company/worksites/create"
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors inline-block"
              >
                Create Your First Worksite
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Cameras</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Users</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {company.worksites.map((worksite) => (
                    <tr key={worksite.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">{worksite.name}</div>
                        <div className="text-sm text-slate-400">{worksite.worksiteName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-slate-300">{worksite.location || 'N/A'}</div>
                        {worksite.address && (
                          <div className="text-xs text-slate-400">{worksite.address}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {worksite._count?.cameras || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {worksite._count?.worksiteUsers || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          worksite.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {worksite.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <Link
                          href={`/company/worksites/${worksite.id}`}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Manage
                        </Link>
                        <Link
                          href={`/dashboard?worksite=${worksite.id}`}
                          className="text-green-400 hover:text-green-300"
                        >
                          Dashboard
                        </Link>
                        {canDeleteWorksite((session?.user as any).role as UserRole) && (
                          <button
                            onClick={() => handleDeleteWorksite(worksite.id, worksite.name)}
                            className="text-red-400 hover:text-red-300"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Worksite creation modal removed - now uses /company/worksites/create wizard */}

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Invite User</h2>
            
            <form onSubmit={handleInviteUser} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteFormData.email}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role *
                </label>
                <select
                  value={inviteFormData.role}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="SITE_ADMIN">Site Admin</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="WORKER">Worker</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assign to Worksite (Optional)
                </label>
                <select
                  value={inviteFormData.worksiteId}
                  onChange={(e) => setInviteFormData({ ...inviteFormData, worksiteId: e.target.value })}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No specific worksite</option>
                  {company.worksites.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1">
                  Leave empty for company-wide access
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}


'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Building2, ArrowLeft, Edit, Trash2, MapPin, Users, Plus, Camera, AlertTriangle, TrendingUp, Mail, Phone, MapPinIcon } from 'lucide-react';

interface Worksite {
  id: string;
  name: string;
  worksiteName: string;
  location?: string;
  status: string;
  _count: {
    cameras: number;
    alerts: number;
    workers: number;
  };
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActivated: boolean;
  createdAt: string;
}

interface Company {
  id: string;
  name: string;
  companyUsername: string;
  email: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  worksites: Worksite[];
  users: User[];
  _count: {
    worksites: number;
    users: number;
  };
  createdAt: string;
}

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;

  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWorksiteModal, setShowWorksiteModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [worksiteFormData, setWorksiteFormData] = useState({
    name: '',
    worksiteName: '',
    location: '',
    address: ''
  });
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'SITE_ADMIN'
  });

  useEffect(() => {
    fetchCompany();
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      const response = await fetch(`/api/admin/companies/${companyId}`);
      const data = await response.json();
      
      if (data.success) {
        setCompany(data.data);
      } else {
        alert('Failed to load company');
      }
    } catch (error) {
      console.error('Error fetching company:', error);
      alert('Error loading company');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorksite = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/worksites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...worksiteFormData,
          companyId
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Worksite created successfully!');
        setShowWorksiteModal(false);
        setWorksiteFormData({ name: '', worksiteName: '', location: '', address: '' });
        fetchCompany(); // Refresh company data
      } else {
        alert(`Failed to create worksite: ${data.error}`);
      }
    } catch (error) {
      console.error('Error creating worksite:', error);
      alert('Failed to create worksite');
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteFormData.email,
          role: inviteFormData.role,
          companyId,
          invitedBy: 'dev-user-1' // TODO: Get from session
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`Invitation sent to ${inviteFormData.email}!\n\nInvite URL (for testing):\n${data.data.inviteUrl}`);
        setShowInviteModal(false);
        setInviteFormData({ email: '', role: 'SITE_ADMIN' });
        fetchCompany(); // Refresh to show new user
      } else {
        alert(`Failed to send invitation: ${data.error}`);
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation');
    }
  };

  const handleDeleteWorksite = async (worksiteId: string, worksiteName: string) => {
    if (!confirm(`Are you sure you want to delete worksite "${worksiteName}"? This will also delete all associated cameras and alerts.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/worksites/${worksiteId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        alert('Worksite deleted successfully!');
        fetchCompany(); // Refresh
      } else {
        alert(`Failed to delete worksite: ${data.error}`);
      }
    } catch (error) {
      console.error('Error deleting worksite:', error);
      alert('Failed to delete worksite');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Company not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/admin/companies')}
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 mb-4 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Companies
          </button>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-4 bg-blue-600/20 rounded-xl">
                <Building2 className="h-12 w-12 text-blue-400" />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white">{company.name}</h1>
                <p className="text-gray-400 mt-1">@{company.companyUsername}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Plus className="h-5 w-5" />
                Invite User
              </button>
              <button
                onClick={() => router.push(`/admin/companies/${companyId}/edit`)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Edit className="h-5 w-5" />
                Edit Company
              </button>
            </div>
          </div>
        </div>

        {/* Company Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <div className="flex items-center gap-3 mb-2">
              <Mail className="h-5 w-5 text-blue-400" />
              <h3 className="text-gray-400 text-sm">Company Email</h3>
            </div>
            <p className="text-white text-lg font-semibold">{company.email}</p>
          </div>

          {company.contactEmail && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <Mail className="h-5 w-5 text-green-400" />
                <h3 className="text-gray-400 text-sm">Contact Email</h3>
              </div>
              <p className="text-white text-lg font-semibold">{company.contactEmail}</p>
            </div>
          )}

          {company.phone && (
            <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
              <div className="flex items-center gap-3 mb-2">
                <Phone className="h-5 w-5 text-purple-400" />
                <h3 className="text-gray-400 text-sm">Phone</h3>
              </div>
              <p className="text-white text-lg font-semibold">{company.phone}</p>
            </div>
          )}
        </div>

        {company.address && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700 mb-8">
            <div className="flex items-center gap-3 mb-2">
              <MapPinIcon className="h-5 w-5 text-red-400" />
              <h3 className="text-gray-400 text-sm">Address</h3>
            </div>
            <p className="text-white text-lg">{company.address}</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 rounded-xl p-6 border border-blue-500/30">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="h-6 w-6 text-blue-400" />
              <h3 className="text-gray-300 text-sm">Worksites</h3>
            </div>
            <p className="text-4xl font-bold text-white">{company._count.worksites}</p>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 rounded-xl p-6 border border-purple-500/30">
            <div className="flex items-center gap-3 mb-2">
              <Users className="h-6 w-6 text-purple-400" />
              <h3 className="text-gray-300 text-sm">Users</h3>
            </div>
            <p className="text-4xl font-bold text-white">{company._count.users}</p>
          </div>

          <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 rounded-xl p-6 border border-green-500/30">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="h-6 w-6 text-green-400" />
              <h3 className="text-gray-300 text-sm">Total Cameras</h3>
            </div>
            <p className="text-4xl font-bold text-white">
              {company.worksites.reduce((acc, ws) => acc + ws._count.cameras, 0)}
            </p>
          </div>
        </div>

        {/* Worksites Section */}
        <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 border border-slate-700 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Worksites</h2>
            <button
              onClick={() => setShowWorksiteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              <Plus className="h-5 w-5" />
              Create Worksite
            </button>
          </div>

          {company.worksites.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg mb-4">No worksites yet</p>
              <button
                onClick={() => setShowWorksiteModal(true)}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
              >
                Create Your First Worksite
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {company.worksites.map((worksite) => (
                <div
                  key={worksite.id}
                  className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-6 border border-slate-700 hover:border-blue-500/50 transition-all cursor-pointer group"
                  onClick={() => router.push(`/dashboard?worksite=${worksite.id}`)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
                        {worksite.name}
                      </h3>
                      <p className="text-sm text-gray-400">@{worksite.worksiteName}</p>
                      {worksite.location && (
                        <p className="text-xs text-gray-500 mt-1">{worksite.location}</p>
                      )}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                      worksite.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {worksite.status}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Camera className="h-3 w-3" />
                        Cameras
                      </div>
                      <div className="text-lg font-bold text-white">
                        {worksite._count.cameras}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <AlertTriangle className="h-3 w-3" />
                        Alerts
                      </div>
                      <div className="text-lg font-bold text-white">
                        {worksite._count.alerts}
                      </div>
                    </div>
                    <div className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
                        <Users className="h-3 w-3" />
                        Workers
                      </div>
                      <div className="text-lg font-bold text-white">
                        {worksite._count.workers}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-slate-700">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard?worksite=${worksite.id}`);
                      }}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                    >
                      <TrendingUp className="h-4 w-4" />
                      View Dashboard
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteWorksite(worksite.id, worksite.name);
                      }}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Invite User Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-lg w-full border border-slate-700 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Invite User to {company?.name}</h2>
              
              <form onSubmit={handleInviteUser} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={inviteFormData.email}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="user@example.com"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">They will receive an email invitation to join</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={inviteFormData.role}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="COMPANY_ADMIN">Company Admin</option>
                    <option value="SITE_ADMIN">Site Admin</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="WORKER">Worker</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  <p className="mt-1 text-xs text-gray-400">Select the user's role and permissions</p>
                </div>

                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-blue-400 mb-2">📧 What happens next?</h3>
                  <p className="text-xs text-gray-300">
                    An invitation email will be sent to this address with a secure link to create their account and set their password. The link expires in 72 hours.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Send Invitation
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Create Worksite Modal */}
        {showWorksiteModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-slate-800 rounded-2xl p-8 max-w-lg w-full border border-slate-700 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Create New Worksite</h2>
              
              <form onSubmit={handleCreateWorksite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Worksite Name *
                  </label>
                  <input
                    type="text"
                    value={worksiteFormData.name}
                    onChange={(e) => setWorksiteFormData({ ...worksiteFormData, name: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="Downtown Construction Site"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Worksite Username * (URL-friendly)
                  </label>
                  <input
                    type="text"
                    value={worksiteFormData.worksiteName}
                    onChange={(e) => setWorksiteFormData({ ...worksiteFormData, worksiteName: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="downtown-site"
                    required
                  />
                  <p className="mt-1 text-xs text-gray-400">Used in URLs and identifiers</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={worksiteFormData.location}
                    onChange={(e) => setWorksiteFormData({ ...worksiteFormData, location: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="New York, NY"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={worksiteFormData.address}
                    onChange={(e) => setWorksiteFormData({ ...worksiteFormData, address: e.target.value })}
                    className="w-full bg-gray-900/50 text-white rounded-lg px-4 py-3 border border-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    placeholder="123 Main St, New York, NY 10001"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowWorksiteModal(false)}
                    className="flex-1 px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                  >
                    Create Worksite
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


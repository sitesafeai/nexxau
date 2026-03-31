'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import DashboardHeader from '@/components/DashboardHeader';
import CameraGrid from '@/components/cameras/CameraGrid';
import { canCreateCamera, type UserRole } from '@/app/lib/permissions';

interface Camera {
  id: string;
  name: string;
  streamUrl: string | null;
  hlsUrl: string | null;
  rtspPath: string | null;
  status: string;
  location: string | null;
  janusFeedId: number | null;
  metadata: {
    aiEnabled?: boolean;
    overlayEnabled?: boolean;
    [key: string]: any;
  } | null;
}

const OVERLAY_PREFS_KEY = 'nexxauCameraOverlayPrefs';

const loadOverlayPrefs = (): Record<string, boolean> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(OVERLAY_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, boolean>;
    }
  } catch {
    // ignore invalid storage
  }
  return {};
};

const saveOverlayPrefs = (prefs: Record<string, boolean>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(OVERLAY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
};

interface WorksiteUser {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
  };
}

interface Worksite {
  id: string;
  name: string;
  worksiteName: string;
  location: string | null;
  address: string | null;
  status: string;
  cameraSystemType: string;
  createdAt: string;
  cameras: Camera[];
  worksiteUsers: WorksiteUser[];
  company: {
    id: string;
    companyUsername: string;
  };
}

export default function WorksiteDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const worksiteId = params.id as string;

  const [worksite, setWorksite] = useState<Worksite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    role: 'WORKER'
  });
  
  // Camera state (for CameraGrid initial data)
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'cameras'>('overview');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }

    if (status === 'authenticated') {
      fetchWorksiteData();
    }
  }, [status, worksiteId]);

  const fetchWorksiteData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/worksites/${worksiteId}`);
      const data = await response.json();

      if (data.success) {
        setWorksite(data.data);
        // Update cameras state from worksite data
        const overlayPrefs = loadOverlayPrefs();
        const nextCameras = (data.data.cameras || []).map((camera: Camera) => {
          const overlayEnabled = typeof overlayPrefs[camera.id] === 'boolean'
            ? overlayPrefs[camera.id]
            : (camera.metadata?.overlayEnabled ?? true);
          return {
            ...camera,
            metadata: {
              ...(camera.metadata || {}),
              overlayEnabled
            }
          };
        });
        setCameras(nextCameras);
      } else {
        setError(data.error || 'Failed to load worksite');
      }
    } catch (err) {
      console.error('Error fetching worksite:', err);
      setError('Failed to load worksite');
    } finally {
      setLoading(false);
    }
  };

  const canAdd = canCreateCamera((session?.user as any)?.role as UserRole);

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/invitations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteFormData.email,
          role: inviteFormData.role,
          companyId: worksite?.company.id,
          worksiteId: worksiteId,
          invitedBy: (session?.user as any).id
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('Invitation sent successfully!');
        setShowInviteModal(false);
        setInviteFormData({ email: '', role: 'WORKER' });
        fetchWorksiteData(); // Refresh to show new user
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (err) {
      console.error('Error sending invitation:', err);
      alert('Failed to send invitation');
    }
  };

  const handleRemoveUser = async (userId: string, userName: string | null) => {
    if (!confirm(`Remove ${userName || 'this user'} from worksite?`)) {
      return;
    }

    try {
      // TODO: Implement remove user API endpoint
      alert('Remove user feature coming soon');
    } catch (err) {
      console.error('Error removing user:', err);
      alert('Failed to remove user');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error || !worksite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">Error</h2>
          <p className="text-white">{error || 'Worksite not found'}</p>
          <Link
            href="/company/dashboard"
            className="mt-4 inline-block text-blue-400 hover:text-blue-300"
          >
            ← Back to Dashboard
          </Link>
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
          <Link
            href="/company/dashboard"
            className="text-blue-400 hover:text-blue-300 mb-4 inline-flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between mt-4">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">{worksite.name}</h1>
              <p className="text-slate-300">{worksite.location || 'No location specified'}</p>
              {worksite.address && (
                <p className="text-sm text-slate-400 mt-1">{worksite.address}</p>
              )}
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Invite User
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'overview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('cameras')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'cameras'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            Cameras
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Active Cameras</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {worksite.cameras.filter(c => c.status === 'active').length}
                </p>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Team Members</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {worksite.worksiteUsers.length}
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
                <p className="text-slate-400 text-sm">Status</p>
                <p className="text-2xl font-bold text-white mt-1 capitalize">
                  {worksite.status.toLowerCase()}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${
                worksite.status === 'ACTIVE' ? 'bg-green-500/20' : 'bg-gray-500/20'
              }`}>
                <svg className={`w-8 h-8 ${
                  worksite.status === 'ACTIVE' ? 'text-green-500' : 'text-gray-500'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members */}
        <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden mb-6">
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-2xl font-bold text-white">Team Members</h2>
          </div>

          {worksite.worksiteUsers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-slate-400 mb-4">No team members yet</p>
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Invite Your First Team Member
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {worksite.worksiteUsers.map((wu) => (
                    <tr key={wu.id} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                        {wu.user.name || 'Pending'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {wu.user.email || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {wu.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleRemoveUser(wu.user.id, wu.user.name)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
          </>
        )}

        {activeTab === 'cameras' && (
          <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden p-6">
            <CameraGrid
              worksiteId={worksiteId}
              initialCameras={cameras.map((c: any) => ({
                id: c.id,
                name: c.name,
                zone: c.zone ?? c.location,
                location: c.location,
                status: c.status,
                streamUrl: c.streamUrl,
                rules: c.rules ?? [],
              }))}
              canAddCamera={canAdd}
            />
          </div>
        )}
      </div>
      </div>

      {/* Invite User Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700">
            <h2 className="text-2xl font-bold text-white mb-6">Invite User to {worksite.name}</h2>
            
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

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  This user will be invited to the <strong>{worksite.name}</strong> worksite.
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
  );
}


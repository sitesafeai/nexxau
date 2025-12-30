'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Edit2, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  Users, 
  Shield, 
  Settings, 
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Calendar,
  Activity,
  Eye,
  FileText,
  Wrench,
  PauseCircle,
  PlayCircle,
  ChevronRight
} from 'lucide-react';

interface Worksite {
  id: string;
  name: string;
  worksiteName: string;
  location: string | null;
  address: string | null;
  status: string;
  companyId: string;
  company: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    alerts: number;
    workers: number;
  };
}


interface Worker {
  id: string;
  name: string | null;
  email: string;
  role: string;
  status: string;
  lastLogin: string | null;
}

type TabType = 'overview' | 'personnel' | 'compliance' | 'settings';

export default function WorksiteManagementPage() {
  const params = useParams();
  const router = useRouter();
  const worksiteId = params.id as string;

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [worksite, setWorksite] = useState<Worksite | null>(null);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Editable worksite data
  const [editedWorksite, setEditedWorksite] = useState<Partial<Worksite>>({});

  // Modals
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (worksiteId) {
      fetchWorksiteData();
    }
  }, [worksiteId]);

  const fetchWorksiteData = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch worksite details
      const wsRes = await fetch(`/api/worksites/${worksiteId}`);
      
      if (!wsRes.ok) {
        const errorData = await wsRes.json().catch(() => ({}));
        setError(errorData.error || `Failed to fetch worksite (${wsRes.status})`);
        setLoading(false);
        return;
      }
      
      const wsData = await wsRes.json();
      console.log('[Worksite Page] Fetched worksite data:', wsData);
      
      if (wsData.success && wsData.data) {
        setWorksite(wsData.data);
        setEditedWorksite(wsData.data);
      } else if (wsData.id) {
        // Direct worksite object (no wrapper)
        setWorksite(wsData);
        setEditedWorksite(wsData);
      } else {
        setError('Invalid worksite data format received');
        setLoading(false);
        return;
      }

      // Fetch workers (users assigned to this worksite)
      const workersRes = await fetch(`/api/worksites/${worksiteId}/users`);
      if (workersRes.ok) {
        const workersData = await workersRes.json();
        setWorkers(Array.isArray(workersData) ? workersData : workersData.data || []);
      }
    } catch (error: any) {
      console.error('Error fetching worksite data:', error);
      setError(error.message || 'Failed to load worksite');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWorksite = async () => {
    if (!editedWorksite) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/worksites/${worksiteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editedWorksite)
      });

      if (res.ok) {
        const updated = await res.json();
        setWorksite(updated.data || updated);
        setEditMode(false);
        alert('Worksite updated successfully!');
      } else {
        alert('Failed to update worksite');
      }
    } catch (error) {
      console.error('Error saving worksite:', error);
      alert('Error saving worksite');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWorksite = async () => {
    try {
      const res = await fetch(`/api/worksites/${worksiteId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Worksite deleted successfully');
        router.push('/dashboard');
      } else {
        alert('Failed to delete worksite');
      }
    } catch (error) {
      console.error('Error deleting worksite:', error);
      alert('Error deleting worksite');
    }
  };

  const getStatusColor = (status: string) => {
    const s = status?.toUpperCase();
    if (s === 'ACTIVE') return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (s === 'INACTIVE' || s === 'PAUSED') return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    if (s === 'CLOSED') return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-slate-300">Loading worksite...</p>
        </div>
      </div>
    );
  }

  if (error || (!loading && !worksite)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Worksite Not Found</h2>
          <p className="text-slate-400 mb-2">The worksite you're looking for doesn't exist or you don't have access.</p>
          {error && (
            <p className="text-sm text-red-400 mb-6 font-mono bg-red-900/20 p-3 rounded border border-red-700/30">
              Error: {error}
            </p>
          )}
          {!error && (
            <p className="text-sm text-slate-500 mb-6">ID: {worksiteId}</p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Back to Dashboard
            </button>
            <button
              onClick={() => {
                setError(null);
                fetchWorksiteData();
              }}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'overview' as TabType, name: 'Overview', icon: Activity },
    { id: 'personnel' as TabType, name: 'Personnel', icon: Users },
    { id: 'compliance' as TabType, name: 'Compliance & Alerts', icon: Shield },
    { id: 'settings' as TabType, name: 'Site Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="hover:text-white transition-colors"
            >
              Dashboard
            </button>
            <ChevronRight className="w-4 h-4" />
            <span className="text-white">{worksite?.name || 'Unknown Worksite'}</span>
          </div>

          {/* Title and Actions */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-2">
                <h1 className="text-4xl font-bold text-white">{worksite?.name || 'Unknown Worksite'}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(worksite?.status || 'ACTIVE')}`}>
                  {worksite?.status || 'ACTIVE'}
                </span>
              </div>
              {worksite?.location && (
                <div className="flex items-center gap-2 text-slate-400">
                  <MapPin className="w-4 h-4" />
                  <span>{worksite.location}</span>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-3">
              {!editMode ? (
                <>
                  <button
                    onClick={() => setEditMode(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Info
                  </button>
                  <button
                    onClick={() => setShowAddWorkerModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Worker
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors border border-red-500/30"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSaveWorksite}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditedWorksite(worksite || {});
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-700 mb-8">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <OverviewTab 
              worksite={editMode ? editedWorksite : worksite} 
              workers={workers}
              editMode={editMode}
              onEdit={setEditedWorksite}
            />
          )}
          
          {activeTab === 'personnel' && (
            <PersonnelTab 
              workers={workers} 
              worksiteId={worksiteId}
              onRefresh={fetchWorksiteData}
            />
          )}
          
          {activeTab === 'compliance' && (
            <ComplianceTab worksiteId={worksiteId} />
          )}
          
          {activeTab === 'settings' && (
            <SettingsTab 
              worksite={editMode ? editedWorksite : worksite}
              editMode={editMode}
              onEdit={setEditedWorksite}
              onSave={handleSaveWorksite}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Delete Worksite?</h2>
              <p className="text-slate-400">
                This action cannot be undone. All workers and data associated with <strong className="text-white">{worksite?.name || 'this worksite'}</strong> will be permanently deleted.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorksite}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
              >
                Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Worker Modal */}
      {showAddWorkerModal && (
        <AddWorkerModal
          worksiteId={worksiteId}
          onClose={() => setShowAddWorkerModal(false)}
          onSuccess={() => {
            setShowAddWorkerModal(false);
            fetchWorksiteData();
          }}
        />
      )}
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ worksite, workers, editMode, onEdit }: any) {
  const activeWorkers = workers.filter((w: Worker) => w.status === 'active').length;

  return (
    <div className="space-y-6">
      {/* Worksite Card */}
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Worksite Information</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Worksite Name
            </label>
            {editMode ? (
              <input
                type="text"
                value={worksite.name || ''}
                onChange={(e) => onEdit({ ...worksite, name: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-white text-lg">{worksite.name}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Location
            </label>
            {editMode ? (
              <input
                type="text"
                value={worksite.location || ''}
                onChange={(e) => onEdit({ ...worksite, location: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-white text-lg">{worksite.location || 'Not specified'}</p>
            )}
          </div>

          {/* Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Address
            </label>
            {editMode ? (
              <textarea
                value={worksite.address || ''}
                onChange={(e) => onEdit({ ...worksite, address: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            ) : (
              <p className="text-white">{worksite.address || 'Not specified'}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Status
            </label>
            {editMode ? (
              <select
                value={worksite.status || 'ACTIVE'}
                onChange={(e) => onEdit({ ...worksite, status: e.target.value })}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="INACTIVE">Inactive</option>
                <option value="CLOSED">Closed</option>
              </select>
            ) : (
              <p className="text-white text-lg capitalize">{worksite.status?.toLowerCase() || 'Unknown'}</p>
            )}
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Company
            </label>
            <p className="text-white text-lg">{worksite.company?.name || 'Not assigned'}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Workers */}
        <div className="bg-gradient-to-br from-green-600/20 to-green-700/20 rounded-xl p-6 border border-green-500/30">
          <div className="flex items-center justify-between mb-4">
            <Users className="w-8 h-8 text-green-400" />
            <span className="text-sm text-green-300">Personnel</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            {activeWorkers} / {workers.length}
          </div>
          <div className="text-sm text-slate-300">Active / Total</div>
        </div>

        {/* Safety Score */}
        <div className="bg-gradient-to-br from-purple-600/20 to-purple-700/20 rounded-xl p-6 border border-purple-500/30">
          <div className="flex items-center justify-between mb-4">
            <Shield className="w-8 h-8 text-purple-400" />
            <span className="text-sm text-purple-300">Compliance</span>
          </div>
          <div className="text-3xl font-bold text-white mb-1">
            --
          </div>
          <div className="text-sm text-slate-300">Pending data</div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="flex items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <Eye className="w-5 h-5 text-blue-400" />
            <span className="text-white font-medium">View Live Feeds</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <FileText className="w-5 h-5 text-green-400" />
            <span className="text-white font-medium">Generate Report</span>
          </button>
          <button className="flex items-center gap-3 p-4 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors">
            <Wrench className="w-5 h-5 text-yellow-400" />
            <span className="text-white font-medium">Run Diagnostics</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Personnel Tab Component
function PersonnelTab({ workers, worksiteId, onRefresh }: any) {
  const handleRemoveWorker = async (userId: string) => {
    if (!confirm('Are you sure you want to remove this worker from the worksite?')) return;

    try {
      const res = await fetch(`/api/worksites/${worksiteId}/users/${userId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        alert('Worker removed successfully');
        onRefresh();
      } else {
        alert('Failed to remove worker');
      }
    } catch (error) {
      console.error('Error removing worker:', error);
      alert('Error removing worker');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-bold text-white">Personnel ({workers.length})</h2>
        </div>
        
        {workers.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Personnel Assigned</h3>
            <p className="text-slate-400 mb-6">Add workers to this worksite to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {workers.map((worker: Worker) => (
                  <tr key={worker.id} className="hover:bg-slate-700/30">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white font-medium">{worker.name || 'Unnamed User'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {worker.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {worker.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          worker.status === 'active' ? 'bg-green-400' : 'bg-gray-400'
                        }`}></div>
                        <span className="text-slate-300 capitalize">{worker.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                      {worker.lastLogin 
                        ? new Date(worker.lastLogin).toLocaleString()
                        : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          className="p-2 text-slate-400 hover:text-white transition-colors"
                          title="Edit Worker"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleRemoveWorker(worker.id)}
                          className="p-2 text-red-400 hover:text-red-300 transition-colors"
                          title="Remove Worker"
                        >
                          <Trash2 className="w-4 h-4" />
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
    </div>
  );
}

// Compliance Tab Component
function ComplianceTab({ worksiteId }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Alert Thresholds & Compliance Rules</h2>
        
        <div className="space-y-4">
          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">PPE Compliance</h3>
              <span className="px-3 py-1 bg-yellow-500/20 text-yellow-400 text-sm font-medium rounded-full">
                Medium Priority
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              Trigger high severity alert if more than 3 PPE violations detected within 10 minutes
            </p>
            <div className="flex items-center gap-4">
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                Edit Threshold
              </button>
              <button className="text-slate-400 hover:text-white text-sm font-medium">
                View History
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-semibold">Unauthorized Access</h3>
              <span className="px-3 py-1 bg-red-500/20 text-red-400 text-sm font-medium rounded-full">
                High Priority
              </span>
            </div>
            <p className="text-slate-400 text-sm mb-3">
              Immediately alert site managers when unauthorized personnel are detected in restricted zones
            </p>
            <div className="flex items-center gap-4">
              <button className="text-blue-400 hover:text-blue-300 text-sm font-medium">
                Edit Threshold
              </button>
              <button className="text-slate-400 hover:text-white text-sm font-medium">
                View History
              </button>
            </div>
          </div>

          <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors">
            <Plus className="w-5 h-5 inline mr-2" />
            Add Custom Alert Rule
          </button>
        </div>
      </div>

      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Alert Recipients</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Critical Alerts</p>
              <p className="text-slate-400 text-sm">Notify for high-severity incidents</p>
            </div>
            <button className="text-blue-400 hover:text-blue-300 font-medium">
              Manage (2)
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-lg">
            <div>
              <p className="text-white font-medium">Daily Summary</p>
              <p className="text-slate-400 text-sm">Send daily compliance reports</p>
            </div>
            <button className="text-blue-400 hover:text-blue-300 font-medium">
              Manage (5)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Settings Tab Component
function SettingsTab({ worksite, editMode, onEdit, onSave, onDelete }: any) {
  return (
    <div className="space-y-6">
      <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
        <h2 className="text-xl font-bold text-white mb-6">Site Metadata</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Worksite ID
            </label>
            <p className="text-slate-400 text-sm font-mono">{worksite.id}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Created Date
            </label>
            <p className="text-slate-400 text-sm">
              {new Date(worksite.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Last Updated
            </label>
            <p className="text-slate-400 text-sm">
              {new Date(worksite.updatedAt).toLocaleDateString()}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              URL Slug
            </label>
            <p className="text-slate-400 text-sm font-mono">{worksite.worksiteName}</p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-red-900/10 backdrop-blur rounded-xl p-6 border-2 border-red-500/30">
        <h2 className="text-xl font-bold text-red-400 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          Danger Zone
        </h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="text-white font-semibold mb-2">Delete This Worksite</h3>
            <p className="text-slate-400 text-sm mb-4">
              Once you delete a worksite, there is no going back. This will permanently delete all 
              personnel assignments, alerts, and historical data associated with this worksite.
            </p>
            <button
              onClick={onDelete}
              className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors"
            >
              Delete Worksite
            </button>
          </div>

          <div className="pt-4 border-t border-red-500/30">
            <h3 className="text-white font-semibold mb-2">Archive Worksite</h3>
            <p className="text-slate-400 text-sm mb-4">
              Archive this worksite to preserve data while removing it from active monitoring. You can restore it later.
            </p>
            <button className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors">
              Archive Worksite
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add Worker Modal Component  
function AddWorkerModal({ worksiteId, onClose, onSuccess }: any) {
  const [formData, setFormData] = useState({
    email: '',
    role: 'WORKER'
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          worksiteId
        })
      });

      if (res.ok) {
        alert('Invitation sent successfully!');
        onSuccess();
      } else {
        alert('Failed to send invitation');
      }
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Error sending invitation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-6">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full border border-slate-700 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-6">Invite Worker</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Email Address *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="worker@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SITE_ADMIN">Site Admin</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="WORKER">Worker</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {saving ? 'Sending...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


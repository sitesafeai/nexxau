'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, AlertTriangle, Bell, Clock, MapPin } from 'lucide-react';

export default function AlertRulesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteParam = searchParams.get('worksite');
  
  const [rules, setRules] = useState<any[]>([]);
  const [worksite, setWorksite] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!worksiteParam) {
      setLoading(false);
      return;
    }
    
    loadData();
  }, [worksiteParam]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load worksite
      const worksiteRes = await fetch(`/api/worksites/${worksiteParam}`);
      if (worksiteRes.ok) {
        const data = await worksiteRes.json();
        setWorksite(data.data);
      }
      
      // Load custom rules for this worksite ONLY (filtered by worksiteId)
      const rulesRes = await fetch(`/api/custom-rules?worksiteId=${worksiteParam}`);
      if (rulesRes.ok) {
        const data = await rulesRes.json();
        console.log('[AlertRulesPage] API response:', data);
        const allRules = Array.isArray(data) ? data : (data.data || []);
        console.log('[AlertRulesPage] All rules:', allRules);
        console.log('[AlertRulesPage] Filtering for worksiteId:', worksiteParam);
        // Double-check: filter to ensure only rules for this worksite are shown
        const filteredRules = allRules.filter((rule: any) => {
          const matches = rule.worksiteId === worksiteParam;
          if (!matches) {
            console.log('[AlertRulesPage] Rule filtered out:', {
              ruleId: rule.id,
              ruleName: rule.name,
              ruleWorksiteId: rule.worksiteId,
              expectedWorksiteId: worksiteParam
            });
          }
          return matches;
        });
        console.log('[AlertRulesPage] Filtered rules:', filteredRules);
        setRules(filteredRules);
      } else {
        const errorData = await rulesRes.json().catch(() => ({}));
        console.error('[AlertRulesPage] Failed to fetch rules:', rulesRes.status, errorData);
        setError(`Failed to load rules: ${errorData.error || rulesRes.statusText}`);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      const res = await fetch(`/api/custom-rules/${ruleId}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        loadData();
      } else {
        alert('Failed to delete rule');
      }
    } catch (err) {
      alert('Error deleting rule');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case 'CRITICAL': return 'bg-red-500 text-white';
      case 'HIGH': return 'bg-orange-500 text-white';
      case 'MEDIUM': return 'bg-yellow-500 text-gray-900';
      case 'LOW': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading rules...</p>
        </div>
      </div>
    );
  }

  if (!worksiteParam) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <AlertTriangle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="text-2xl font-semibold text-white mb-2">No Worksite Selected</h2>
            <p className="text-gray-400 mb-6">Please select a worksite to view alert rules</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/dashboard?worksite=${worksiteParam}`)}
            className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-xl bg-gradient-to-br from-purple-600 to-purple-700">
                  <Bell className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Alert Rules</h1>
                  <p className="text-gray-400 mt-1">
                    {worksite ? `Manage custom alert rules for ${worksite.name}` : 'Manage custom alert rules'}
                  </p>
                </div>
              </div>
            </div>
            
            <button
              onClick={() => router.push(`/dashboard/alert-builder?worksite=${worksiteParam}`)}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-semibold"
            >
              <Plus className="w-5 h-5" />
              Create New Rule
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded-lg p-4 mb-6 text-red-200">
            {error}
          </div>
        )}

        {/* Rules List */}
        <div className="space-y-4">
          {rules.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
              <Bell className="w-16 h-16 mx-auto text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No Rules Configured</h3>
              <p className="text-gray-400 mb-6">
                Create your first alert rule to start monitoring your worksite
              </p>
              <button
                onClick={() => router.push(`/dashboard/alert-builder?worksite=${worksiteParam}`)}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create First Rule
              </button>
            </div>
          ) : (
            rules.map((rule) => (
              <div
                key={rule.id}
                className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">{rule.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSeverityColor(rule.severity)}`}>
                        {rule.severity}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        rule.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-600 text-gray-400'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <p className="text-gray-300 mb-4">{rule.description || 'No description'}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-gray-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Type: {rule.triggerType || 'Custom'}</span>
                      </div>
                      
                      {rule.cooldownMinutes && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>Cooldown: {rule.cooldownMinutes}min</span>
                        </div>
                      )}
                      
                      {rule.zoneConfig && (
                        <div className="flex items-center gap-2 text-gray-400">
                          <MapPin className="w-4 h-4" />
                          <span>Has Zone Config</span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2">
                        {rule.smsEnabled && (
                          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">SMS</span>
                        )}
                        {rule.emailEnabled && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">Email</span>
                        )}
                      </div>
                    </div>
                    
                    {rule.cameras && rule.cameras.length > 0 && (
                      <div className="mt-3 text-sm text-gray-400">
                        <span className="font-medium">Cameras:</span> {rule.cameras.map((c: any) => c.name || c.id).join(', ')}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => router.push(`/dashboard/alert-builder?worksite=${worksiteParam}&rule=${rule.id}`)}
                      className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                      title="Edit Rule"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(rule.id)}
                      className="p-2 bg-red-900/50 hover:bg-red-900 text-red-400 hover:text-white rounded-lg transition-colors"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}


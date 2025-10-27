'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plus, Edit, Trash2, Power, PowerOff, Info, RefreshCw } from 'lucide-react';

interface CustomRule {
  id: string;
  name: string;
  description?: string;
  ruleType: string;
  category: string;
  severity: string;
  isActive: boolean;
  priority: number;
  detectionCriteria: any;
  triggerConditions: any;
  alertSettings: any;
  confidenceThreshold: number;
  smsEnabled: boolean;
  emailEnabled: boolean;
  smsRecipients?: string[];
  emailRecipients?: string[];
  camera?: {
    id: string;
    name: string;
    location: string;
  };
  worksite?: {
    id: string;
    name: string;
  };
  violationCount?: number;
  triggerCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function CustomRulesPage() {
  const router = useRouter();
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive'>('all');

  useEffect(() => {
    fetchRules();
  }, [filter]);

  const fetchRules = async () => {
    try {
      const params = filter === 'active' ? '?active=true' : '';
      console.log('Fetching rules from:', `/api/custom-rules${params}`);
      
      const response = await fetch(`/api/custom-rules${params}`, {
        credentials: 'include',
        cache: 'no-store'
      });

      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API Response:', result);
        console.log('Rules data:', result.data);
        console.log('Number of rules:', result.data?.length || 0);
        
        if (result.success) {
          setRules(result.data || []);
        } else {
          console.error('API returned success: false');
        }
      } else {
        console.error('API returned error status:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (error) {
      console.error('Failed to fetch custom rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (ruleId: string, currentState: boolean, ruleName: string) => {
    const action = currentState ? 'deactivate' : 'activate';
    const message = currentState 
      ? `Are you sure you want to DEACTIVATE "${ruleName}"?\n\nThis rule will stop monitoring and no alerts will be triggered.`
      : `Are you sure you want to ACTIVATE "${ruleName}"?\n\nThis rule will start monitoring immediately and trigger alerts when violations are detected.`;
    
    if (!confirm(message)) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentState })
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  };

  const handleDeleteRule = async (ruleId: string, ruleName: string) => {
    if (!confirm(`Are you sure you want to delete "${ruleName}"? This cannot be undone.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/custom-rules/${ruleId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        fetchRules();
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRuleTypeLabel = (ruleType: string) => {
    switch (ruleType) {
      case 'area_monitoring': return 'Zone Violation';
      case 'object_detection': return 'Object Detection';
      case 'behavior_analysis': return 'Behavior Analysis';
      case 'time_based': return 'Time-Based';
      default: return ruleType;
    }
  };

  const filteredRules = rules.filter(rule => {
    if (filter === 'active') return rule.isActive;
    if (filter === 'inactive') return !rule.isActive;
    return true;
  });

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.isActive).length,
    inactive: rules.filter(r => !r.isActive).length,
    totalViolations: rules.reduce((sum, r) => sum + (r.violationCount || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/dashboard')}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white">Custom Alert Rules</h1>
              <p className="text-gray-400">Manage your intelligent detection rules</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setLoading(true);
                fetchRules();
              }}
              className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors flex items-center gap-2"
            >
              <RefreshCw className="h-5 w-5" />
              Refresh
            </button>
            <button
              onClick={() => router.push('/dashboard/alert-builder?from=custom-rules')}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2"
            >
              <Plus className="h-5 w-5" />
              Create New Rule
            </button>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Total Rules</h3>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-green-500/10 backdrop-blur-lg rounded-xl p-6 border border-green-500/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Active</h3>
            <p className="text-3xl font-bold text-green-400">{stats.active}</p>
          </div>
          <div className="bg-gray-500/10 backdrop-blur-lg rounded-xl p-6 border border-gray-500/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Inactive</h3>
            <p className="text-3xl font-bold text-gray-400">{stats.inactive}</p>
          </div>
          <div className="bg-red-500/10 backdrop-blur-lg rounded-xl p-6 border border-red-500/20">
            <h3 className="text-sm font-medium text-gray-300 mb-2">Total Violations</h3>
            <p className="text-3xl font-bold text-red-400">{stats.totalViolations}</p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((filterOption) => (
            <button
              key={filterOption}
              onClick={() => setFilter(filterOption as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === filterOption
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </button>
          ))}
        </div>

        {/* Rules List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="text-center py-20 bg-gray-800/50 rounded-2xl backdrop-blur">
            <svg className="w-20 h-20 mx-auto text-gray-600 mb-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-2xl font-semibold text-gray-300 mb-3">No Custom Rules Yet</h3>
            <p className="text-gray-400 mb-8 text-lg">Create your first intelligent detection rule</p>
            <button
              onClick={() => router.push('/dashboard/alert-builder?from=custom-rules')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors font-semibold shadow-lg"
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRules.map((rule) => (
              <div
                key={rule.id}
                className="bg-gray-800/50 backdrop-blur rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-semibold text-white">{rule.name}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getSeverityColor(rule.severity)}`}>
                        {rule.severity.toUpperCase()}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        rule.isActive ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-600 text-white">
                        {getRuleTypeLabel(rule.ruleType)}
                      </span>
                    </div>

                    {/* Description */}
                    {rule.description && (
                      <p className="text-gray-300 mb-4">{rule.description}</p>
                    )}

                    {/* Rule Details */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                        <p className="text-gray-400 text-xs mb-1">Detection Object</p>
                        <p className="text-white font-medium text-sm">
                          {rule.detectionCriteria?.objectClass || 'Zone-based'}
                        </p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                        <p className="text-gray-400 text-xs mb-1">Confidence</p>
                        <p className="text-white font-medium text-sm">
                          {(rule.confidenceThreshold * 100).toFixed(0)}%
                        </p>
                      </div>
                      <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/30">
                        <p className="text-gray-400 text-xs mb-1">Camera Scope</p>
                        <p className="text-white font-medium text-sm">
                          {rule.camera ? rule.camera.name : 'All Cameras'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {rule.alertSettings?.actions?.map((action: string, idx: number) => (
                        <span key={idx} className="px-2 py-1 bg-blue-600/20 text-blue-300 rounded text-xs font-medium border border-blue-500/30">
                          {action.replace('_', ' ').toUpperCase()}
                        </span>
                      ))}
                    </div>

                    {/* Notification Recipients */}
                    {(rule.smsRecipients?.length || rule.emailRecipients?.length) && (
                      <div className="text-sm text-gray-400 space-y-1">
                        {rule.smsRecipients && rule.smsRecipients.length > 0 && (
                          <p>📱 SMS: {rule.smsRecipients.join(', ')}</p>
                        )}
                        {rule.emailRecipients && rule.emailRecipients.length > 0 && (
                          <p>📧 Email: {rule.emailRecipients.join(', ')}</p>
                        )}
                      </div>
                    )}

                    {/* Stats */}
                    {(rule.violationCount !== undefined || rule.triggerCount !== undefined) && (
                      <div className="flex gap-4 mt-3 text-sm">
                        <span className="text-red-400">
                          Violations: {rule.violationCount || 0}
                        </span>
                        <span className="text-yellow-400">
                          Triggers: {rule.triggerCount || 0}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => handleToggleActive(rule.id, rule.isActive, rule.name)}
                      className={`p-2 rounded-lg transition-colors ${
                        rule.isActive
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-600 hover:bg-gray-700 text-white'
                      }`}
                      title={rule.isActive ? 'Deactivate rule' : 'Activate rule'}
                    >
                      {rule.isActive ? <Power className="h-5 w-5" /> : <PowerOff className="h-5 w-5" />}
                    </button>
                    <button
                      onClick={() => router.push(`/dashboard/alert-builder?edit=${rule.id}&from=custom-rules`)}
                      className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      title="Edit rule"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteRule(rule.id, rule.name)}
                      className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      title="Delete rule"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-6">
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            <Info className="h-5 w-5 text-blue-400" />
            About Custom Rules
          </h3>
          <ul className="text-gray-400 text-sm space-y-2">
            <li>• Create rules to detect specific safety violations (missing PPE, zone violations, etc.)</li>
            <li>• Rules are automatically synced with your AI detection service</li>
            <li>• Active rules are checked in real-time (30 times per second on 30 FPS cameras)</li>
            <li>• You can enable/disable rules without deleting them</li>
            <li>• Configure SMS and email recipients to get instant notifications</li>
            <li>• Video evidence is automatically captured when violations occur</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

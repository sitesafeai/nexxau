'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import WorkflowBuilder from '@/app/components/workflow/WorkflowBuilder';
import Copilot from '@/app/components/Copilot';
import RuleBuilder from '@/app/components/RuleBuilder';

interface WorkflowNode {
  id: string;
  type: 'trigger' | 'condition' | 'action';
  title: string;
  description: string;
  config: any;
  position: { x: number; y: number };
}

interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
}

interface Rule {
  id: string;
  name: string;
  description: string;
  severity: string;
  enabled: boolean;
  camera: string;
  threshold: number;
  workflow: {
    nodes: WorkflowNode[];
    connections: WorkflowConnection[];
  };
}

export default function AlertsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('rules');
  const [saving, setSaving] = useState(false);
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);
  const [selectedRule, setSelectedRule] = useState<Rule | null>(null);
  const [workflowNodes, setWorkflowNodes] = useState<WorkflowNode[]>([]);
  const [workflowConnections, setWorkflowConnections] = useState<WorkflowConnection[]>([]);
  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [cameraOptions, setCameraOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [showCopilot, setShowCopilot] = useState(false);

  const [rules, setRules] = useState<Rule[]>([]);

  // Load rules from API
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/alerts/rules', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          const mapped = (data || []).map((r: any) => ({
            id: r.id,
            name: r.name,
            description: r.description || '',
            severity: r.severity,
            enabled: r.isActive,
            camera: r.condition?.camera ?? 'All Cameras',
            threshold: r.condition?.threshold ?? 0.8,
            workflow: r.condition?.workflow ?? { nodes: [], connections: [] },
          }));
          setRules(mapped);
        }
      } catch (e) { console.error('Failed to load rules', e); }
    };
    load();
  }, []);

  // Load cameras for dropdown
  useEffect(() => {
    const loadCameras = async () => {
      try {
        const res = await fetch('/api/cameras', { cache: 'no-store' });
        if (res.ok) {
          const cams = await res.json();
          setCameraOptions(cams.map((c: any) => ({ id: c.id, name: c.name })));
        }
      } catch {}
    };
    loadCameras();
  }, []);

  const handleWorkflowChange = (nodes: WorkflowNode[], connections: WorkflowConnection[]) => {
    setWorkflowNodes(nodes);
    setWorkflowConnections(connections);
  };

  const handleSaveWorkflow = async () => {
    if (!selectedRule) return;
    
    try {
      const res = await fetch(`/api/alerts/rules/${selectedRule.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          workflow: { nodes: workflowNodes, connections: workflowConnections }
        }),
      });
      
      if (res.ok) {
        // Update local state
        setRules(prev => prev.map(r => 
          r.id === selectedRule.id 
            ? { ...r, workflow: { nodes: workflowNodes, connections: workflowConnections } }
            : r
        ));
        setSelectedRule(null);
        setShowWorkflowBuilder(false);
      }
    } catch (e) {
      console.error('Failed to save workflow', e);
    }
  };

  const handleEditRule = (rule: Rule) => {
    setSelectedRule(rule);
    setWorkflowNodes(rule.workflow.nodes);
    setWorkflowConnections(rule.workflow.connections);
    setShowWorkflowBuilder(true);
  };

  const handleAddRule = async (ruleData: any) => {
    try {
      console.log('Creating rule with data:', ruleData);
      
      const res = await fetch('/api/alerts/rules', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: ruleData.name,
          description: ruleData.description,
          category: ruleData.category,
          severity: ruleData.severity,
          targetType: ruleData.targetType,
          targetZones: ruleData.targetZones,
          targetCameras: ruleData.targetCameras,
          targetWorkerRoles: ruleData.targetWorkerRoles,
          condition: {
            ...ruleData.conditions,
            workflow: { nodes: [], connections: [] }
          },
          actions: ruleData.actions,
          escalationEnabled: ruleData.escalationEnabled,
          escalationDelay: ruleData.escalationDelay,
          webhookUrl: ruleData.webhookUrl,
          isActive: ruleData.isActive
        }),
      });
      
      if (res.ok) {
        const r = await res.json();
        console.log('Rule created successfully:', r);
        
        // Add the new rule to the list
        const newRuleData = {
          id: r.id,
          name: r.name,
          description: r.description || '',
          severity: r.severity.toLowerCase(),
          enabled: r.isActive,
          camera: r.condition?.camera ?? 'All Cameras',
          threshold: r.condition?.threshold ?? 0.8,
          workflow: r.condition?.workflow ?? { nodes: [], connections: [] },
        };
        
        setRules((prev) => [...prev, newRuleData]);
        setShowRuleBuilder(false);
        
        // Show success message
        alert('Rule created successfully!');
      } else {
        const errorData = await res.json();
        console.error('Failed to create rule:', errorData);
        alert(`Failed to create rule: ${errorData.error || 'Unknown error'}`);
      }
    } catch (e) {
      console.error('Failed to add rule:', e);
      alert('Failed to create rule. Please try again.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const res = await fetch(`/api/alerts/rules/${ruleId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId));
      }
    } catch (e) {
      console.error('Failed to delete rule', e);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'border-green-500 text-green-400';
      case 'medium': return 'border-yellow-500 text-yellow-400';
      case 'high': return 'border-orange-500 text-orange-400';
      case 'critical': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const notificationSettings = [
    { id: 'email', name: 'Email Notifications', enabled: true },
    { id: 'sms', name: 'SMS Alerts', enabled: true },
    { id: 'push', name: 'Push Notifications', enabled: false },
    { id: 'webhook', name: 'Webhook Integration', enabled: false }
  ];

  if (showWorkflowBuilder) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-white">Workflow Builder</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowWorkflowBuilder(false);
                  setSelectedRule(null);
                }}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkflow}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Save Workflow
              </button>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">
              {selectedRule ? `Editing: ${selectedRule.name}` : 'Create New Workflow'}
            </h2>
            <WorkflowBuilder
              initialNodes={workflowNodes}
              initialConnections={workflowConnections}
              onWorkflowChange={handleWorkflowChange}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Safety Alerts & Workflows</h1>
            <p className="text-gray-400">Monitor safety violations and create intelligent response workflows</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowCopilot(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl transition-all duration-200 transform hover:scale-105 flex items-center space-x-2"
            >
              <span className="text-xl">🤖</span>
              <span>Ask Copilot</span>
            </button>
            <button
              onClick={() => setShowRuleBuilder(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
            >
              Add Rule
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-xl p-1 mb-8">
          {[
            { id: 'rules', label: 'Alert Rules', icon: '🚨' },
            { id: 'workflows', label: 'Workflows', icon: '🔄' },
            { id: 'analytics', label: 'Analytics', icon: '📊' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Alert Rules</h2>
              <button 
                onClick={() => setShowRuleBuilder(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Add Rule</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="flex items-start justify-between mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                          {rule.severity}
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditRule(rule)}
                        className="p-2 text-gray-400 hover:text-blue-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="p-2 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-white mb-2">{rule.name}</h3>
                  <p className="text-gray-400 text-sm mb-4">{rule.description}</p>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Camera:</span>
                      <span className="text-white">{rule.camera}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Threshold:</span>
                      <span className="text-white">{Math.round(rule.threshold * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status:</span>
                      <span className={`${rule.enabled ? 'text-green-400' : 'text-red-400'}`}>
                        {rule.enabled ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  
                  {rule.workflow.nodes.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>🔄</span>
                        <span>Workflow: {rule.workflow.nodes.length} nodes</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Workflows Tab */}
        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Workflow Builder</h2>
              <div className="text-gray-400 text-sm">
                Create intelligent workflows that automatically respond to safety events
              </div>
            </div>

            {/* Workflow Instructions */}
            <div className="bg-blue-900/20 border border-blue-700 rounded-xl p-4">
              <h3 className="text-blue-300 font-medium mb-2">🎯 How to Build Workflows</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-200">
                          <div>
                  <div className="font-medium mb-1">1. Start with Triggers</div>
                  <div className="text-blue-300">🔴 Red nodes start the workflow (e.g., Person Detected)</div>
                          </div>
                <div>
                  <div className="font-medium mb-1">2. Add Conditions</div>
                  <div className="text-blue-300">🟡 Yellow nodes check conditions (e.g., No Hard Hat)</div>
                        </div>
                <div>
                  <div className="font-medium mb-1">3. End with Actions</div>
                  <div className="text-blue-300">🟢 Green nodes execute actions (e.g., Send Alert)</div>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Create New Workflow</h3>
              <p className="text-gray-400 mb-6">
                Build intelligent workflows that automatically respond to safety events. 
                Start by creating a rule, then use the workflow builder to define the flow.
              </p>
              
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowRuleBuilder(true)}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors"
                >
                  Create Rule First
                </button>
                <button
                  onClick={() => setShowCopilot(true)}
                  className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-xl transition-colors flex items-center space-x-2"
                >
                  <span>🤖</span>
                  <span>Ask Copilot for Help</span>
                </button>
                          </div>
                        </div>

            {/* Existing Workflows */}
            {rules.filter(r => r.workflow.nodes.length > 0).length > 0 && (
              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <h3 className="text-lg font-semibold text-white mb-4">Existing Workflows</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {rules.filter(r => r.workflow.nodes.length > 0).map((rule) => (
                    <div key={rule.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-white">{rule.name}</h4>
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400">
                        <span>🔄</span>
                        <span>{rule.workflow.nodes.length} nodes, {rule.workflow.connections.length} connections</span>
                      </div>
                  </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Analytics & Performance</h2>
              <button
                onClick={() => setShowRuleBuilder(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <span>➕</span>
                <span>Add Rule</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                    <div>
                    <p className="text-gray-400 text-sm">Total Alerts</p>
                    <p className="text-2xl font-bold text-white">1,247</p>
                  </div>
                  <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🚨</span>
                      </div>
                    </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm">
                    <span className="text-green-400">+12%</span>
                    <span className="text-gray-400 ml-2">from last month</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-sm">Response Time</p>
                    <p className="text-2xl font-bold text-white">2.3s</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⚡</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm">
                    <span className="text-green-400">-8%</span>
                    <span className="text-gray-400 ml-2">from last month</span>
                  </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm">Detection Rate</p>
                    <p className="text-2xl font-bold text-white">94.2%</p>
                  </div>
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">🎯</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm">
                    <span className="text-green-400">+2.1%</span>
                    <span className="text-gray-400 ml-2">from last month</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                <div className="flex items-center justify-between">
                <div>
                    <p className="text-gray-400 text-sm">Active Rules</p>
                    <p className="text-2xl font-bold text-white">{rules.filter(r => r.enabled).length}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">⚙️</span>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center text-sm">
                    <span className="text-gray-400">Currently active</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Detection Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">Object Detection</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Person Detection', value: 85 },
                        { name: 'Vehicle Detection', value: 90 },
                        { name: 'Equipment Detection', value: 75 },
                        { name: 'Safety Gear Detection', value: 80 }
                      ].map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>{item.name}</span>
                            <span>{item.value}%</span>
                          </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                  <h4 className="text-md font-medium text-gray-300 mb-3">Behavior Analysis</h4>
                    <div className="space-y-3">
                      {[
                        { name: 'Movement Speed', value: 70 },
                        { name: 'Area Violations', value: 85 },
                        { name: 'Equipment Usage', value: 75 },
                        { name: 'Safety Compliance', value: 90 }
                      ].map((item) => (
                        <div key={item.name}>
                          <div className="flex justify-between text-sm text-gray-300 mb-1">
                            <span>{item.name}</span>
                            <span>{item.value}%</span>
                          </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${item.value}%` }}
                          ></div>
                        </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rule Builder Modal */}
        {showRuleBuilder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <RuleBuilder
              onSave={handleAddRule}
              onCancel={() => setShowRuleBuilder(false)}
            />
          </div>
        )}

        {/* Copilot */}
        <Copilot 
          isOpen={showCopilot} 
          onClose={() => setShowCopilot(false)}
          onAction={(action) => {
            if (action === 'create-rule') {
              setShowCopilot(false);
              setShowRuleBuilder(true);
            }
          }}
        />
      </div>
    </div>
  );
} 
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [showAddRule, setShowAddRule] = useState(false);
  const [newRule, setNewRule] = useState({
    name: '',
    description: '',
    severity: 'medium',
    camera: 'All Cameras',
    threshold: 0.8
  });

  const alertRules: Rule[] = [
    {
      id: '1',
      name: 'No Hard Hat Detection',
      description: 'Detect workers without safety helmets',
      severity: 'high',
      enabled: true,
      camera: 'All Cameras',
      threshold: 0.8,
      workflow: {
        nodes: [
          {
            id: 'trigger-1',
            type: 'trigger',
            title: 'Person Detected',
            description: 'Trigger when a person is detected',
            config: { confidence: 0.8 },
            position: { x: 100, y: 100 }
          },
          {
            id: 'condition-1',
            type: 'condition',
            title: 'No Hard Hat',
            description: 'Check if person is wearing hard hat',
            config: { object: 'hard_hat', present: false },
            position: { x: 300, y: 100 }
          },
          {
            id: 'action-1',
            type: 'action',
            title: 'Send Alert',
            description: 'Send notification to safety team',
            config: { notification: 'email', recipients: ['safety@company.com'] },
            position: { x: 500, y: 100 }
          }
        ],
        connections: [
          { id: 'conn-1', from: 'trigger-1', to: 'condition-1' },
          { id: 'conn-2', from: 'condition-1', to: 'action-1' }
        ]
      }
    },
    {
      id: '2',
      name: 'Unauthorized Access',
      description: 'Detect unauthorized personnel in restricted areas',
      severity: 'critical',
      enabled: true,
      camera: 'Perimeter Cameras',
      threshold: 0.9,
      workflow: {
        nodes: [
          {
            id: 'trigger-2',
            type: 'trigger',
            title: 'Person in Restricted Area',
            description: 'Trigger when person enters restricted zone',
            config: { zone: 'restricted_area' },
            position: { x: 100, y: 200 }
          },
          {
            id: 'action-2',
            type: 'action',
            title: 'Immediate Alert',
            description: 'Send critical alert immediately',
            config: { notification: 'sms', recipients: ['security@company.com'] },
            position: { x: 300, y: 200 }
          }
        ],
        connections: [
          { id: 'conn-3', from: 'trigger-2', to: 'action-2' }
        ]
      }
    },
    {
      id: '3',
      name: 'Equipment Malfunction',
      description: 'Detect equipment operating outside normal parameters',
      severity: 'medium',
      enabled: false,
      camera: 'Equipment Cameras',
      threshold: 0.7,
      workflow: {
        nodes: [],
        connections: []
      }
    },
    {
      id: '4',
      name: 'Speed Violation',
      description: 'Detect vehicles exceeding speed limits',
      severity: 'high',
      enabled: true,
      camera: 'Vehicle Cameras',
      threshold: 0.85,
      workflow: {
        nodes: [],
        connections: []
      }
    }
  ];

  const [rules, setRules] = useState<Rule[]>(alertRules);

  const notificationSettings = [
    { id: 'email', name: 'Email Notifications', enabled: true },
    { id: 'sms', name: 'SMS Alerts', enabled: false },
    { id: 'push', name: 'Push Notifications', enabled: true },
    { id: 'webhook', name: 'Webhook Integration', enabled: false }
  ];

  const availableNodes = [
    {
      type: 'trigger',
      title: 'Person Detected',
      description: 'Trigger when a person is detected',
      icon: '👤'
    },
    {
      type: 'trigger',
      title: 'Vehicle Detected',
      description: 'Trigger when a vehicle is detected',
      icon: '🚗'
    },
    {
      type: 'trigger',
      title: 'Motion Detected',
      description: 'Trigger when motion is detected',
      icon: '📹'
    },
    {
      type: 'condition',
      title: 'No Safety Gear',
      description: 'Check if safety gear is missing',
      icon: '⛑️'
    },
    {
      type: 'condition',
      title: 'Speed Check',
      description: 'Check if speed exceeds limit',
      icon: '⚡'
    },
    {
      type: 'condition',
      title: 'Area Violation',
      description: 'Check if person is in restricted area',
      icon: '🚫'
    },
    {
      type: 'action',
      title: 'Send Email',
      description: 'Send email notification',
      icon: '📧'
    },
    {
      type: 'action',
      title: 'Send SMS',
      description: 'Send SMS alert',
      icon: '📱'
    },
    {
      type: 'action',
      title: 'Record Video',
      description: 'Start video recording',
      icon: '🎥'
    },
    {
      type: 'action',
      title: 'Sound Alarm',
      description: 'Trigger audible alarm',
      icon: '🔊'
    }
  ];

  const handleSaveSettings = async () => {
    setSaving(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    console.log('Alert settings saved');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-900 text-red-300';
      case 'high': return 'bg-orange-900 text-orange-300';
      case 'medium': return 'bg-yellow-900 text-yellow-300';
      case 'low': return 'bg-blue-900 text-blue-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };

  const handleAddRule = () => {
    const newRuleData: Rule = {
      id: Date.now().toString(),
      name: newRule.name,
      description: newRule.description,
      severity: newRule.severity,
      enabled: true,
      camera: newRule.camera,
      threshold: newRule.threshold,
      workflow: {
        nodes: [],
        connections: []
      }
    };
    setRules([...rules, newRuleData]);
    setShowAddRule(false);
    setNewRule({ name: '', description: '', severity: 'medium', camera: 'All Cameras', threshold: 0.8 });
  };

  const handleEditRule = (rule: Rule) => {
    setSelectedRule(rule);
    setWorkflowNodes(rule.workflow.nodes);
    setWorkflowConnections(rule.workflow.connections);
    setShowWorkflowBuilder(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    setRules(rules.filter(rule => rule.id !== ruleId));
  };

  const handleDragStart = (e: React.DragEvent, nodeType: string, nodeData: any) => {
    setDraggedNode({
      id: `new-${Date.now()}`,
      type: nodeType as 'trigger' | 'condition' | 'action',
      title: nodeData.title,
      description: nodeData.description,
      config: {},
      position: { x: 0, y: 0 }
    });
  };

  const handleWorkflowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedNode) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newNode = {
        ...draggedNode,
        position: { x, y }
      };
      
      setWorkflowNodes([...workflowNodes, newNode]);
      setDraggedNode(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleNodeDrag = (nodeId: string, x: number, y: number) => {
    setWorkflowNodes(nodes => 
      nodes.map(node => 
        node.id === nodeId ? { ...node, position: { x, y } } : node
      )
    );
  };

  const handleSaveWorkflow = () => {
    if (selectedRule) {
      const updatedRule = {
        ...selectedRule,
        workflow: {
          nodes: workflowNodes,
          connections: workflowConnections
        }
      };
      setRules(rules.map(rule => 
        rule.id === selectedRule.id ? updatedRule : rule
      ));
      setShowWorkflowBuilder(false);
      setSelectedRule(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-400 hover:text-white transition-colors mb-4"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Dashboard
            </button>
            <h1 className="text-3xl font-bold text-white">Alert Configuration</h1>
            <p className="text-gray-400 mt-2">Configure safety alert rules and notification preferences</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              saving
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1 mb-8">
          {[
            { id: 'rules', name: 'Alert Rules' },
            { id: 'workflows', name: 'Workflow Builder' },
            { id: 'notifications', name: 'Notifications' },
            { id: 'sensitivity', name: 'Detection Sensitivity' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'rules' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Alert Rules</h2>
              <button 
                onClick={() => setShowAddRule(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Add New Rule
              </button>
            </div>
            
            <div className="grid gap-4">
              {rules.map((rule) => (
                <div key={rule.id} className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{rule.name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                          {rule.severity}
                        </span>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={rule.enabled}
                            onChange={(e) => {
                              setRules(rules.map(r => 
                                r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                              ));
                            }}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-300">Enabled</span>
                        </label>
                      </div>
                      <p className="text-gray-400 mb-3">{rule.description}</p>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Camera:</span>
                          <span className="text-white ml-2">{rule.camera}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Threshold:</span>
                          <span className="text-white ml-2">{rule.threshold}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Workflow Nodes:</span>
                          <span className="text-white ml-2">{rule.workflow.nodes.length}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEditRule(rule)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                        title="Edit Workflow"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => handleDeleteRule(rule.id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Delete Rule"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'workflows' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-white">Workflow Builder</h2>
              <div className="text-gray-400 text-sm">
                Drag and drop nodes to create custom alert workflows
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Available Nodes */}
              <div className="lg:col-span-1">
                <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                  <h3 className="text-lg font-semibold text-white mb-4">Available Nodes</h3>
                  <div className="space-y-3">
                    {availableNodes.map((node, index) => (
                      <div
                        key={index}
                        draggable
                        onDragStart={(e) => handleDragStart(e, node.type, node)}
                        className="bg-gray-700 rounded-lg p-3 cursor-move hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">{node.icon}</span>
                          <div>
                            <div className="text-white font-medium text-sm">{node.title}</div>
                            <div className="text-gray-400 text-xs">{node.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Workflow Canvas */}
              <div className="lg:col-span-3">
                <div 
                  className="bg-gray-800 rounded-xl p-6 border border-gray-700 min-h-96"
                  onDrop={handleWorkflowDrop}
                  onDragOver={handleDragOver}
                >
                  <h3 className="text-lg font-semibold text-white mb-4">Workflow Canvas</h3>
                  <div className="relative min-h-80 bg-gray-900 rounded-lg border-2 border-dashed border-gray-600">
                    {workflowNodes.map((node) => (
                      <div
                        key={node.id}
                        className="absolute bg-gray-700 rounded-lg p-3 border border-gray-600 cursor-move"
                        style={{ left: node.position.x, top: node.position.y }}
                        draggable
                        onDragEnd={(e) => {
                          const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                          if (rect) {
                            const x = e.clientX - rect.left;
                            const y = e.clientY - rect.top;
                            handleNodeDrag(node.id, x, y);
                          }
                        }}
                      >
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">
                            {node.type === 'trigger' ? '🔴' : node.type === 'condition' ? '🟡' : '🟢'}
                          </span>
                          <div>
                            <div className="text-white font-medium text-sm">{node.title}</div>
                            <div className="text-gray-400 text-xs">{node.description}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {workflowNodes.length === 0 && (
                      <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                          <div className="text-gray-600 text-6xl mb-4">📋</div>
                          <p className="text-gray-400">Drag nodes here to build your workflow</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Notification Settings</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="space-y-4">
                {notificationSettings.map((setting) => (
                  <div key={setting.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-medium">{setting.name}</div>
                      <div className="text-gray-400 text-sm">
                        {setting.id === 'email' && 'Receive alerts via email'}
                        {setting.id === 'sms' && 'Receive critical alerts via SMS'}
                        {setting.id === 'push' && 'Receive real-time push notifications'}
                        {setting.id === 'webhook' && 'Send alerts to external systems'}
                      </div>
                    </div>
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={setting.enabled}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Notification Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Quiet Hours</label>
                  <div className="flex space-x-2">
                    <input
                      type="time"
                      defaultValue="22:00"
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-gray-400 self-center">to</span>
                    <input
                      type="time"
                      defaultValue="06:00"
                      className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Escalation Delay</label>
                  <select className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>5 minutes</option>
                    <option>15 minutes</option>
                    <option>30 minutes</option>
                    <option>1 hour</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sensitivity' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-white">Detection Sensitivity</h2>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Overall Detection Sensitivity</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="75"
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>Low</span>
                    <span>Medium</span>
                    <span>High</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Object Detection</h3>
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
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={item.value}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-4">Behavior Analysis</h3>
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
                          <input
                            type="range"
                            min="0"
                            max="100"
                            defaultValue={item.value}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Rule Modal */}
        {showAddRule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Add New Rule</h3>
                <button 
                  onClick={() => setShowAddRule(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Rule Name</label>
                  <input
                    type="text"
                    value={newRule.name}
                    onChange={(e) => setNewRule({...newRule, name: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter rule name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                  <textarea
                    value={newRule.description}
                    onChange={(e) => setNewRule({...newRule, description: e.target.value})}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter rule description"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                    <select
                      value={newRule.severity}
                      onChange={(e) => setNewRule({...newRule, severity: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Camera</label>
                    <select
                      value={newRule.camera}
                      onChange={(e) => setNewRule({...newRule, camera: e.target.value})}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="All Cameras">All Cameras</option>
                      <option value="Perimeter Cameras">Perimeter Cameras</option>
                      <option value="Equipment Cameras">Equipment Cameras</option>
                      <option value="Vehicle Cameras">Vehicle Cameras</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Threshold</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={newRule.threshold}
                    onChange={(e) => setNewRule({...newRule, threshold: parseFloat(e.target.value)})}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-1">
                    <span>0</span>
                    <span>{newRule.threshold}</span>
                    <span>1</span>
                  </div>
                </div>
                <div className="flex space-x-3 pt-4">
                  <button 
                    onClick={() => setShowAddRule(false)}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddRule}
                    disabled={!newRule.name || !newRule.description}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Add Rule
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workflow Builder Modal */}
        {showWorkflowBuilder && selectedRule && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">Workflow Builder - {selectedRule.name}</h3>
                <button 
                  onClick={() => setShowWorkflowBuilder(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Available Nodes */}
                <div className="lg:col-span-1">
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-white mb-4">Available Nodes</h4>
                    <div className="space-y-3">
                      {availableNodes.map((node, index) => (
                        <div
                          key={index}
                          draggable
                          onDragStart={(e) => handleDragStart(e, node.type, node)}
                          className="bg-gray-600 rounded-lg p-3 cursor-move hover:bg-gray-500 transition-colors"
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-xl">{node.icon}</span>
                            <div>
                              <div className="text-white font-medium text-sm">{node.title}</div>
                              <div className="text-gray-300 text-xs">{node.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Workflow Canvas */}
                <div className="lg:col-span-3">
                  <div 
                    className="bg-gray-700 rounded-lg p-4 min-h-96"
                    onDrop={handleWorkflowDrop}
                    onDragOver={handleDragOver}
                  >
                    <h4 className="text-lg font-semibold text-white mb-4">Workflow Canvas</h4>
                    <div className="relative min-h-80 bg-gray-900 rounded-lg border-2 border-dashed border-gray-600">
                      {workflowNodes.map((node) => (
                        <div
                          key={node.id}
                          className="absolute bg-gray-600 rounded-lg p-3 border border-gray-500 cursor-move"
                          style={{ left: node.position.x, top: node.position.y }}
                          draggable
                          onDragEnd={(e) => {
                            const rect = e.currentTarget.parentElement?.getBoundingClientRect();
                            if (rect) {
                              const x = e.clientX - rect.left;
                              const y = e.clientY - rect.top;
                              handleNodeDrag(node.id, x, y);
                            }
                          }}
                        >
                          <div className="flex items-center space-x-2">
                            <span className="text-lg">
                              {node.type === 'trigger' ? '🔴' : node.type === 'condition' ? '🟡' : '🟢'}
                            </span>
                            <div>
                              <div className="text-white font-medium text-sm">{node.title}</div>
                              <div className="text-gray-300 text-xs">{node.description}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                      
                      {workflowNodes.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-gray-600 text-6xl mb-4">📋</div>
                            <p className="text-gray-400">Drag nodes here to build your workflow</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 mt-6">
                <button 
                  onClick={() => setShowWorkflowBuilder(false)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveWorkflow}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Save Workflow
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
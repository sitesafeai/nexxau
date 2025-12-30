'use client';

import React, { useState, useEffect } from 'react';

interface RuleTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  conditions: RuleCondition[];
  actions: RuleAction[];
  severity: string;
  targetType: string;
}

interface RuleCondition {
  type: string;
  operator: string;
  value: any;
  unit?: string;
  description: string;
}

interface RuleAction {
  type: string;
  config: any;
  description: string;
}

interface RuleBuilderProps {
  onSave: (rule: any) => void;
  onCancel: () => void;
  initialRule?: any;
}

const RuleBuilder: React.FC<RuleBuilderProps> = ({ onSave, onCancel, initialRule }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);
  const [ruleData, setRuleData] = useState<any>({
    name: '',
    description: '',
    category: 'PPE_COMPLIANCE',
    severity: 'WARNING',
    targetType: 'SITE_WIDE',
    targetZones: [],
    targetCameras: [],
    targetWorkerRoles: [],
    conditions: [],
    actions: [],
    escalationEnabled: false,
    escalationDelay: 300,
    webhookUrl: '',
    isActive: true
  });

  // Predefined rule templates based on the framework
  const ruleTemplates: RuleTemplate[] = [
    {
      id: 'ppe-helmet',
      name: 'No Helmet Detection',
      description: 'Alert when workers enter active zones without hard hats',
      category: 'PPE_COMPLIANCE',
      icon: '🪖',
      severity: 'WARNING',
      targetType: 'ZONE_SPECIFIC',
      conditions: [
        {
          type: 'ppe_absence',
          operator: 'equals',
          value: 'hard_hat',
          description: 'No hard hat detected'
        },
        {
          type: 'zone_entrance',
          operator: 'enters',
          value: 'active_work_zone',
          description: 'Worker enters active work zone'
        }
      ],
      actions: [
        {
          type: 'AUDIO_ALERT',
          config: { message: 'Hard hat required in this area' },
          description: 'Play audio warning'
        },
        {
          type: 'PUSH_NOTIFICATION',
          config: { recipients: ['safety_manager'] },
          description: 'Notify safety manager'
        }
      ]
    },
    {
      id: 'equipment-speed',
      name: 'Forklift Speed Violation',
      description: 'Alert when forklifts exceed speed limits in specific zones',
      category: 'EQUIPMENT_SAFETY',
      icon: '🚗',
      severity: 'CRITICAL',
      targetType: 'ZONE_SPECIFIC',
      conditions: [
        {
          type: 'speed_threshold',
          operator: 'greater_than',
          value: 10,
          unit: 'mph',
          description: 'Speed exceeds 10 mph'
        },
        {
          type: 'zone_type',
          operator: 'equals',
          value: 'indoor_warehouse',
          description: 'In indoor warehouse zone'
        }
      ],
      actions: [
        {
          type: 'AUDIO_ALERT',
          config: { message: 'Reduce speed immediately' },
          description: 'Play audio warning'
        },
        {
          type: 'RECORD_VIDEO',
          config: { duration: 30 },
          description: 'Record 30 seconds of video'
        }
      ]
    },
    {
      id: 'zone-violation',
      name: 'Restricted Area Access',
      description: 'Alert when workers enter restricted or dangerous areas',
      category: 'SITE_HAZARDS',
      icon: '🚫',
      severity: 'CRITICAL',
      targetType: 'ZONE_SPECIFIC',
      conditions: [
        {
          type: 'zone_access',
          operator: 'enters',
          value: 'restricted_area',
          description: 'Worker enters restricted area'
        }
      ],
      actions: [
        {
          type: 'AUDIO_ALERT',
          config: { message: 'Unauthorized area - exit immediately' },
          description: 'Play audio warning'
        },
        {
          type: 'ESCALATE_ALERT',
          config: { level: 'immediate' },
          description: 'Immediate escalation'
        }
      ]
    },
    {
      id: 'behavior-density',
      name: 'Unsafe Worker Density',
      description: 'Alert when too many workers gather in confined spaces',
      category: 'BEHAVIORAL_WORKFLOW',
      icon: '👥',
      severity: 'WARNING',
      targetType: 'ZONE_SPECIFIC',
      conditions: [
        {
          type: 'worker_count',
          operator: 'greater_than',
          value: 5,
          description: 'More than 5 workers in zone'
        },
        {
          type: 'zone_type',
          operator: 'equals',
          value: 'confined_space',
          description: 'In confined space zone'
        }
      ],
      actions: [
        {
          type: 'PUSH_NOTIFICATION',
          config: { recipients: ['supervisor'] },
          description: 'Notify supervisor'
        },
        {
          type: 'DASHBOARD_FLAG',
          config: { priority: 'high' },
          description: 'Flag on dashboard'
        }
      ]
    },
    {
      id: 'environmental-smoke',
      name: 'Smoke/Fire Detection',
      description: 'Alert when smoke or fire is detected via cameras',
      category: 'ENVIRONMENTAL_EMERGENCY',
      icon: '🔥',
      severity: 'EMERGENCY',
      targetType: 'CAMERA_SPECIFIC',
      conditions: [
        {
          type: 'smoke_detection',
          operator: 'detected',
          value: true,
          description: 'Smoke detected'
        }
      ],
      actions: [
        {
          type: 'AUDIO_ALERT',
          config: { message: 'Fire alarm - evacuate immediately' },
          description: 'Play evacuation message'
        },
        {
          type: 'ESCALATE_ALERT',
          config: { level: 'emergency' },
          description: 'Emergency escalation'
        }
      ]
    }
  ];

  useEffect(() => {
    if (initialRule) {
      setRuleData(initialRule);
    }
  }, [initialRule]);

  const handleTemplateSelect = (template: RuleTemplate) => {
    setSelectedTemplate(template);
    setRuleData((prev: any) => ({
      ...prev,
      name: template.name,
      description: template.description,
      category: template.category,
      severity: template.severity,
      targetType: template.targetType,
      conditions: template.conditions || [],
      actions: template.actions || [],
      escalationLevels: []
    }));
    setCurrentStep(2);
  };

  const handleCustomRule = () => {
    setSelectedTemplate(null);
    setRuleData((prev: any) => ({
      ...prev,
      name: '',
      description: '',
      category: 'CUSTOM',
      severity: 'WARNING',
      targetType: 'SITE_WIDE',
      conditions: [],
      actions: [],
      escalationLevels: []
    }));
    setCurrentStep(3); // Go to custom rule step
  };

  const handleSave = () => {
    if (!ruleData.name.trim()) {
      alert('Please enter a rule name');
      return;
    }
    
    // Ensure we have at least basic data
    if (!ruleData.conditions || ruleData.conditions.length === 0) {
      alert('Please select a rule template with conditions');
      return;
    }
    
    if (!ruleData.actions || ruleData.actions.length === 0) {
      alert('Please select a rule template with actions');
      return;
    }
    
    onSave(ruleData);
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-xl font-semibold text-white mb-2">Choose Rule Template</h3>
        <p className="text-gray-400">Select from predefined templates or create a custom rule</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {ruleTemplates.map((template) => (
          <div
            key={template.id}
            onClick={() => handleTemplateSelect(template)}
            className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-blue-500 cursor-pointer transition-all duration-200 hover:bg-gray-750"
          >
            <div className="text-center mb-4">
              <span className="text-4xl">{template.icon}</span>
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">{template.name}</h4>
            <p className="text-gray-400 text-sm mb-3">{template.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Category:</span>
              <span className="text-blue-400">{template.category.replace('_', ' ')}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Severity:</span>
              <span className={`px-2 py-1 rounded text-xs ${
                template.severity === 'EMERGENCY' ? 'bg-red-900 text-red-300' :
                template.severity === 'CRITICAL' ? 'bg-orange-900 text-orange-300' :
                template.severity === 'WARNING' ? 'bg-yellow-900 text-yellow-300' :
                'bg-blue-900 text-blue-300'
              }`}>
                {template.severity}
              </span>
            </div>
          </div>
        ))}
        
        <div 
          onClick={() => handleCustomRule()}
          className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-green-500 cursor-pointer transition-all duration-200 hover:bg-gray-750"
        >
          <div className="text-center mb-4">
            <span className="text-4xl">⚙️</span>
          </div>
          <h4 className="text-lg font-semibold text-white mb-2">Custom Rule</h4>
          <p className="text-gray-400 text-sm mb-3">Create a completely custom rule from scratch</p>
          <div className="text-center">
            <span className="text-green-400 text-sm">Advanced users</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Configure Rule</h3>
        <button
          onClick={() => setCurrentStep(1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Templates
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rule Name</label>
            <input
              type="text"
              value={ruleData.name}
              onChange={(e) => setRuleData((prev: any) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter rule name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={ruleData.description}
              onChange={(e) => setRuleData((prev: any) => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter rule description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={ruleData.category}
                onChange={(e) => setRuleData((prev: any) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PPE_COMPLIANCE">PPE Compliance</option>
                <option value="EQUIPMENT_SAFETY">Equipment Safety</option>
                <option value="SITE_HAZARDS">Site Hazards</option>
                <option value="BEHAVIORAL_WORKFLOW">Behavioral & Workflow</option>
                <option value="ENVIRONMENTAL_EMERGENCY">Environmental & Emergency</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
              <select
                value={ruleData.severity}
                onChange={(e) => setRuleData((prev: any) => ({ ...prev, severity: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Targeting Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Type</label>
            <select
              value={ruleData.targetType}
              onChange={(e) => setRuleData((prev: any) => ({ ...prev, targetType: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SITE_WIDE">Site Wide</option>
              <option value="ZONE_SPECIFIC">Zone Specific</option>
              <option value="CAMERA_SPECIFIC">Camera Specific</option>
              <option value="ROLE_SPECIFIC">Role Specific</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Zones</label>
            <input
              type="text"
              value={ruleData.targetZones.join(', ')}
              onChange={(e) => setRuleData((prev: any) => ({ 
                ...prev, 
                targetZones: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
              }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Zone IDs (comma separated)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Cameras</label>
            <input
              type="text"
              value={ruleData.targetCameras.join(', ')}
              onChange={(e) => setRuleData((prev: any) => ({ 
                ...prev, 
                targetCameras: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
              }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Camera IDs (comma separated)"
            />
          </div>
        </div>
      </div>
      
      {/* Actions Preview */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-3">Rule Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ruleData.actions.map((action: RuleAction, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-medium">{action.type.replace('_', ' ')}</span>
                <span className="text-gray-400 text-sm">{action.description}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Save/Cancel Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Create Rule
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-white">Create Custom Rule</h3>
        <button
          onClick={() => setCurrentStep(1)}
          className="text-gray-400 hover:text-white transition-colors"
        >
          ← Back to Templates
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Rule Name *</label>
            <input
              type="text"
              value={ruleData.name}
              onChange={(e) => setRuleData((prev: any) => ({ ...prev, name: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter rule name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
            <textarea
              value={ruleData.description}
              onChange={(e) => setRuleData((prev: any) => ({ ...prev, description: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter rule description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
              <select
                value={ruleData.category}
                onChange={(e) => setRuleData((prev: any) => ({ ...prev, category: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PPE_COMPLIANCE">PPE Compliance</option>
                <option value="EQUIPMENT_SAFETY">Equipment Safety</option>
                <option value="SITE_HAZARDS">Site Hazards</option>
                <option value="BEHAVIORAL_WORKFLOW">Behavioral & Workflow</option>
                <option value="ENVIRONMENTAL_EMERGENCY">Environmental & Emergency</option>
                <option value="CUSTOM">Custom</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
              <select
                value={ruleData.severity}
                onChange={(e) => setRuleData((prev: any) => ({ ...prev, severity: e.target.value }))}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="INFO">Info</option>
                <option value="WARNING">Warning</option>
                <option value="CRITICAL">Critical</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Targeting Settings */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Type</label>
            <select
              value={ruleData.targetType}
              onChange={(e) => setRuleData((prev: any) => ({ ...prev, targetType: e.target.value }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="SITE_WIDE">Site Wide</option>
              <option value="ZONE_SPECIFIC">Zone Specific</option>
              <option value="CAMERA_SPECIFIC">Camera Specific</option>
              <option value="ROLE_SPECIFIC">Role Specific</option>
              <option value="HYBRID">Hybrid</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Zones</label>
            <input
              type="text"
              value={ruleData.targetZones.join(', ')}
              onChange={(e) => setRuleData((prev: any) => ({ 
                ...prev, 
                targetZones: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
              }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Zone IDs (comma separated)"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Target Cameras</label>
            <input
              type="text"
              value={ruleData.targetCameras.join(', ')}
              onChange={(e) => setRuleData((prev: any) => ({ 
                ...prev, 
                targetCameras: e.target.value.split(',').map(s => s.trim()).filter(s => s) 
              }))}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Camera IDs (comma separated)"
            />
          </div>
        </div>
      </div>
      
      {/* Custom Conditions Builder */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-3">Custom Conditions</h4>
        <div className="space-y-3">
          {ruleData.conditions.map((condition: RuleCondition, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-3 flex items-center space-x-3">
              <select
                value={condition.type}
                onChange={(e) => {
                  const newConditions = [...ruleData.conditions];
                  newConditions[index] = { ...condition, type: e.target.value };
                  setRuleData((prev: any) => ({ ...prev, conditions: newConditions }));
                }}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
              >
                <option value="speed_threshold">Speed Threshold</option>
                <option value="zone_access">Zone Access</option>
                <option value="ppe_detection">PPE Detection</option>
                <option value="object_detection">Object Detection</option>
                <option value="behavior_detection">Behavior Detection</option>
              </select>
              <input
                type="text"
                value={condition.value || ''}
                onChange={(e) => {
                  const newConditions = [...ruleData.conditions];
                  newConditions[index] = { ...condition, value: e.target.value };
                  setRuleData((prev: any) => ({ ...prev, conditions: newConditions }));
                }}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm flex-1"
                placeholder="Value"
              />
              <button
                onClick={() => {
                  const newConditions = ruleData.conditions.filter((_: any, i: number) => i !== index);
                  setRuleData((prev: any) => ({ ...prev, conditions: newConditions }));
                }}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newCondition: RuleCondition = {
                type: 'speed_threshold',
                operator: 'greater_than',
                value: '',
                description: 'New condition'
              };
              setRuleData((prev: any) => ({ 
                ...prev, 
                conditions: [...prev.conditions, newCondition] 
              }));
            }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Add Condition
          </button>
        </div>
      </div>
      
      {/* Custom Actions Builder */}
      <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
        <h4 className="text-lg font-semibold text-white mb-3">Custom Actions</h4>
        <div className="space-y-3">
          {ruleData.actions.map((action: RuleAction, index: number) => (
            <div key={index} className="bg-gray-700 rounded-lg p-3 flex items-center space-x-3">
              <select
                value={action.type}
                onChange={(e) => {
                  const newActions = [...ruleData.actions];
                  newActions[index] = { ...action, type: e.target.value };
                  setRuleData((prev: any) => ({ ...prev, actions: newActions }));
                }}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm"
              >
                <option value="AUDIO_ALERT">Audio Alert</option>
                <option value="PUSH_NOTIFICATION">Push Notification</option>
                <option value="DASHBOARD_FLAG">Dashboard Flag</option>
                <option value="EMAIL_NOTIFICATION">Email Notification</option>
                <option value="SMS_ALERT">SMS Alert</option>
                <option value="RECORD_VIDEO">Record Video</option>
                <option value="ESCALATE_ALERT">Escalate Alert</option>
              </select>
              <input
                type="text"
                value={action.description || ''}
                onChange={(e) => {
                  const newActions = [...ruleData.actions];
                  newActions[index] = { ...action, description: e.target.value };
                  setRuleData((prev: any) => ({ ...prev, actions: newActions }));
                }}
                className="bg-gray-600 border border-gray-500 rounded px-2 py-1 text-white text-sm flex-1"
                placeholder="Description"
              />
              <button
                onClick={() => {
                  const newActions = ruleData.actions.filter((_: any, i: number) => i !== index);
                  setRuleData((prev: any) => ({ ...prev, actions: newActions }));
                }}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newAction: RuleAction = {
                type: 'AUDIO_ALERT',
                config: {},
                description: 'New action'
              };
              setRuleData((prev: any) => ({ 
                ...prev, 
                actions: [...prev.actions, newAction] 
              }));
            }}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            + Add Action
          </button>
        </div>
      </div>
      
      {/* Save/Cancel Buttons */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Create Custom Rule
        </button>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-2xl p-6 max-w-6xl w-full mx-4">
      {currentStep === 1 ? renderStep1() : currentStep === 2 ? renderStep2() : renderStep3()}
    </div>
  );
};

export default RuleBuilder;

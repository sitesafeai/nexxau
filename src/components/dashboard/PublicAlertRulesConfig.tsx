'use client';

import { useState } from 'react';
import { PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';

type AlertType = 'proximity' | 'speed' | 'area_entry' | 'area_exit' | 'idle_time' | 'unauthorized_access' | 'equipment_usage' | 'safety_zone' | 'crowd_density' | 'ppe_detection' | 'ai';

type ParameterConfig = {
  label: string;
  type?: 'number';
  options?: string[];
};

type AlertTypeConfig = {
  label: string;
  description: string;
  parameters: Record<string, ParameterConfig>;
};

const ALERT_TYPES: Record<AlertType, { label: string; parameters: Record<string, { label: string; type: 'string' | 'number' }> }> = {
  proximity: {
    label: 'Proximity Alert',
    parameters: {
      object1: { label: 'Object 1', type: 'string' },
      object2: { label: 'Object 2', type: 'string' },
      operator: { label: 'Operator', type: 'string' },
      threshold: { label: 'Threshold', type: 'number' },
      unit: { label: 'Unit', type: 'string' }
    }
  },
  speed: {
    label: 'Speed Alert',
    parameters: {
      object1: { label: 'Object', type: 'string' },
      operator: { label: 'Operator', type: 'string' },
      threshold: { label: 'Threshold', type: 'number' },
      unit: { label: 'Unit', type: 'string' }
    }
  },
  area_entry: {
    label: 'Area Entry Alert',
    parameters: {
      object1: { label: 'Object', type: 'string' },
      area: { label: 'Area', type: 'string' }
    }
  },
  area_exit: {
    label: 'Area Exit Alert',
    description: 'Alert when objects leave designated areas',
    parameters: {
      object1: {
        label: 'Object',
        options: ['person', 'forklift', 'vehicle']
      },
      area: {
        label: 'Designated Area',
        options: ['work_zone', 'safety_zone', 'restricted_area']
      }
    }
  },
  idle_time: {
    label: 'Idle Time Alert',
    description: 'Alert when equipment is idle for too long',
    parameters: {
      equipment: {
        label: 'Equipment',
        options: ['forklift', 'vehicle', 'machine']
      },
      duration: {
        label: 'Duration',
        type: 'number'
      },
      unit: {
        label: 'Unit',
        options: ['minutes', 'hours']
      }
    }
  },
  unauthorized_access: {
    label: 'Unauthorized Access Alert',
    description: 'Alert when unauthorized access is detected',
    parameters: {
      area: {
        label: 'Restricted Area',
        options: ['server_room', 'electrical_room', 'chemical_storage', 'maintenance_zone']
      }
    }
  },
  equipment_usage: {
    label: 'Equipment Usage Alert',
    description: 'Alert for improper equipment usage',
    parameters: {
      equipment: { label: 'Equipment', type: 'string' },
      operator: { label: 'Operator', type: 'string' }
    }
  },
  safety_zone: {
    label: 'Safety Zone Alert',
    description: 'Alert when safety zones are violated',
    parameters: {
      object1: {
        label: 'Object',
        options: ['person', 'forklift', 'vehicle']
      },
      area: {
        label: 'Safety Zone',
        options: ['emergency_exit', 'fire_equipment', 'first_aid_station']
      }
    }
  },
  crowd_density: {
    label: 'Crowd Density Alert',
    description: 'Alert when too many people are in an area',
    parameters: {
      area: {
        label: 'Area',
        options: ['entrance', 'exit', 'common_area', 'work_zone']
      },
      max_count: {
        label: 'Maximum Count',
        type: 'number'
      }
    }
  },
  ppe_detection: {
    label: 'PPE Detection Alert',
    description: 'Alert when required PPE is not worn',
    parameters: {
      ppe_type: {
        label: 'PPE Type',
        options: ['hard_hat', 'safety_vest', 'safety_glasses', 'gloves', 'boots']
      },
      area: {
        label: 'Area',
        options: ['construction_zone', 'warehouse', 'loading_dock', 'maintenance_area']
      }
    }
  },
  ai: {
    label: 'AI Alert',
    description: 'AI-powered alert based on a prompt',
    parameters: {
      prompt: { label: 'AI Prompt', type: 'string' }
    }
  }
};

interface AlertRule {
  id: string;
  name: string;
  description: string;
  condition: {
    type: AlertType;
    parameters: {
      object1?: string;
      object2?: string;
      operator?: string;
      threshold?: number;
      unit?: string;
      area?: string;
      equipment?: string;
      prompt?: string;
      duration?: number;
      ppe_type?: string;
      max_count?: number;
    };
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

// Mock data for demonstration
const mockRules: AlertRule[] = [
  {
    id: '1',
    name: 'Forklift Speed Limit',
    description: 'Alert when forklifts exceed 10 mph in warehouse zones',
    condition: {
      type: 'speed',
      parameters: {
        object1: 'forklift',
        operator: '>',
        threshold: 10,
        unit: 'mph'
      }
    },
    severity: 'HIGH',
    isActive: true
  },
  {
    id: '2',
    name: 'Pedestrian Safety Zone',
    description: 'Alert when forklifts get within 5 feet of pedestrians in high-traffic areas',
    condition: {
      type: 'proximity',
      parameters: {
        object1: 'forklift',
        object2: 'person',
        operator: '<',
        threshold: 5,
        unit: 'ft'
      }
    },
    severity: 'CRITICAL',
    isActive: true
  }
];

// Mock AI rules
const mockAIRules: AlertRule[] = [
  {
    id: 'ai-1',
    name: 'Smart Zone Monitoring',
    description: 'AI-powered detection of unusual movement patterns in restricted areas',
    condition: {
      type: 'area_entry',
      parameters: {
        object1: 'person',
        area: 'restricted_area'
      }
    },
    severity: 'HIGH',
    isActive: true
  },
  {
    id: 'ai-2',
    name: 'Behavioral Analysis',
    description: 'AI detection of unsafe equipment operation patterns',
    condition: {
      type: 'equipment_usage',
      parameters: {
        equipment: 'forklift',
        operator: 'unauthorized'
      }
    },
    severity: 'CRITICAL',
    isActive: true
  }
];

export default function PublicAlertRulesConfig() {
  const [activeTab, setActiveTab] = useState<'regular' | 'ai'>('regular');
  const [rules, setRules] = useState<AlertRule[]>(mockRules);
  const [aiRules, setAIRules] = useState<AlertRule[]>(mockAIRules);
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<AlertRule>({
    id: '',
    name: '',
    description: '',
    condition: {
      type: 'proximity',
      parameters: {
        object1: 'forklift',
        object2: 'person',
        operator: '>',
        threshold: 10,
        unit: 'ft'
      }
    },
    severity: 'MEDIUM',
    isActive: true
  });

  const handleCreateRule = () => {
    const newId = activeTab === 'regular' 
      ? (rules.length + 1).toString()
      : `ai-${aiRules.length + 1}`;
    
    const ruleToAdd: AlertRule = activeTab === 'regular' ? {
      ...newRule,
      id: newId
    } : {
      id: newId,
      name: newRule.name,
      description: newRule.description,
      condition: {
        type: 'ai' as AlertType,
        parameters: {
          prompt: newRule.description
        }
      },
      severity: 'HIGH',
      isActive: true
    };

    if (activeTab === 'regular') {
      setRules([...rules, ruleToAdd]);
    } else {
      setAIRules([...aiRules, ruleToAdd]);
    }

    setIsCreating(false);
    setNewRule({
      id: '',
      name: '',
      description: '',
      condition: {
        type: 'proximity',
        parameters: {
          object1: 'forklift',
          object2: 'person',
          operator: '>',
          threshold: 10,
          unit: 'ft'
        }
      },
      severity: 'MEDIUM',
      isActive: true
    });
  };

  const handleDeleteRule = (id: string) => {
    if (activeTab === 'regular') {
      setRules(rules.filter(rule => rule.id !== id));
    } else {
      setAIRules(aiRules.filter(rule => rule.id !== id));
    }
  };

  const handleToggleRule = (id: string, isActive: boolean) => {
    if (activeTab === 'regular') {
      setRules(rules.map(rule => 
        rule.id === id ? { ...rule, isActive } : rule
      ));
    } else {
      setAIRules(aiRules.map(rule => 
        rule.id === id ? { ...rule, isActive } : rule
      ));
    }
  };

  const formatCondition = (rule: AlertRule): string => {
    const { type, parameters } = rule.condition;
    const config = ALERT_TYPES[type];
    
    switch (type) {
      case 'proximity':
        return `${parameters.object1} ${parameters.operator} ${parameters.threshold} ${parameters.unit} from ${parameters.object2}`;
      case 'speed':
        return `${parameters.object1} speed ${parameters.operator} ${parameters.threshold} ${parameters.unit}`;
      case 'area_entry':
        return `${parameters.object1} enters ${parameters.area}`;
      case 'area_exit':
        return `${parameters.object1} exits ${parameters.area}`;
      case 'idle_time':
        return `${parameters.equipment} idle for ${parameters.duration} ${parameters.unit}`;
      case 'unauthorized_access':
        return `Unauthorized access to ${parameters.area}`;
      case 'equipment_usage':
        return `${parameters.operator} use of ${parameters.equipment}`;
      case 'safety_zone':
        return `${parameters.object1} in ${parameters.area}`;
      case 'crowd_density':
        return `More than ${parameters.max_count} people in ${parameters.area}`;
      case 'ppe_detection':
        return `Missing ${parameters.ppe_type} in ${parameters.area}`;
      case 'ai':
        return parameters.prompt || 'No prompt provided';
      default:
        return 'Unknown condition';
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Alert Rules</h1>
          <p className="mt-2 text-sm text-gray-700">
            Configure rules to automatically generate alerts based on specific conditions.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" aria-hidden="true" />
            Add Rule
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mt-8 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('regular')}
            className={`${
              activeTab === 'regular'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium`}
          >
            Regular Rules
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`${
              activeTab === 'ai'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            } whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium flex items-center`}
          >
            <SparklesIcon className="h-5 w-5 mr-2" />
            AI Rules
          </button>
        </nav>
      </div>

      {isCreating && (
        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-6 py-8 sm:p-8">
            <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-6">
              Create New {activeTab === 'ai' ? 'AI' : ''} Alert Rule
            </h3>
            <div className="mt-4 space-y-6">
              {activeTab === 'ai' ? (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
                      placeholder="e.g., Smart Zone Monitoring"
                    />
                  </div>
                  <div>
                    <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                      AI Rule Description
                    </label>
                    <textarea
                      id="ai-prompt"
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
                      rows={4}
                      placeholder="Describe the AI-powered alert in natural language. For example: 'Alert me when there are unusual movement patterns in restricted areas' or 'Notify me if someone is operating equipment without proper safety gear'"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      Rule Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      value={newRule.name}
                      onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
                      placeholder="e.g., Speed Limit Alert"
                    />
                  </div>
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={newRule.description}
                      onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
                      rows={3}
                      placeholder="Describe the alert condition and its purpose..."
                    />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
                      Alert Type
                    </label>
                    <select
                      id="type"
                      value={newRule.condition.type}
                      onChange={(e) => setNewRule({
                        ...newRule,
                        condition: {
                          ...newRule.condition,
                          type: e.target.value as AlertType,
                          parameters: ALERT_TYPES[e.target.value as AlertType].parameters
                        }
                      })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
                    >
                      {Object.entries(ALERT_TYPES).map(([type, config]) => (
                        <option key={type} value={type}>
                          {config.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-2">
                      Severity
                    </label>
                    <select
                      id="severity"
                      value={newRule.severity}
                      onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as AlertRule['severity'] })}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-4 py-3"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL">Critical</option>
                    </select>
                  </div>
                </>
              )}
            </div>
            <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="mt-3 inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:w-auto"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateRule}
                className="inline-flex w-full justify-center rounded-lg border border-transparent bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto"
              >
                Create Rule
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col">
        <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="py-4 pl-6 pr-3 text-left text-sm font-semibold text-gray-900">
                      Name
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Condition
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Severity
                    </th>
                    <th scope="col" className="px-4 py-4 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="relative py-4 pl-3 pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {(activeTab === 'regular' ? rules : aiRules).map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap py-5 pl-6 pr-3 text-sm">
                        <div className="font-medium text-gray-900">{rule.name}</div>
                        <div className="text-gray-500 mt-1">{rule.description}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        {formatCondition(rule)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium
                          ${rule.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                            rule.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                            rule.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'}`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-5 text-sm text-gray-500">
                        <button
                          onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${
                            rule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="relative whitespace-nowrap py-5 pl-3 pr-6 text-right text-sm font-medium">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-900 p-2 rounded-full hover:bg-red-50"
                        >
                          <TrashIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
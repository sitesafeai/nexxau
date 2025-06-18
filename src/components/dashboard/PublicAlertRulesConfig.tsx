'use client';

import { useState } from 'react';
import { PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import type { AlertRule } from '@/src/types/alert';

type AlertType = 'proximity' | 'speed' | 'area_entry' | 'area_exit' | 'idle_time' | 'unauthorized_access' | 'equipment_usage' | 'safety_zone' | 'crowd_density' | 'ppe_detection';

type ParameterConfig = {
  label: string;
  type?: 'string' | 'number';
  options?: string[];
};

type AlertTypeConfig = {
  label: string;
  description: string;
  parameters: Record<string, ParameterConfig>;
};

const ALERT_TYPES = {
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
  }
};

export default function PublicAlertRulesConfig() {
  const [activeTab, setActiveTab] = useState<'regular'>('regular');
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newRule, setNewRule] = useState<AlertRule>({
    id: '',
    name: '',
    description: '',
    type: 'proximity',
    condition: {
      object1: 'forklift',
      object2: 'person',
      operator: '>',
      threshold: 10,
      unit: 'ft'
    },
    severity: 'MEDIUM',
    enabled: true
  });

  const handleCreateRule = () => {
    const ruleToAdd: AlertRule = {
      ...newRule,
      id: (rules.length + 1).toString()
    };

    setRules([...rules, ruleToAdd]);
    setIsCreating(false);
    setNewRule({
      id: '',
      name: '',
      description: '',
      type: 'proximity',
      condition: {
        object1: 'forklift',
        object2: 'person',
        operator: '>',
        threshold: 10,
        unit: 'ft'
      },
      severity: 'MEDIUM',
      enabled: true
    });
  };

  const handleDeleteRule = (id: string) => {
    setRules(rules.filter(rule => rule.id !== id));
  };

  const handleToggleRule = (id: string, enabled: boolean) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, enabled } : rule
    ));
  };

  const formatCondition = (rule: AlertRule): string => {
    const { type, condition } = rule;
    const config = ALERT_TYPES[type];
    
    switch (type) {
      case 'proximity':
        return `${condition.object1} ${condition.operator} ${condition.threshold} ${condition.unit} from ${condition.object2}`;
      case 'speed':
        return `${condition.object1} speed ${condition.operator} ${condition.threshold} ${condition.unit}`;
      case 'area_entry':
        return `${condition.object1} enters ${condition.area}`;
      case 'area_exit':
        return `${condition.object1} exits ${condition.area}`;
      case 'idle_time':
        return `${condition.equipment} idle for ${condition.duration} ${condition.unit}`;
      case 'unauthorized_access':
        return `Unauthorized access to ${condition.area}`;
      case 'equipment_usage':
        return `${condition.operator} use of ${condition.equipment}`;
      case 'safety_zone':
        return `${condition.object1} in ${condition.area}`;
      case 'crowd_density':
        return `More than ${condition.max_count} people in ${condition.area}`;
      case 'ppe_detection':
        return `Missing ${condition.ppe_type} in ${condition.area}`;
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
        </nav>
      </div>

      {isCreating && (
        <div className="mt-8 bg-white shadow sm:rounded-lg">
          <div className="px-6 py-8 sm:p-8">
            <h3 className="text-xl font-semibold leading-6 text-gray-900 mb-6">
              Create New Alert Rule
            </h3>
            <div className="mt-4 space-y-6">
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
                  value={newRule.type}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    type: e.target.value as AlertType,
                    condition: ALERT_TYPES[e.target.value as AlertType].parameters
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
                  {rules.map((rule) => (
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
                          onClick={() => handleToggleRule(rule.id, !rule.enabled)}
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold leading-5 ${
                            rule.enabled
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.enabled ? 'Active' : 'Inactive'}
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
'use client';

import { useState, useEffect } from 'react';
import { PlusIcon, TrashIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import Toast, { ToastType } from '../ui/Toast';
import AIRuleCreator from './AIRuleCreator';
import WorkflowBuilder from './WorkflowBuilder';
import SavedWorkflows from './SavedWorkflows';

type AlertType = 
  | 'proximity' 
  | 'speed' 
  | 'area_entry' 
  | 'area_exit' 
  | 'idle_time' 
  | 'unauthorized_access' 
  | 'equipment_usage' 
  | 'safety_zone' 
  | 'crowd_density' 
  | 'ppe_detection';

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

const ALERT_TYPES: Record<AlertType, AlertTypeConfig> = {
  proximity: {
    label: 'Proximity Alert',
    description: 'Alert when objects get too close to each other',
    parameters: {
      object1: {
        label: 'First Object',
        options: ['forklift', 'person', 'vehicle', 'equipment']
      },
      object2: {
        label: 'Second Object',
        options: ['person', 'forklift', 'vehicle', 'equipment', 'wall']
      },
      operator: {
        label: 'Operator',
        options: ['>', '<', '=']
      },
      threshold: {
        label: 'Distance',
        type: 'number'
      },
      unit: {
        label: 'Unit',
        options: ['ft', 'm']
      }
    }
  },
  speed: {
    label: 'Speed Alert',
    description: 'Alert when objects exceed speed limits',
    parameters: {
      object1: {
        label: 'Object',
        options: ['forklift', 'vehicle', 'person']
      },
      operator: {
        label: 'Operator',
        options: ['>', '<', '=']
      },
      threshold: {
        label: 'Speed',
        type: 'number'
      },
      unit: {
        label: 'Unit',
        options: ['mph', 'km/h']
      }
    }
  },
  area_entry: {
    label: 'Area Entry Alert',
    description: 'Alert when objects enter restricted areas',
    parameters: {
      object1: {
        label: 'Object',
        options: ['person', 'forklift', 'vehicle']
      },
      area: {
        label: 'Restricted Area',
        options: ['warehouse', 'loading_dock', 'storage_area', 'maintenance_zone']
      }
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
      equipment: {
        label: 'Equipment',
        options: ['forklift', 'crane', 'ladder', 'scaffold']
      },
      operator: {
        label: 'Operator',
        options: ['unauthorized', 'unqualified']
      }
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
      duration?: number;
      equipment?: string;
      ppe_type?: string;
      max_count?: number;
      [key: string]: string | number | undefined;
    };
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
}

interface AlertRulesConfigProps {
  onRuleCreated?: (rule: AlertRule) => void;
}

export default function AlertRulesConfig({ onRuleCreated }: AlertRulesConfigProps) {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
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
  const [showWorkflowBuilder, setShowWorkflowBuilder] = useState(false);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/alert-rules');
      if (!response.ok) {
        throw new Error('Failed to fetch rules');
      }
      const data = await response.json();
      setRules(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch rules');
      setRules([]);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    const alertType = ALERT_TYPES[newRule.condition.type];

    if (!newRule.name.trim()) {
      errors.name = 'Rule name is required';
    }

    if (!newRule.description.trim()) {
      errors.description = 'Description is required';
    }

    if (!newRule.condition.type) {
      errors.type = 'Alert type is required';
    }

    if (!newRule.severity) {
      errors.severity = 'Severity is required';
    }

    // Validate parameters based on alert type
    if (alertType) {
      Object.entries(alertType.parameters).forEach(([key, config]) => {
        const value = newRule.condition.parameters[key];
        if (!value && value !== 0) {
          errors[key] = `${config.label} is required`;
        }
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateRule = async () => {
    if (!validateForm()) {
      setToast({ message: 'Please fill in all required fields', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/alert-rules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRule),
      });

      if (!response.ok) {
        throw new Error('Failed to create alert rule');
      }

      const data = await response.json();
      setRules([...rules, data]);
      setToast({ message: 'Alert rule created successfully', type: 'success' });
      
      // Reset form and close it
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
      setFormErrors({});
      setIsCreating(false);

      if (onRuleCreated) {
        onRuleCreated(data);
      }
    } catch (error) {
      setToast({ message: 'Failed to create alert rule', type: 'error' });
    }
  };

  const handleToggleRule = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/alert-rules/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update alert rule');
      }

      setRules(rules.map(rule => 
        rule.id === id ? { ...rule, isActive } : rule
      ));
      
      if (isActive) {
        setToast({ 
          message: 'Alert rule activated. System will now monitor for this condition.', 
          type: 'info' 
        });
      } else {
        setToast({ 
          message: 'Alert rule deactivated. System will no longer monitor for this condition.', 
          type: 'warning' 
        });
      }
    } catch (error) {
      setToast({ message: 'Failed to update alert rule', type: 'error' });
    }
  };

  const handleDeleteRule = async (id: string) => {
    try {
      const response = await fetch(`/api/alert-rules/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete alert rule');
      }

      setRules(rules.filter(rule => rule.id !== id));
      setToast({ message: 'Alert rule deleted successfully', type: 'success' });
    } catch (error) {
      setToast({ message: 'Failed to delete alert rule', type: 'error' });
    }
  };

  const handleValidationError = (message: string) => {
    setToast({ message, type: 'warning' });
  };

  const formatCondition = (rule: AlertRule): string => {
    const { type, parameters } = rule.condition;
    const alertType = ALERT_TYPES[type];

    switch (type) {
      case 'proximity':
        return `IF ${parameters.object1} ${parameters.operator} ${parameters.threshold}${parameters.unit} TO ${parameters.object2}`;
      case 'speed':
        return `IF ${parameters.object1} SPEED ${parameters.operator} ${parameters.threshold}${parameters.unit}`;
      case 'area_entry':
        return `IF ${parameters.object1} ENTERS ${parameters.area}`;
      case 'area_exit':
        return `IF ${parameters.object1} LEAVES ${parameters.area}`;
      case 'idle_time':
        return `IF ${parameters.equipment} IDLE > ${parameters.duration} ${parameters.unit}`;
      case 'unauthorized_access':
        return `IF UNAUTHORIZED ACCESS TO ${parameters.area}`;
      case 'equipment_usage':
        return `IF ${parameters.equipment} USED BY ${parameters.operator}`;
      case 'safety_zone':
        return `IF ${parameters.object1} VIOLATES ${parameters.area}`;
      case 'crowd_density':
        return `IF CROWD IN ${parameters.area} > ${parameters.max_count} PEOPLE`;
      case 'ppe_detection':
        return `IF ${parameters.ppe_type} NOT WORN IN ${parameters.area}`;
      default:
        return 'Unknown condition';
    }
  };

  const handleConditionTypeChange = (type: AlertType) => {
    setNewRule(prev => ({
      ...prev,
      condition: {
        type,
        parameters: {}
      }
    }));
  };

  const handleParameterChange = (key: string, value: string | number) => {
    setNewRule(prev => ({
      ...prev,
      condition: {
        ...prev.condition,
        parameters: {
          ...prev.condition.parameters,
          [key]: value
        }
      }
    }));
  };

  const renderParameterInputs = () => {
    const alertType = ALERT_TYPES[newRule.condition.type];
    if (!alertType) return null;

    return Object.entries(alertType.parameters).map(([key, config]) => {
      if (config.type === 'number') {
        return (
          <div key={key}>
            <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
              {config.label}*
            </label>
            <input
              type="number"
              name={key}
              id={key}
              value={newRule.condition.parameters[key] || ''}
              onChange={(e) => handleParameterChange(key, Number(e.target.value))}
              className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                formErrors[key] ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder={`Enter ${config.label.toLowerCase()}`}
              required
            />
            {formErrors[key] && (
              <p className="mt-1 text-sm text-red-600">{formErrors[key]}</p>
            )}
          </div>
        );
      }

      return (
        <div key={key}>
          <label htmlFor={key} className="block text-sm font-medium text-gray-700 mb-1">
            {config.label}*
          </label>
          <select
            id={key}
            name={key}
            value={newRule.condition.parameters[key] || ''}
            onChange={(e) => handleParameterChange(key, e.target.value)}
            className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
              formErrors[key] ? 'border-red-300' : 'border-gray-300'
            }`}
            required
          >
            <option value="">Select {config.label}</option>
            {config.options?.map((option: string) => (
              <option key={option} value={option}>
                {option.split('_').map((word: string) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </option>
            ))}
          </select>
          {formErrors[key] && (
            <p className="mt-1 text-sm text-red-600">{formErrors[key]}</p>
          )}
        </div>
      );
    });
  };

  const handleWorkflowCreated = (workflow: any) => {
    // Convert workflow to alert rules
    const rules = workflow.rules.map((rule: any) => ({
      name: rule.config.name || 'Workflow Rule',
      description: rule.config.description || 'Created from workflow',
      type: rule.type,
      severity: rule.config.severity || 'MEDIUM',
      condition: rule.config,
    }));
    
    setRules([...rules, ...rules]);
    setShowWorkflowBuilder(false);
    setToast({ message: 'Workflow rules created successfully', type: 'success' });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50">
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast(null)}
          />
        </div>
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Alert Rules</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => setShowWorkflowBuilder(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create Workflow
          </button>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
            Create New Rule
          </button>
        </div>
      </div>

      <AIRuleCreator onRuleCreated={onRuleCreated} />

      <SavedWorkflows />

      {showWorkflowBuilder && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Workflow Builder</h3>
                <button
                  onClick={() => setShowWorkflowBuilder(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <WorkflowBuilder onWorkflowCreated={handleWorkflowCreated} />
            </div>
          </div>
        </div>
      )}

      {isCreating && (
        <div className="bg-white shadow-lg rounded-lg border border-gray-200">
          <div className="px-6 py-5">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Create New Alert Rule</h3>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Rule Name*
                  </label>
                  <input
                    type="text"
                    name="name"
                    id="name"
                    value={newRule.name}
                    onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
                    className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      formErrors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Enter a descriptive name"
                    required
                  />
                  {formErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description*
                  </label>
                  <input
                    type="text"
                    name="description"
                    id="description"
                    value={newRule.description}
                    onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
                    className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      formErrors.description ? 'border-red-300' : 'border-gray-300'
                    }`}
                    placeholder="Describe the purpose of this rule"
                    required
                  />
                  {formErrors.description && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.description}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                    Alert Type*
                  </label>
                  <select
                    id="type"
                    name="type"
                    value={newRule.condition.type}
                    onChange={(e) => handleConditionTypeChange(e.target.value as AlertType)}
                    className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      formErrors.type ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Alert Type</option>
                    {Object.entries(ALERT_TYPES).map(([key, config]) => (
                      <option key={key} value={key}>
                        {config.label}
                      </option>
                    ))}
                  </select>
                  {formErrors.type && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.type}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                    Severity*
                  </label>
                  <select
                    id="severity"
                    name="severity"
                    value={newRule.severity}
                    onChange={(e) => setNewRule({ ...newRule, severity: e.target.value as AlertRule['severity'] })}
                    className={`block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                      formErrors.severity ? 'border-red-300' : 'border-gray-300'
                    }`}
                    required
                  >
                    <option value="">Select Severity</option>
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                  {formErrors.severity && (
                    <p className="mt-1 text-sm text-red-600">{formErrors.severity}</p>
                  )}
                </div>

                {renderParameterInputs()}
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setFormErrors({});
                  }}
                  className="px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateRule}
                  className="px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Create Rule
                </button>
              </div>
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
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                      Name
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Description
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Condition
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Severity
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                      Status
                    </th>
                    <th scope="col" className="px-3 py-3.5 text-center text-sm font-semibold text-gray-900">
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                        {rule.name}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {rule.description}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatCondition(rule)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                          rule.severity === 'LOW' ? 'bg-green-100 text-green-800' :
                          rule.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          rule.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {rule.severity}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <button
                          onClick={() => handleToggleRule(rule.id, !rule.isActive)}
                          className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                            rule.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {rule.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-center">
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-900 inline-flex items-center justify-center"
                        >
                          <TrashIcon className="h-5 w-5" />
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
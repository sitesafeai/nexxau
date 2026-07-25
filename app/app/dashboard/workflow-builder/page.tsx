"use client";

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type TriggerType = 
  | 'ppe_violation'
  | 'specific_violation'
  | 'camera_offline'
  | 'camera_online'
  | 'high_alert_volume'
  | 'new_site_added'
  | 'supervisor_added';

type ActionType = 
  | 'notify_supervisor'
  | 'send_email'
  | 'send_sms'
  | 'create_incident'
  | 'mute_similar'
  | 'batch_alerts'
  | 'auto_tag'
  | 'auto_assign'
  | 'generate_report';

interface WorkflowData {
  name: string;
  trigger: {
    type: TriggerType | '';
    config: any;
  };
  conditions: Array<{
    type: string;
    config: any;
  }>;
  actions: Array<{
    type: ActionType | '';
    config: any;
  }>;
}

const TRIGGERS = [
  { value: 'ppe_violation', label: 'PPE Violation Detected', hasParams: true },
  { value: 'specific_violation', label: 'Specific Violation Type', hasParams: true },
  { value: 'camera_offline', label: 'Camera Offline', hasParams: true },
  { value: 'camera_online', label: 'Camera Back Online', hasParams: false },
  { value: 'high_alert_volume', label: 'High Alert Volume', hasParams: true },
  { value: 'new_site_added', label: 'New Site Added', hasParams: false },
  { value: 'supervisor_added', label: 'Supervisor Added', hasParams: false },
];

const ACTIONS = [
  { value: 'notify_supervisor', label: 'Send Notification to Supervisor(s)', hasConfig: true },
  { value: 'send_email', label: 'Send Email', hasConfig: true },
  { value: 'send_sms', label: 'Send SMS', hasConfig: true },
  { value: 'create_incident', label: 'Create Incident Ticket', hasConfig: false },
  { value: 'mute_similar', label: 'Mute Similar Alerts', hasConfig: true },
  { value: 'batch_alerts', label: 'Batch Alerts (Storm Mode)', hasConfig: true },
  { value: 'auto_tag', label: 'Auto-Tag Event', hasConfig: true },
  { value: 'auto_assign', label: 'Auto-Assign to Supervisor', hasConfig: true },
  { value: 'generate_report', label: 'Auto-Generate Report', hasConfig: false },
];

function WorkflowBuilderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const worksiteId = searchParams.get('worksite');

  const [step, setStep] = useState(1);
  const [workflow, setWorkflow] = useState<WorkflowData>({
    name: '',
    trigger: { type: '', config: {} },
    conditions: [],
    actions: []
  });

  useEffect(() => {
    console.log('[Workflow Builder] Worksite ID from URL:', worksiteId);
  }, [worksiteId]);

  if (!worksiteId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="text-center bg-slate-800/50 border border-slate-700/50 p-8 rounded-xl">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">No Worksite Selected</h2>
          <p className="text-slate-400 mb-4">You need to select a worksite to create workflows.</p>
          <p className="text-xs text-slate-500 mb-4">URL Parameter: {worksiteId || 'missing'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    try {
      // Map to backend format
      const payload = {
        worksiteId,
        name: workflow.name,
        type: mapTriggerToWorkflowType(workflow.trigger.type as TriggerType),
        triggerType: workflow.trigger.type,
        triggerConfig: workflow.trigger.config,
        actions: workflow.actions.map(a => ({
          type: a.type,
          config: a.config
        })),
        enabled: true,
        priority: 5
      };

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Workflow created successfully!');
        router.push(`/dashboard?worksite=${worksiteId}&tab=workflows`);
      } else {
        const error = await response.json();
        alert(`Failed to create workflow: ${error.error}`);
      }
    } catch (error) {
      console.error('[Workflow Builder] Error:', error);
      alert('Error creating workflow');
    }
  };

  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<{
    total: number;
    matched: number;
    alerts: Array<{ id: string; title: string; severity: string; createdAt: string; location: string }>;
    actionSummary: string[];
  } | null>(null);

  const handleTest = async () => {
    setTestRunning(true);
    setTestResults(null);
    try {
      const res = await fetch(`/api/alerts?worksiteId=${worksiteId}&limit=100`);
      const data = await res.json();
      const allAlerts: any[] = Array.isArray(data) ? data : (data.alerts ?? []);

      const matched = allAlerts.filter(alert => {
        // Trigger match
        const t = workflow.trigger;
        let triggerMatch = false;
        const vType = (alert.violationType || alert.title || '').toLowerCase();
        switch (t.type) {
          case 'ppe_violation':
            triggerMatch = ['ppe', 'helmet', 'vest', 'glove', 'boot', 'harness'].some(k => vType.includes(k));
            break;
          case 'specific_violation':
            triggerMatch = t.config.violationType ? vType.includes(t.config.violationType.toLowerCase()) : true;
            break;
          case 'camera_offline':
            triggerMatch = alert.source === 'camera' && alert.status === 'offline';
            break;
          case 'camera_online':
            triggerMatch = alert.source === 'camera' && alert.status === 'online';
            break;
          case 'high_alert_volume':
          case 'alert_created':
          default:
            triggerMatch = true;
        }
        if (!triggerMatch) return false;

        // Condition match (all must pass)
        return workflow.conditions.every(cond => {
          switch (cond.type) {
            case 'location':
              return cond.config.location
                ? (alert.location || '').toLowerCase().includes(cond.config.location.toLowerCase())
                : true;
            case 'work_hours': {
              const h = new Date(alert.createdAt).getHours();
              return h >= 8 && h < 18;
            }
            case 'camera':
              return cond.config.cameraId ? alert.cameraId === cond.config.cameraId : true;
            default:
              return true;
          }
        });
      });

      // Summarise what actions would fire
      const actionSummary = workflow.actions.map(a => {
        if (a.type === 'send_email') {
          const to = (a.config.emails || []).join(', ') || 'no recipients set';
          return `Send email to ${to}`;
        }
        if (a.type === 'send_sms') {
          const to = (a.config.phones || []).join(', ') || 'no numbers set';
          return `Send SMS to ${to}`;
        }
        if (a.type === 'create_incident') return 'Create incident report';
        if (a.type === 'notify_supervisor') return 'Notify supervisors';
        return a.type;
      });

      setTestResults({
        total: allAlerts.length,
        matched: matched.length,
        alerts: matched.slice(0, 10).map(a => ({
          id: a.id,
          title: a.title || a.violationType || 'Alert',
          severity: a.severity || 'MEDIUM',
          createdAt: a.createdAt,
          location: a.location || '—',
        })),
        actionSummary,
      });
    } catch {
      setTestResults({ total: 0, matched: 0, alerts: [], actionSummary: ['Error fetching alerts'] });
    } finally {
      setTestRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Workflow</h1>
            <p className="text-slate-400">Choose situation → choose reaction</p>
          </div>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left: Step Indicator */}
          <div className="col-span-3">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4 sticky top-6">
              <div className="space-y-3">
                {[
                  { num: 1, label: 'Trigger' },
                  { num: 2, label: 'Conditions' },
                  { num: 3, label: 'Actions' },
                  { num: 4, label: 'Review' }
                ].map((s) => (
                  <div
                    key={s.num}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                      step === s.num
                        ? 'bg-blue-600 text-white'
                        : step > s.num
                        ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/30'
                        : 'bg-slate-700/30 text-slate-500'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      step === s.num ? 'bg-white text-blue-600' :
                      step > s.num ? 'bg-emerald-600 text-white' :
                      'bg-slate-600 text-slate-400'
                    }`}>
                      {step > s.num ? '✓' : s.num}
                    </div>
                    <span className="font-medium">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Form */}
          <div className="col-span-9">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-6">
              {step === 1 && <Step1Trigger workflow={workflow} setWorkflow={setWorkflow} />}
              {step === 2 && <Step2Conditions workflow={workflow} setWorkflow={setWorkflow} worksiteId={worksiteId} />}
              {step === 3 && <Step3Actions workflow={workflow} setWorkflow={setWorkflow} />}
              {step === 4 && <Step4Review workflow={workflow} onTest={handleTest} testRunning={testRunning} testResults={testResults} onClearTest={() => setTestResults(null)} />}

              {/* Navigation */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700">
                <button
                  onClick={() => setStep(Math.max(1, step - 1))}
                  disabled={step === 1}
                  className="px-6 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>
                <div className="flex gap-3">
                  {step === 4 ? (
                    <>
                      <button
                        onClick={handleTest}
                        className="px-6 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
                      >
                        Test Workflow
                      </button>
                      <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                      >
                        Save Workflow
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setStep(Math.min(4, step + 1))}
                      disabled={!canProceed(step, workflow)}
                      className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WorkflowBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-slate-400" />
        </div>
      }
    >
      <WorkflowBuilderPageContent />
    </Suspense>
  );
}

// Step 1: Trigger
function Step1Trigger({ workflow, setWorkflow }: any) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">When should this workflow trigger?</h2>
        <p className="text-slate-400">Choose the situation that starts this automation</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Workflow Name</label>
        <input
          type="text"
          value={workflow.name}
          onChange={(e) => setWorkflow({ ...workflow, name: e.target.value })}
          placeholder="e.g., Hard Hat Alert to Supervisor"
          className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-3">Trigger Situation</label>
        <div className="grid grid-cols-1 gap-3">
          {TRIGGERS.map((trigger) => (
            <button
              key={trigger.value}
              onClick={() => setWorkflow({ 
                ...workflow, 
                trigger: { type: trigger.value, config: {} }
              })}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                workflow.trigger.type === trigger.value
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
              }`}
            >
              <p className="text-white font-medium">{trigger.label}</p>
            </button>
          ))}
        </div>
      </div>

      {workflow.trigger.type && <TriggerConfig workflow={workflow} setWorkflow={setWorkflow} />}
    </div>
  );
}

// Trigger configuration based on type
function TriggerConfig({ workflow, setWorkflow }: any) {
  const { trigger } = workflow;

  if (trigger.type === 'ppe_violation' || trigger.type === 'specific_violation') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">PPE Type</label>
          <select
            value={trigger.config.ppeType || ''}
            onChange={(e) => setWorkflow({
              ...workflow,
              trigger: { ...trigger, config: { ...trigger.config, ppeType: e.target.value }}
            })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="">Any PPE</option>
            <option value="hard_hat">Hard Hat</option>
            <option value="safety_vest">Safety Vest</option>
            <option value="gloves">Gloves</option>
            <option value="safety_glasses">Safety Glasses</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Minimum Severity</label>
          <select
            value={trigger.config.severity || 'MODERATE'}
            onChange={(e) => setWorkflow({
              ...workflow,
              trigger: { ...trigger, config: { ...trigger.config, severity: e.target.value }}
            })}
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          >
            <option value="MINOR">Minor</option>
            <option value="MODERATE">Moderate</option>
            <option value="SEVERE">Severe</option>
            <option value="CRITICAL">Critical</option>
          </select>
        </div>
      </div>
    );
  }

  if (trigger.type === 'camera_offline') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Offline Duration (minutes)</label>
          <input
            type="number"
            value={trigger.config.durationMinutes || 5}
            onChange={(e) => setWorkflow({
              ...workflow,
              trigger: { ...trigger, config: { ...trigger.config, durationMinutes: parseInt(e.target.value) }}
            })}
            min="1"
            max="60"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
      </div>
    );
  }

  if (trigger.type === 'high_alert_volume') {
    return (
      <div className="space-y-4 pt-4 border-t border-slate-700">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Alert Count Threshold</label>
          <input
            type="number"
            value={trigger.config.threshold || 20}
            onChange={(e) => setWorkflow({
              ...workflow,
              trigger: { ...trigger, config: { ...trigger.config, threshold: parseInt(e.target.value) }}
            })}
            min="5"
            max="100"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">Time Window (minutes)</label>
          <input
            type="number"
            value={trigger.config.windowMinutes || 5}
            onChange={(e) => setWorkflow({
              ...workflow,
              trigger: { ...trigger, config: { ...trigger.config, windowMinutes: parseInt(e.target.value) }}
            })}
            min="1"
            max="30"
            className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
          />
        </div>
      </div>
    );
  }

  return null;
}

// Step 2: Conditions (Optional)
function Step2Conditions({ workflow, setWorkflow, worksiteId }: any) {
  const [cameras, setCameras] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!worksiteId) return;
    fetch(`/api/cameras?worksiteId=${worksiteId}`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.cameras ?? []);
        setCameras(list.map((c: any) => ({ id: c.id, name: c.name || c.id })));
      })
      .catch(() => {});
  }, [worksiteId]);

  const addCondition = () => {
    if (workflow.conditions.length >= 4) {
      alert('Maximum 4 conditions allowed');
      return;
    }
    setWorkflow({
      ...workflow,
      conditions: [...workflow.conditions, { type: '', config: {} }]
    });
  };

  const removeCondition = (index: number) => {
    setWorkflow({
      ...workflow,
      conditions: workflow.conditions.filter((_: any, i: number) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Add conditions (optional)</h2>
        <p className="text-slate-400">Only trigger if these conditions are met</p>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-4">
        <p className="text-sm text-blue-300">
          ℹ️ Conditions are optional. Leave empty to trigger for all matching situations.
        </p>
      </div>

      {workflow.conditions.map((condition: any, index: number) => (
        <div key={index} className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white font-medium">Condition {index + 1}</h3>
            <button
              onClick={() => removeCondition(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <select
              value={condition.type}
              onChange={(e) => {
                const newConditions = [...workflow.conditions];
                newConditions[index] = { type: e.target.value, config: {} };
                setWorkflow({ ...workflow, conditions: newConditions });
              }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">Select condition...</option>
              <option value="repeated">Only if repeated X times</option>
              <option value="location">Only if location matches</option>
              <option value="work_hours">Only during work hours</option>
              <option value="camera">Only from specific camera</option>
            </select>

            {condition.type === 'repeated' && (
              <input
                type="number"
                placeholder="Times repeated"
                value={condition.config.times || ''}
                onChange={(e) => {
                  const newConditions = [...workflow.conditions];
                  newConditions[index].config.times = parseInt(e.target.value);
                  setWorkflow({ ...workflow, conditions: newConditions });
                }}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            )}

            {condition.type === 'location' && (
              <input
                type="text"
                placeholder="Location/zone name"
                value={condition.config.location || ''}
                onChange={(e) => {
                  const newConditions = [...workflow.conditions];
                  newConditions[index].config.location = e.target.value;
                  setWorkflow({ ...workflow, conditions: newConditions });
                }}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            )}

            {condition.type === 'camera' && (
              cameras.length === 0 ? (
                <p className="text-sm text-slate-400 px-1">No cameras found for this worksite.</p>
              ) : (
                <select
                  value={condition.config.cameraId || ''}
                  onChange={(e) => {
                    const newConditions = [...workflow.conditions];
                    newConditions[index].config.cameraId = e.target.value;
                    setWorkflow({ ...workflow, conditions: newConditions });
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                >
                  <option value="">Select a camera...</option>
                  {cameras.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )
            )}
          </div>
        </div>
      ))}

      {workflow.conditions.length < 4 && (
        <button
          onClick={addCondition}
          className="w-full px-4 py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-lg transition-all"
        >
          + Add Condition (Optional)
        </button>
      )}
    </div>
  );
}

// Step 3: Actions
function Step3Actions({ workflow, setWorkflow }: any) {
  const addAction = () => {
    setWorkflow({
      ...workflow,
      actions: [...workflow.actions, { type: '', config: {} }]
    });
  };

  const removeAction = (index: number) => {
    setWorkflow({
      ...workflow,
      actions: workflow.actions.filter((_: any, i: number) => i !== index)
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">What should happen?</h2>
        <p className="text-slate-400">Choose one or more actions to execute</p>
      </div>

      {workflow.actions.map((action: any, index: number) => (
        <div key={index} className="p-4 bg-slate-700/30 border border-slate-600 rounded-lg">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-white font-medium">Action {index + 1}</h3>
            <button
              onClick={() => removeAction(index)}
              className="text-red-400 hover:text-red-300"
            >
              Remove
            </button>
          </div>

          <div className="space-y-3">
            <select
              value={action.type}
              onChange={(e) => {
                const newActions = [...workflow.actions];
                newActions[index] = { type: e.target.value, config: {} };
                setWorkflow({ ...workflow, actions: newActions });
              }}
              className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="">Select action...</option>
              {ACTIONS.map(a => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>

            {/* Action Config */}
            {action.type === 'send_sms' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Phone Number(s)</label>
                <input
                  type="text"
                  placeholder="+15551234567, +15559876543"
                  value={action.config.phones || ''}
                  onChange={(e) => {
                    const newActions = [...workflow.actions];
                    newActions[index].config.phones = e.target.value.split(',').map((p: string) => p.trim());
                    setWorkflow({ ...workflow, actions: newActions });
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono text-sm"
                />
              </div>
            )}

            {action.type === 'send_email' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Email Address(es)</label>
                <input
                  type="text"
                  placeholder="supervisor@example.com, manager@example.com"
                  value={action.config.emails || ''}
                  onChange={(e) => {
                    const newActions = [...workflow.actions];
                    newActions[index].config.emails = e.target.value.split(',').map((e: string) => e.trim());
                    setWorkflow({ ...workflow, actions: newActions });
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            )}

            {action.type === 'mute_similar' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Mute Duration (minutes)</label>
                <input
                  type="number"
                  value={action.config.durationMinutes || 10}
                  onChange={(e) => {
                    const newActions = [...workflow.actions];
                    newActions[index].config.durationMinutes = parseInt(e.target.value);
                    setWorkflow({ ...workflow, actions: newActions });
                  }}
                  min="1"
                  max="60"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            )}

            {action.type === 'batch_alerts' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Batch Window (minutes)</label>
                <input
                  type="number"
                  value={action.config.batchMinutes || 5}
                  onChange={(e) => {
                    const newActions = [...workflow.actions];
                    newActions[index].config.batchMinutes = parseInt(e.target.value);
                    setWorkflow({ ...workflow, actions: newActions });
                  }}
                  min="1"
                  max="30"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            )}

            {action.type === 'auto_tag' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Tag Name</label>
                <input
                  type="text"
                  placeholder="e.g., needs_review, critical_zone"
                  value={action.config.tag || ''}
                  onChange={(e) => {
                    const newActions = [...workflow.actions];
                    newActions[index].config.tag = e.target.value;
                    setWorkflow({ ...workflow, actions: newActions });
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            )}

            {action.type === 'auto_assign' && (
              <div>
                <label className="block text-sm text-slate-400 mb-2">Supervisor Email</label>
                <input
                  type="email"
                  placeholder="supervisor@example.com"
                  value={action.config.supervisorEmail || ''}
                  onChange={(e) => {
                    const newActions = [...workflow.actions];
                    newActions[index].config.supervisorEmail = e.target.value;
                    setWorkflow({ ...workflow, actions: newActions });
                  }}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
              </div>
            )}
          </div>
        </div>
      ))}

      <button
        onClick={addAction}
        className="w-full px-4 py-3 border-2 border-dashed border-slate-600 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-lg transition-all"
      >
        + Add Another Action
      </button>
    </div>
  );
}

// Step 4: Review & Save
function Step4Review({ workflow, onTest, testRunning, testResults, onClearTest }: any) {
  const trigger = TRIGGERS.find(t => t.value === workflow.trigger.type);

  const severityColor = (s: string) =>
    s === 'CRITICAL' ? 'text-red-400' : s === 'HIGH' ? 'text-orange-400' : s === 'MEDIUM' ? 'text-yellow-400' : 'text-slate-400';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Review workflow</h2>
        <p className="text-slate-400">Check everything before saving</p>
      </div>

      <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 space-y-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Name</p>
          <p className="text-white font-medium">{workflow.name || 'Untitled Workflow'}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Trigger</p>
          <div className="bg-blue-900/20 border border-blue-700/30 rounded p-3">
            <p className="text-blue-300 font-medium">{trigger?.label || 'Not selected'}</p>
            {workflow.trigger.config && Object.keys(workflow.trigger.config).length > 0 && (
              <pre className="text-xs text-slate-400 mt-2">{JSON.stringify(workflow.trigger.config, null, 2)}</pre>
            )}
          </div>
        </div>

        {workflow.conditions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Conditions</p>
            <ul className="space-y-2">
              {workflow.conditions.map((cond: any, i: number) => (
                <li key={i} className="text-slate-300 text-sm">• {cond.type}{cond.config.cameraId ? ` (camera: ${cond.config.cameraId.slice(0, 8)}…)` : ''}{cond.config.location ? ` (${cond.config.location})` : ''}</li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Actions</p>
          <ul className="space-y-2">
            {workflow.actions.map((action: any, i: number) => {
              const actionDef = ACTIONS.find(a => a.value === action.type);
              return (
                <li key={i} className="bg-emerald-900/20 border border-emerald-700/30 rounded p-3">
                  <p className="text-emerald-300 font-medium">{actionDef?.label || action.type}</p>
                  {action.config && Object.keys(action.config).length > 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      {JSON.stringify(action.config)}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Test results */}
      {testRunning && (
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 flex items-center gap-3">
          <svg className="animate-spin h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-slate-300 text-sm">Simulating against recent alerts…</p>
        </div>
      )}

      {testResults && !testRunning && (
        <div className="bg-slate-700/30 border border-slate-600 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-white font-semibold">Test Results</h3>
            <button onClick={onClearTest} className="text-slate-500 hover:text-slate-300 text-xs">Clear</button>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 bg-slate-800/50 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-white">{testResults.total}</p>
              <p className="text-xs text-slate-400 mt-1">Alerts checked</p>
            </div>
            <div className="flex-1 bg-slate-800/50 rounded-lg p-3 text-center">
              <p className={`text-2xl font-bold ${testResults.matched > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{testResults.matched}</p>
              <p className="text-xs text-slate-400 mt-1">Would have fired</p>
            </div>
          </div>

          {testResults.actionSummary.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Actions that would run</p>
              <ul className="space-y-1">
                {testResults.actionSummary.map((s: string, i: number) => (
                  <li key={i} className="text-sm text-emerald-300 flex items-center gap-2">
                    <span className="text-emerald-600">→</span> {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {testResults.alerts.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Matching alerts (up to 10)</p>
              <ul className="space-y-2">
                {testResults.alerts.map((a: any) => (
                  <li key={a.id} className="flex items-center justify-between text-sm bg-slate-800/40 rounded px-3 py-2">
                    <span className="text-slate-200 truncate max-w-[60%]">{a.title}</span>
                    <span className={`text-xs font-medium ${severityColor(a.severity)}`}>{a.severity}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {testResults.matched === 0 && (
            <p className="text-sm text-slate-400">No recent alerts matched this workflow's trigger and conditions.</p>
          )}
        </div>
      )}

      {!testResults && !testRunning && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-lg p-4">
          <p className="text-sm text-amber-300">
            💡 Use "Test Workflow" to simulate against the last 100 alerts — no notifications will be sent.
          </p>
        </div>
      )}
    </div>
  );
}

// Helper functions
function canProceed(step: number, workflow: WorkflowData): boolean {
  if (step === 1) {
    return !!workflow.name && !!workflow.trigger.type;
  }
  if (step === 2) {
    return true; // Conditions are optional
  }
  if (step === 3) {
    return workflow.actions.length > 0 && workflow.actions.every(a => !!a.type);
  }
  return true;
}

function mapTriggerToWorkflowType(trigger: TriggerType): string {
  if (trigger === 'ppe_violation' || trigger === 'specific_violation') {
    return 'ALERT_ESCALATION';
  }
  if (trigger === 'camera_offline' || trigger === 'camera_online') {
    return 'CAMERA_HEALTH';
  }
  if (trigger === 'high_alert_volume') {
    return 'STORM_MODE';
  }
  return 'ALERT_ESCALATION';
}


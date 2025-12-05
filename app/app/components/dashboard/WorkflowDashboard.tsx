"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Workflow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string[];
  isActive: boolean;
  lastRun?: string;
  runCount: number;
}

interface SystemError {
  id: string;
  type: 'camera_offline' | 'ai_failure' | 'report_error' | 'notification_failed';
  message: string;
  timestamp: string;
  status: 'pending' | 'resolved' | 'escalated';
  autoRetried: boolean;
  retryCount: number;
}

interface NotificationSettings {
  sms: boolean;
  email: boolean;
  push: boolean;
  highSeverityChannel: string[];
  mediumSeverityChannel: string[];
  lowSeverityChannel: string[];
  escalationMinutes: number;
}

interface WorkflowDashboardProps {
  currentUser: any;
}

export default function WorkflowDashboard({ currentUser }: WorkflowDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'automations' | 'notifications' | 'errors'>('automations');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [errors, setErrors] = useState<SystemError[]>([]);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    sms: true,
    email: true,
    push: true,
    highSeverityChannel: ['sms', 'email', 'push'],
    mediumSeverityChannel: ['email', 'push'],
    lowSeverityChannel: ['email'],
    escalationMinutes: 15
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Mock data
      const mockWorkflows: Workflow[] = [
        {
          id: '1',
          name: 'High Severity Alert Response',
          description: 'Notify manager via SMS/email, assign ticket, record in report',
          trigger: 'Alert Severity = High',
          actions: ['Send SMS', 'Send Email', 'Create Ticket', 'Log to Report'],
          isActive: true,
          lastRun: '5 minutes ago',
          runCount: 156
        },
        {
          id: '2',
          name: 'Medium Severity Alert Response',
          description: 'Notify via email only',
          trigger: 'Alert Severity = Medium',
          actions: ['Send Email', 'Log to Report'],
          isActive: true,
          lastRun: '12 minutes ago',
          runCount: 342
        },
        {
          id: '3',
          name: 'Low Severity Alert Response',
          description: 'Log only, no notifications',
          trigger: 'Alert Severity = Low',
          actions: ['Log to Report'],
          isActive: true,
          lastRun: '2 hours ago',
          runCount: 890
        },
        {
          id: '4',
          name: 'Camera Offline Auto-Restart',
          description: 'Attempt restart and notify if failed',
          trigger: 'Camera Status = Offline',
          actions: ['Attempt Restart', 'Wait 30s', 'Check Status', 'Notify Admin if Failed'],
          isActive: true,
          lastRun: '1 day ago',
          runCount: 23
        },
        {
          id: '5',
          name: 'Daily Report Generation',
          description: 'Generate and email daily safety report',
          trigger: 'Schedule: Daily at 6:00 AM',
          actions: ['Generate Report', 'Email to Managers'],
          isActive: false,
          lastRun: '3 days ago',
          runCount: 45
        }
      ];

      const mockErrors: SystemError[] = [
        {
          id: '1',
          type: 'camera_offline',
          message: 'Camera CAM-003 at Site Alpha went offline',
          timestamp: '15 minutes ago',
          status: 'pending',
          autoRetried: true,
          retryCount: 3
        },
        {
          id: '2',
          type: 'ai_failure',
          message: 'AI detection service timeout on Camera CAM-012',
          timestamp: '1 hour ago',
          status: 'resolved',
          autoRetried: true,
          retryCount: 1
        },
        {
          id: '3',
          type: 'notification_failed',
          message: 'SMS delivery failed for +1-555-0123',
          timestamp: '2 hours ago',
          status: 'escalated',
          autoRetried: true,
          retryCount: 5
        }
      ];

      setWorkflows(mockWorkflows);
      setErrors(mockErrors);
    } catch (error) {
      console.error('Error fetching workflow data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleWorkflow = async (id: string, currentStatus: boolean) => {
    setWorkflows(prev =>
      prev.map(w => w.id === id ? { ...w, isActive: !currentStatus } : w)
    );
  };

  const handleResolveError = async (id: string) => {
    setErrors(prev =>
      prev.map(e => e.id === id ? { ...e, status: 'resolved' } : e)
    );
  };

  const handleEscalateError = async (id: string) => {
    setErrors(prev =>
      prev.map(e => e.id === id ? { ...e, status: 'escalated' } : e)
    );
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'camera_offline':
        return (
          <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
        );
      case 'ai_failure':
        return (
          <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
        );
      case 'notification_failed':
        return (
          <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-lg bg-slate-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-amber-500/20 text-amber-400';
      case 'resolved': return 'bg-emerald-500/20 text-emerald-400';
      case 'escalated': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const pendingErrors = errors.filter(e => e.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Workflows & Automation</h1>
          <p className="text-sm text-slate-400 mt-1">Manage automated responses and system monitoring</p>
        </div>
        <button
          onClick={() => router.push('/dashboard/workflow-builder')}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create Workflow</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('automations')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'automations'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <span>Automations</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span>Notifications</span>
            </span>
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'errors'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Error Monitoring</span>
              {pendingErrors > 0 && (
                <span className="px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {pendingErrors}
                </span>
              )}
            </span>
          </button>
        </nav>
      </div>

      {/* Automations Tab */}
      {activeTab === 'automations' && (
        <div className="space-y-4">
          {/* Automated Alert Responses */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white">Automated Alert Responses</h2>
              <p className="text-sm text-slate-400 mt-1">Configure how the system responds to different alert severities</p>
            </div>
            <div className="divide-y divide-slate-700/30">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <h3 className="text-sm font-semibold text-white">{workflow.name}</h3>
                        <button
                          onClick={() => handleToggleWorkflow(workflow.id, workflow.isActive)}
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full transition-colors ${
                            workflow.isActive
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {workflow.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">{workflow.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-slate-500">Trigger: {workflow.trigger}</span>
                        {workflow.lastRun && (
                          <span className="text-xs text-slate-500">Last run: {workflow.lastRun}</span>
                        )}
                        <span className="text-xs text-slate-500">Runs: {workflow.runCount}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {workflow.actions.map((action, i) => (
                          <span key={i} className="px-2 py-0.5 text-xs bg-blue-500/10 text-blue-400 rounded">
                            {action}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/dashboard/workflow-builder?id=${workflow.id}`)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4">
          <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-700/50">
            <h2 className="text-lg font-semibold text-white mb-4">Notification Settings</h2>
            
            {/* Channels */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-slate-300">Enabled Channels</h3>
              <div className="flex flex-wrap gap-3">
                {[
                  { key: 'sms', label: 'SMS', icon: '📱' },
                  { key: 'email', label: 'Email', icon: '📧' },
                  { key: 'push', label: 'Push', icon: '🔔' }
                ].map((channel) => (
                  <button
                    key={channel.key}
                    onClick={() => setNotificationSettings(prev => ({
                      ...prev,
                      [channel.key]: !prev[channel.key as keyof NotificationSettings]
                    }))}
                    className={`px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors ${
                      notificationSettings[channel.key as keyof NotificationSettings]
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                        : 'bg-slate-700/50 text-slate-400 border border-slate-600'
                    }`}
                  >
                    <span>{channel.icon}</span>
                    <span>{channel.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Settings */}
            <div className="space-y-4 mb-6">
              <h3 className="text-sm font-medium text-slate-300">Notification by Severity</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-red-500/10 rounded-lg border border-red-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-sm text-white">High Severity</span>
                  </div>
                  <span className="text-sm text-slate-400">SMS + Email + Push</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-sm text-white">Medium Severity</span>
                  </div>
                  <span className="text-sm text-slate-400">Email + Push</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-sm text-white">Low Severity</span>
                  </div>
                  <span className="text-sm text-slate-400">Email only</span>
                </div>
              </div>
            </div>

            {/* Escalation */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-slate-300">Escalation Rules</h3>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-slate-400">Escalate after</span>
                <input
                  type="number"
                  value={notificationSettings.escalationMinutes}
                  onChange={(e) => setNotificationSettings(prev => ({
                    ...prev,
                    escalationMinutes: parseInt(e.target.value) || 15
                  }))}
                  className="w-20 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <span className="text-sm text-slate-400">minutes of no response</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Errors Tab */}
      {activeTab === 'errors' && (
        <div className="space-y-4">
          {/* Error Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
              <p className="text-2xl font-bold text-white">{errors.length}</p>
              <p className="text-sm text-slate-400">Last 24h Errors</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4 border border-amber-500/20">
              <p className="text-2xl font-bold text-amber-400">{pendingErrors}</p>
              <p className="text-sm text-slate-400">Pending</p>
            </div>
            <div className="bg-slate-800/30 rounded-xl p-4 border border-emerald-500/20">
              <p className="text-2xl font-bold text-emerald-400">{errors.filter(e => e.status === 'resolved').length}</p>
              <p className="text-sm text-slate-400">Resolved</p>
            </div>
          </div>

          {/* Error List */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white">Recent Errors</h2>
            </div>
            <div className="divide-y divide-slate-700/30">
              {errors.length === 0 ? (
                <div className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-slate-400">No errors in the last 24 hours</p>
                </div>
              ) : (
                errors.map((error) => (
                  <div key={error.id} className="p-4 hover:bg-slate-700/20 transition-colors">
                    <div className="flex items-start space-x-4">
                      {getErrorIcon(error.type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-white">{error.message}</p>
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(error.status)}`}>
                            {error.status}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-xs text-slate-500">{error.timestamp}</span>
                          {error.autoRetried && (
                            <span className="text-xs text-slate-500">Auto-retried {error.retryCount}x</span>
                          )}
                        </div>
                      </div>
                      {error.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleResolveError(error.id)}
                            className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-medium rounded-lg hover:bg-emerald-500/30 transition-colors"
                          >
                            Resolve
                          </button>
                          <button
                            onClick={() => handleEscalateError(error.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded-lg hover:bg-red-500/30 transition-colors"
                          >
                            Escalate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


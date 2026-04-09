"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import AcknowledgeAlertModal from '@/app/components/AcknowledgeAlertModal';
import AlertDetailModal from '@/app/components/dashboard/AlertDetailModal';

interface Alert {
  id: string;
  siteId: string;
  siteName: string;
  cameraId: string;
  cameraName: string;
  alertType: string;
  severity: 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'snoozed' | 'resolved';
  assignedUserId?: string;
  assignedUserName?: string;
  createdAt: string;
  imageUrl?: string;
  detectionSnapshot?: string | null;
}

interface AlertRule {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  cameraIds: string[];
  triggerConditions: string;
  actions: string[];
  isActive: boolean;
  createdAt: string;
  description?: string;
  severity?: string;
  ruleType?: string;
  category?: string;
}

interface AlertsAndRulesProps {
  currentUser: any;
  siteFilter?: string;
}

/** Shape expected by AcknowledgeAlertModal (maps from list Alert) */
function toWizardAlert(alert: Alert) {
  const raw = (alert.severity || 'medium').toLowerCase();
  const severity =
    raw === 'high' ? 'HIGH' : raw === 'low' ? 'LOW' : 'MEDIUM';
  return {
    id: alert.id,
    title: alert.alertType,
    description: `${alert.siteName} · ${alert.cameraName}`,
    location: alert.siteName,
    severity,
    worksiteId: alert.siteId || undefined,
  };
}

export default function AlertsAndRules({ currentUser, siteFilter }: AlertsAndRulesProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules'>('alerts');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Alert filters
  const [alertSearch, setAlertSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'acknowledged' | 'snoozed'>('all');
  const [siteFilterAlert, setSiteFilterAlert] = useState<string>(siteFilter || 'all');
  const [alertsPage, setAlertsPage] = useState(1);
  const [alertsPerPage, setAlertsPerPage] = useState(25);

  // Rule filters
  const [ruleSearch, setRuleSearch] = useState('');
  const [ruleStatusFilter, setRuleStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Modals
  const [showCreateRule, setShowCreateRule] = useState(false);
  const [showAlertDetails, setShowAlertDetails] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [showAckWizard, setShowAckWizard] = useState(false);
  const [ackWizardAlert, setAckWizardAlert] = useState<Alert | null>(null);

  useEffect(() => {
    fetchData();
  }, [siteFilter]);

  // Poll for new alerts every 15 seconds when on alerts tab
  useEffect(() => {
    if (activeTab !== 'alerts') return;
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [activeTab, siteFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const alertsUrl = siteFilter && siteFilter !== 'all' 
        ? `/api/alerts?status=ACTIVE,ACKNOWLEDGED&limit=100&worksiteId=${siteFilter}`
        : '/api/alerts?status=ACTIVE,ACKNOWLEDGED&limit=100';
      
      // Use the same endpoint as the working alert-rules page
      const rulesUrl = siteFilter && siteFilter !== 'all'
        ? `/api/custom-rules?worksiteId=${siteFilter}`
        : '/api/custom-rules';
      
      const [alertsRes, rulesRes] = await Promise.all([
        fetch(alertsUrl),
        fetch(rulesUrl)
      ]);

      if (alertsRes.ok) {
        const raw = await alertsRes.json();
        const rawAlerts = raw.data || raw.alerts || [];
        if (process.env.NODE_ENV === 'development') {
          console.log('[AlertsAndRules] Raw alerts from API:', rawAlerts.length, rawAlerts.slice(0, 2));
        }
        const transformedAlerts = rawAlerts.map((a: any) => ({
          ...a,
          siteId: a.worksiteId,
          siteName: a.worksite?.name || a.worksite?.worksiteName || 'Unknown Site',
          cameraName: a.camera?.name || 'Unknown Camera',
          alertType: a.title || a.metadata?.type || 'Alert',
          status: (a.status || 'ACTIVE').toLowerCase(),
          severity: (a.severity || 'MEDIUM').toLowerCase(),
          detectionSnapshot: a.detectionSnapshot ?? a.metadata?.detectionSnapshot ?? undefined,
        }));
        setAlerts(transformedAlerts);
      } else {
        console.error('[AlertsAndRules] Failed to fetch alerts:', alertsRes.status);
      }

      if (rulesRes.ok) {
        const result = await rulesRes.json();
        console.log('[AlertsAndRules] Custom rules API response:', result);
        
        // Handle both response formats: { success: true, data: [...] } or just [...]
        const rawRules = result.success ? (result.data || []) : (Array.isArray(result) ? result : []);
        
        // Transform CustomRule data to match AlertRule interface expected by the component
        const transformedRules: AlertRule[] = rawRules.map((rule: any) => {
          // Extract actions from alertSettings or use defaults
          const actions = rule.alertSettings?.actions || 
                         [...(rule.smsEnabled ? ['send_sms'] : []),
                          ...(rule.emailEnabled ? ['send_email'] : []),
                          'create_alert'];
          
          // Format trigger conditions as a readable string
          const triggerConditions = rule.triggerConditions 
            ? JSON.stringify(rule.triggerConditions).substring(0, 100) + '...'
            : rule.detectionCriteria 
            ? `${rule.detectionCriteria.detectionType || rule.ruleType || 'Custom'} rule`
            : 'Custom rule';
          
          return {
            id: rule.id,
            name: rule.name,
            siteId: rule.worksiteId || '',
            siteName: rule.worksite?.name || rule.worksite?.worksiteName || 'Unknown Site',
            cameraIds: rule.cameraId ? [rule.cameraId] : [],
            triggerConditions,
            actions: Array.isArray(actions) ? actions : [actions],
            isActive: rule.isActive !== undefined ? rule.isActive : true,
            createdAt: rule.createdAt || new Date().toISOString(),
            description: rule.description,
            severity: rule.severity,
            ruleType: rule.ruleType,
            category: rule.category
          };
        });
        
        console.log('[AlertsAndRules] Transformed rules:', transformedRules);
        setRules(transformedRules);
      } else {
        const errorData = await rulesRes.json().catch(() => ({}));
        console.error('[AlertsAndRules] Failed to fetch rules:', rulesRes.status, errorData);
      }
    } catch (error) {
      console.error('[AlertsAndRules] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAlerts = useMemo(() => {
    let result = [...alerts];

    if (alertSearch) {
      const query = alertSearch.toLowerCase();
      result = result.filter(alert =>
        alert.siteName.toLowerCase().includes(query) ||
        alert.cameraName.toLowerCase().includes(query) ||
        alert.alertType.toLowerCase().includes(query)
      );
    }

    if (severityFilter !== 'all') {
      result = result.filter(alert => alert.severity === severityFilter);
    }

    if (statusFilter !== 'all') {
      result = result.filter(alert => alert.status === statusFilter);
    }

    if (siteFilterAlert !== 'all') {
      result = result.filter(alert => alert.siteId === siteFilterAlert);
    }

    return result;
  }, [alerts, alertSearch, severityFilter, statusFilter, siteFilterAlert]);

  const filteredRules = useMemo(() => {
    let result = [...rules];

    if (ruleSearch) {
      const query = ruleSearch.toLowerCase();
      result = result.filter(rule =>
        rule.name.toLowerCase().includes(query) ||
        rule.siteName.toLowerCase().includes(query)
      );
    }

    if (ruleStatusFilter !== 'all') {
      result = result.filter(rule => ruleStatusFilter === 'active' ? rule.isActive : !rule.isActive);
    }

    return result;
  }, [rules, ruleSearch, ruleStatusFilter]);

  const totalAlertPages = Math.max(1, Math.ceil(filteredAlerts.length / alertsPerPage));
  const paginatedAlerts = useMemo(() => {
    const start = (alertsPage - 1) * alertsPerPage;
    return filteredAlerts.slice(start, start + alertsPerPage);
  }, [filteredAlerts, alertsPage, alertsPerPage]);

  useEffect(() => {
    setAlertsPage(1);
  }, [alertSearch, severityFilter, statusFilter, siteFilterAlert, alertsPerPage]);

  useEffect(() => {
    if (alertsPage > totalAlertPages) {
      setAlertsPage(totalAlertPages);
    }
  }, [alertsPage, totalAlertPages]);

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'low': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return 'bg-red-500/20 text-red-400';
      case 'acknowledged': return 'bg-amber-500/20 text-amber-400';
      case 'snoozed': return 'bg-blue-500/20 text-blue-400';
      case 'resolved': return 'bg-emerald-500/20 text-emerald-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const openAcknowledgeWizard = (alert: Alert) => {
    setAckWizardAlert(alert);
    setShowAckWizard(true);
  };

  const handleSnooze = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/snooze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration: 60 }),
      });
      fetchData();
    } catch (error) {
      console.error('Error snoozing alert:', error);
    }
  };

  const handleToggleRule = async (ruleId: string, currentStatus: boolean) => {
    try {
      console.log('[AlertsAndRules] Toggling rule:', ruleId, 'from', currentStatus, 'to', !currentStatus);
      const response = await fetch(`/api/custom-rules/${ruleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[AlertsAndRules] Failed to toggle rule:', response.status, error);
        alert(`Failed to update rule status: ${error.error || response.statusText}`);
        return;
      }

      const result = await response.json();
      console.log('[AlertsAndRules] Rule toggled successfully:', result);
      
      // Update local state immediately for better UX
      setRules(prev => prev.map(rule => 
        rule.id === ruleId 
          ? { ...rule, isActive: !currentStatus }
          : rule
      ));
      
      // Refresh data to ensure consistency
      fetchData();
    } catch (error) {
      console.error('[AlertsAndRules] Error toggling rule:', error);
      alert('Failed to update rule status. Please try again.');
    }
  };

  const handleCloneRule = async (rule: AlertRule) => {
    try {
      // First fetch the full rule data to clone it properly
      const response = await fetch(`/api/custom-rules/${rule.id}`);
      if (!response.ok) {
        console.error('[AlertsAndRules] Failed to fetch rule for cloning:', response.status);
        return;
      }

      const result = await response.json();
      if (!result.success || !result.data) {
        console.error('[AlertsAndRules] Invalid rule data for cloning');
        return;
      }

      const fullRule = result.data;
      
      // Create a clone with a new name
      const cloneResponse = await fetch('/api/custom-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${fullRule.name} (Copy)`,
          description: fullRule.description,
          detectionType: fullRule.detectionCriteria?.detectionType || fullRule.ruleType === 'area_monitoring' ? 'zone_violation' : 'object_present',
          objectClass: fullRule.detectionCriteria?.objectClass,
          minConfidence: fullRule.confidenceThreshold,
          severity: fullRule.severity,
          conditions: fullRule.triggerConditions || {},
          actions: fullRule.alertSettings?.actions || ['create_alert'],
          cameraId: fullRule.cameraId,
          worksiteId: fullRule.worksiteId,
          zoneCoordinates: fullRule.detectionCriteria?.zoneCoordinates,
          smsRecipients: fullRule.smsRecipients || [],
          emailRecipients: fullRule.emailRecipients || [],
        })
      });

      if (!cloneResponse.ok) {
        const error = await cloneResponse.json().catch(() => ({}));
        console.error('[AlertsAndRules] Failed to clone rule:', cloneResponse.status, error);
        alert(`Failed to clone rule: ${error.error || cloneResponse.statusText}`);
        return;
      }

      console.log('[AlertsAndRules] Rule cloned successfully');
      fetchData();
    } catch (error) {
      console.error('[AlertsAndRules] Error cloning rule:', error);
      alert('Failed to clone rule. Please try again.');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      const response = await fetch(`/api/custom-rules/${ruleId}`, { method: 'DELETE' });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('[AlertsAndRules] Failed to delete rule:', response.status, error);
        alert(`Failed to delete rule: ${error.error || response.statusText}`);
        return;
      }

      console.log('[AlertsAndRules] Rule deleted successfully');
      fetchData();
    } catch (error) {
      console.error('[AlertsAndRules] Error deleting rule:', error);
      alert('Failed to delete rule. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts & Rules</h1>
          <p className="text-sm text-slate-400 mt-1">Configure alert triggers and manage active alerts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>Active Alerts</span>
              {alerts.filter(a => a.status === 'active').length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-red-500 text-white rounded-full">
                  {alerts.filter(a => a.status === 'active').length}
                </span>
              )}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            <span className="flex items-center space-x-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
              <span>Rules</span>
            </span>
          </button>
        </nav>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={alertSearch}
                  onChange={(e) => setAlertSearch(e.target.value)}
                  placeholder="Search alerts..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => fetchData()}
                  disabled={loading}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Refresh alerts"
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh
                </button>
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="all">All Severity</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="snoozed">Snoozed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Alerts Table */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
            {filteredAlerts.length > 0 && (
              <div className="px-4 py-3 border-b border-slate-700/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-800/40">
                <div className="text-xs text-slate-400">
                  Showing {(alertsPage - 1) * alertsPerPage + 1}
                  {' - '}
                  {Math.min(alertsPage * alertsPerPage, filteredAlerts.length)}
                  {' of '}
                  {filteredAlerts.length} alerts
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={alertsPerPage}
                    onChange={(e) => setAlertsPerPage(Number(e.target.value))}
                    className="px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-white focus:outline-none"
                  >
                    <option value={10}>10 / page</option>
                    <option value={25}>25 / page</option>
                    <option value={50}>50 / page</option>
                    <option value={100}>100 / page</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setAlertsPage((p) => Math.max(1, p - 1))}
                    disabled={alertsPage === 1}
                    className="px-3 py-1.5 text-xs rounded border border-slate-700/60 text-slate-200 hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-300 min-w-[72px] text-center">
                    Page {alertsPage} / {totalAlertPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAlertsPage((p) => Math.min(totalAlertPages, p + 1))}
                    disabled={alertsPage === totalAlertPages}
                    className="px-3 py-1.5 text-xs rounded border border-slate-700/60 text-slate-200 hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-800/50">
                    <th className="px-4 py-3 text-left font-medium">Site</th>
                    <th className="px-4 py-3 text-left font-medium">Camera</th>
                    <th className="px-4 py-3 text-left font-medium">Alert Type</th>
                    <th className="px-4 py-3 text-left font-medium">Severity</th>
                    <th className="px-4 py-3 text-left font-medium">Time</th>
                    <th className="px-4 py-3 text-left font-medium">Assigned</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <p className="text-slate-400 font-medium">No alerts found</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedAlerts.map((alert) => (
                      <tr key={alert.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-white">{alert.siteName}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-300">{alert.cameraName}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-300">{alert.alertType}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getSeverityBadge(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-400">{alert.createdAt}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-300">{alert.assignedUserName || '-'}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusBadge(alert.status)}`}>
                            {alert.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end space-x-1">
                            {alert.detectionSnapshot && (
                              <img
                                src={alert.detectionSnapshot}
                                alt="Violation snapshot"
                                className="w-10 h-8 object-cover rounded border border-slate-700/50 cursor-pointer"
                                onClick={() => window.open(alert.detectionSnapshot!, '_blank')}
                                title="Violation snapshot"
                              />
                            )}
                            {alert.status === 'active' && (
                              <button
                                type="button"
                                onClick={() => openAcknowledgeWizard(alert)}
                                className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Acknowledgment wizard: record what happened, your assessment, and any follow-up. Submitted details are written to the audit log."
                                aria-label="Open acknowledgment wizard. Your notes and actions are saved to the audit log."
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleSnooze(alert.id)}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Snooze: pause this alert for one hour. It will reappear for review when the snooze ends."
                              aria-label="Snooze alert for one hour"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => { setSelectedAlert(alert); setShowAlertDetails(true); }}
                              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-colors"
                              title="View details: tabs for overview, acknowledgment, follow-up, and activity (responses & logs)."
                              aria-label="View alert details with tabs for overview, acknowledgment, follow-up, and activity"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Filters + Create Button */}
          <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1">
                <div className="relative flex-1 w-full">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    value={ruleSearch}
                    onChange={(e) => setRuleSearch(e.target.value)}
                    placeholder="Search rules..."
                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  />
                </div>
                <select
                  value={ruleStatusFilter}
                  onChange={(e) => setRuleStatusFilter(e.target.value as any)}
                  className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <button
                onClick={() => router.push(`/dashboard/alert-builder${siteFilter && siteFilter !== 'all' ? `?worksite=${siteFilter}` : ''}`)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                <span>Create New Rule</span>
              </button>
            </div>
          </div>

          {/* Rules Table */}
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-800/50">
                    <th className="px-4 py-3 text-left font-medium">Rule Name</th>
                    <th className="px-4 py-3 text-left font-medium">Site</th>
                    <th className="px-4 py-3 text-left font-medium">Conditions</th>
                    <th className="px-4 py-3 text-left font-medium">Actions</th>
                    <th className="px-4 py-3 text-left font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/30">
                  {filteredRules.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center">
                        <p className="text-slate-400">No rules found</p>
                      </td>
                    </tr>
                  ) : (
                    filteredRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-700/20 transition-colors">
                        <td className="px-4 py-4">
                          <span className="text-sm font-medium text-white">{rule.name}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-300">{rule.siteName}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-400 truncate max-w-[200px] block">{rule.triggerConditions}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {rule.actions.slice(0, 2).map((action, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs bg-slate-700 text-slate-300 rounded">
                                {action}
                              </span>
                            ))}
                            {rule.actions.length > 2 && (
                              <span className="px-2 py-0.5 text-xs bg-slate-700 text-slate-400 rounded">
                                +{rule.actions.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => handleToggleRule(rule.id, rule.isActive)}
                            className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors cursor-pointer ${
                              rule.isActive
                                ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30'
                                : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30 border border-slate-500/30'
                            }`}
                            title={`Click to ${rule.isActive ? 'deactivate' : 'activate'} this rule`}
                          >
                            {rule.isActive ? 'Active' : 'Inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => {
                                const params = new URLSearchParams();
                                params.set('rule', rule.id);
                                if (siteFilter && siteFilter !== 'all') {
                                  params.set('worksite', siteFilter);
                                }
                                router.push(`/dashboard/alert-builder?${params.toString()}`);
                              }}
                              className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                              title="Edit Rule"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleCloneRule(rule)}
                              className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                              title="Clone Rule"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteRule(rule.id)}
                              className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete Rule"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <AlertDetailModal
        open={showAlertDetails && !!selectedAlert}
        onClose={() => {
          setShowAlertDetails(false);
          setSelectedAlert(null);
        }}
        listAlert={selectedAlert}
        onOpenAckWizard={openAcknowledgeWizard}
        getSeverityBadge={getSeverityBadge}
        getStatusBadge={getStatusBadge}
      />

      {showAckWizard && ackWizardAlert && (
        <AcknowledgeAlertModal
          key={ackWizardAlert.id}
          alert={toWizardAlert(ackWizardAlert)}
          onClose={() => {
            setShowAckWizard(false);
            setAckWizardAlert(null);
          }}
          onSuccess={() => {
            fetchData();
          }}
        />
      )}
    </div>
  );
}


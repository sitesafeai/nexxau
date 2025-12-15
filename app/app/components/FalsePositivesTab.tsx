'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AlertDetailDrawer from './AlertDetailDrawer';

interface Alert {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  overrideStatus: string | null;
  overrideBy: string | null;
  overrideAt: string | null;
  overrideReason: string | null;
  isTrainingCandidate: boolean;
  modelVersion: string | null;
  detectionSnapshot: string | null;
  detectionVideo: string | null;
  detectionData: any;
  createdAt: string;
  worksite: {
    id: string;
    name: string;
    worksiteName: string;
  } | null;
  camera: {
    id: string;
    name: string;
    location: string;
  } | null;
  rule: {
    name: string;
    description: string;
    severity: string;
  } | null;
  overrideByUser: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface Filters {
  alertType: string;
  worksiteId: string;
  cameraId: string;
  dateFrom: string;
  dateTo: string;
  confidenceMin: number;
  confidenceMax: number;
  status: string;
  reviewerId: string;
  trainingCandidate: boolean | null;
}

const FALSE_POSITIVE_REASONS: Record<string, string> = {
  poor_visibility: 'Poor Visibility',
  occlusion: 'Occlusion',
  incorrect_class: 'Incorrect Class',
  ppe_present_but_obscured: 'PPE Present but Obscured',
  lighting_issue: 'Lighting Issue',
  reflection: 'Reflection',
  camera_angle: 'Camera Angle',
  other: 'Other',
};

export default function FalsePositivesTab() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<Filters>({
    alertType: '',
    worksiteId: '',
    cameraId: '',
    dateFrom: '',
    dateTo: '',
    confidenceMin: 0,
    confidenceMax: 1,
    status: 'false_positive', // Default to showing false positives
    reviewerId: '',
    trainingCandidate: null,
  });
  const [worksites, setWorksites] = useState<any[]>([]);
  const [cameras, setCameras] = useState<any[]>([]);
  const [reviewers, setReviewers] = useState<any[]>([]);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      // Map filter status to overrideStatus parameter
      if (filters.status === 'pending') {
        params.append('overrideStatus', 'pending'); // This maps to null in API
      } else if (filters.status === 'false_positive') {
        params.append('overrideStatus', 'false_positive');
      } else if (filters.status === 'confirmed_violation') {
        params.append('overrideStatus', 'confirmed_violation');
      }
      
      if (filters.alertType) params.append('alertType', filters.alertType);
      if (filters.worksiteId) params.append('worksiteId', filters.worksiteId);
      if (filters.cameraId) params.append('cameraId', filters.cameraId);
      if (filters.dateFrom) params.append('startDate', filters.dateFrom);
      if (filters.dateTo) params.append('endDate', filters.dateTo);
      if (filters.confidenceMin > 0) params.append('confidenceMin', filters.confidenceMin.toString());
      if (filters.confidenceMax < 1) params.append('confidenceMax', filters.confidenceMax.toString());
      if (filters.reviewerId) params.append('reviewerId', filters.reviewerId);
      if (filters.trainingCandidate !== null) params.append('trainingCandidate', filters.trainingCandidate.toString());
      params.append('limit', '100');
      params.append('offset', '0');

      const res = await fetch(`/api/alerts?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        // Handle both response formats: { data: [...] } or { success: true, data: [...] }
        if (data.success !== undefined) {
        setAlerts(data.data || []);
        } else if (Array.isArray(data)) {
          setAlerts(data);
        } else if (data.data) {
          setAlerts(data.data);
        } else {
          setAlerts([]);
        }
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Failed to load alerts' }));
        console.error('[FalsePositivesTab] API Error Response:', errorData);
        const errorMsg = errorData.details || errorData.error || `Failed to load alerts: ${res.status}`;
        if (errorData.debug) {
          console.error('[FalsePositivesTab] Debug info:', errorData.debug);
        }
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load alerts';
      // Check if error is about missing overrideStatus column
      if (errorMessage.includes('overrideStatus') || errorMessage.includes('does not exist')) {
        setError('Database schema needs to be updated. Please run migrations: npx prisma migrate dev');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  useEffect(() => {
    // Load worksites, cameras, reviewers for filters
    const loadFilterData = async () => {
      try {
        const [worksitesRes, camerasRes] = await Promise.all([
          fetch('/api/worksites'),
          fetch('/api/cameras'),
        ]);
        if (worksitesRes.ok) {
          const data = await worksitesRes.json();
          // Handle both response formats
          if (data.success !== undefined) {
          setWorksites(data.data || []);
          } else if (Array.isArray(data)) {
            setWorksites(data);
          } else if (data.data) {
            setWorksites(data.data);
          }
        }
        if (camerasRes.ok) {
          const data = await camerasRes.json();
          // Handle both response formats
          if (data.success !== undefined) {
          setCameras(data.data || []);
          } else if (Array.isArray(data)) {
            setCameras(data);
          } else if (data.data) {
            setCameras(data.data);
          }
        }
        // TODO: Load reviewers from users API
      } catch (error) {
        console.error('Failed to load filter data:', error);
      }
    };
    loadFilterData();
  }, []);

  const handleRowClick = async (alert: Alert) => {
    setSelectedAlert(alert);
    setShowDrawer(true);
  };

  const handleBulkOverride = async (overrideStatus: 'false_positive' | 'confirmed_violation', reason?: string) => {
    if (selectedIds.size === 0) return;

    try {
      const res = await fetch('/api/alerts/bulk-override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertIds: Array.from(selectedIds),
          overrideStatus,
          overrideReason: reason || 'other',
        }),
      });

      if (res.ok) {
        setSelectedIds(new Set());
        loadAlerts();
      } else {
        const error = await res.json();
        alert(`Failed to override alerts: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to bulk override:', error);
      alert('Failed to override alerts');
    }
  };

  const getConfidence = (alert: Alert): number => {
    if (alert.detectionData?.confidence) return alert.detectionData.confidence;
    if (typeof alert.detectionData === 'object' && alert.detectionData) {
      return 0.5; // Default if no confidence available
    }
    return 0;
  };

  const getStatusBadge = (status: string | null) => {
    if (!status || status === 'pending') {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-slate-700 text-slate-300">Pending Review</span>;
    }
    if (status === 'false_positive') {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-amber-600 text-white">False Positive</span>;
    }
    if (status === 'confirmed_violation') {
      return <span className="px-2 py-1 text-xs font-medium rounded bg-red-600 text-white">Confirmed Violation</span>;
    }
    return <span className="px-2 py-1 text-xs font-medium rounded bg-gray-600 text-white">{status}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-white">False Positives Monitoring</h2>
          <p className="text-sm text-slate-400 mt-1">Triage and review alerts marked as false positives</p>
        </div>
        {selectedIds.size > 0 && (
          <div className="flex gap-2">
            <button
              onClick={() => handleBulkOverride('false_positive')}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded transition-colors"
            >
              Mark {selectedIds.size} as False Positive
            </button>
            <button
              onClick={() => handleBulkOverride('confirmed_violation')}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
            >
              Mark {selectedIds.size} as Confirmed
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded transition-colors"
            >
              Clear Selection
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-slate-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Alert Type</label>
            <select
              value={filters.alertType}
              onChange={(e) => setFilters({ ...filters, alertType: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            >
              <option value="">All Types</option>
              <option value="missing_helmet">Missing Helmet</option>
              <option value="missing_vest">Missing Vest</option>
              <option value="missing_gloves">Missing Gloves</option>
              <option value="restricted_zone">Restricted Zone</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Worksite</label>
            <select
              value={filters.worksiteId}
              onChange={(e) => setFilters({ ...filters, worksiteId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            >
              <option value="">All Worksites</option>
              {worksites.map((ws) => (
                <option key={ws.id} value={ws.id}>{ws.name || ws.worksiteName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Camera</label>
            <select
              value={filters.cameraId}
              onChange={(e) => setFilters({ ...filters, cameraId: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            >
              <option value="">All Cameras</option>
              {cameras.map((cam) => (
                <option key={cam.id} value={cam.id}>{cam.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            >
              <option value="false_positive">False Positives (All)</option>
              <option value="pending">Pending Review</option>
              <option value="confirmed_violation">Confirmed Violations</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">
              Confidence: {filters.confidenceMin.toFixed(2)} - {filters.confidenceMax.toFixed(2)}
            </label>
            <div className="flex gap-2">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.confidenceMin}
                onChange={(e) => setFilters({ ...filters, confidenceMin: parseFloat(e.target.value) })}
                className="flex-1"
              />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={filters.confidenceMax}
                onChange={(e) => setFilters({ ...filters, confidenceMax: parseFloat(e.target.value) })}
                className="flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Training Candidate</label>
            <select
              value={filters.trainingCandidate === null ? '' : filters.trainingCandidate.toString()}
              onChange={(e) => setFilters({ ...filters, trainingCandidate: e.target.value === '' ? null : e.target.value === 'true' })}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-900">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === alerts.length && alerts.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(new Set(alerts.map(a => a.id)));
                      } else {
                        setSelectedIds(new Set());
                      }
                    }}
                    className="rounded border-slate-500 bg-slate-700"
                  />
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Thumbnail</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Alert Type</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Confidence</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Worksite</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Camera</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Timestamp</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Reviewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-red-400">
                      <p className="font-medium">Error loading alerts</p>
                      <p className="text-sm text-red-300 mt-1">{error}</p>
                      <button
                        onClick={() => loadAlerts()}
                        className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : alerts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                    No alerts found matching your filters.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr
                    key={alert.id}
                    onClick={() => handleRowClick(alert)}
                    className="hover:bg-slate-700 cursor-pointer"
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.has(alert.id)}
                        onChange={(e) => {
                          const newSet = new Set(selectedIds);
                          if (e.target.checked) {
                            newSet.add(alert.id);
                          } else {
                            newSet.delete(alert.id);
                          }
                          setSelectedIds(newSet);
                        }}
                        className="rounded border-slate-500 bg-slate-700"
                      />
                    </td>
                    <td className="px-6 py-4">
                      {alert.detectionSnapshot ? (
                        <img
                          src={alert.detectionSnapshot}
                          alt="Alert snapshot"
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-slate-700 rounded flex items-center justify-center text-slate-500 text-xs">
                          No Image
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-white">{alert.title}</div>
                      <div className="text-xs text-slate-400">{alert.rule?.name || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-white">
                        {(getConfidence(alert) * 100).toFixed(1)}%
                      </div>
                      <div className="w-24 h-1.5 bg-slate-700 rounded-full mt-1">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${getConfidence(alert) * 100}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {alert.worksite?.name || alert.worksite?.worksiteName || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {alert.camera?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {new Date(alert.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(alert.overrideStatus)}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-300">
                      {alert.overrideByUser?.name || '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      {showDrawer && selectedAlert && (
        <AlertDetailDrawer
          alert={selectedAlert}
          onClose={() => {
            setShowDrawer(false);
            setSelectedAlert(null);
          }}
          onOverrideApplied={() => {
            loadAlerts();
            setShowDrawer(false);
            setSelectedAlert(null);
          }}
        />
      )}
    </div>
  );
}

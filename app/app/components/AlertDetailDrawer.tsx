'use client';

import React, { useState, useEffect } from 'react';

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

interface AlertDetailDrawerProps {
  alert: Alert;
  onClose: () => void;
  onOverrideApplied: () => void;
}

const OVERRIDE_REASONS = [
  { id: 'poor_visibility', label: 'Poor Visibility' },
  { id: 'occlusion', label: 'Occlusion' },
  { id: 'incorrect_class', label: 'Incorrect Class' },
  { id: 'ppe_present_but_obscured', label: 'PPE Present but Obscured' },
  { id: 'lighting_issue', label: 'Lighting Issue' },
  { id: 'reflection', label: 'Reflection' },
  { id: 'camera_angle', label: 'Camera Angle' },
  { id: 'other', label: 'Other' },
];

export default function AlertDetailDrawer({ alert, onClose, onOverrideApplied }: AlertDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'alert' | 'report' | 'timeline' | 'model'>('alert');
  const [overrideStatus, setOverrideStatus] = useState<string>(alert.overrideStatus || '');
  const [overrideReason, setOverrideReason] = useState<string>(alert.overrideReason || '');
  const [isTrainingCandidate, setIsTrainingCandidate] = useState<boolean>(alert.isTrainingCandidate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadReport = async () => {
    if (activeTab === 'report' && !reportData) {
      setLoadingReport(true);
      try {
        const res = await fetch(`/api/alerts/${alert.id}/report`);
        if (res.ok) {
          const data = await res.json();
          setReportData(data.report);
        }
      } catch (error) {
        console.error('Failed to load report:', error);
      } finally {
        setLoadingReport(false);
      }
    }
  };

  useEffect(() => {
    loadReport();
  }, [activeTab]);

  const handleOverride = async () => {
    if (!overrideStatus || (overrideStatus !== alert.overrideStatus && !overrideReason)) {
      window.alert('Please select a status and reason');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/alerts/${alert.id}/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          overrideStatus,
          overrideReason: overrideReason || undefined,
          isTrainingCandidate,
        }),
      });

      if (res.ok) {
        onOverrideApplied();
      } else {
        const error = await res.json();
        window.alert(`Failed to override: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Failed to override:', error);
      window.alert('Failed to override alert');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getConfidence = (): number => {
    if (alert.detectionData?.confidence) return alert.detectionData.confidence;
    return 0.5;
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="flex-1 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-700 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-white">Alert Details</h3>
            <p className="text-sm text-slate-400">{alert.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-700 flex gap-4 shrink-0">
          {(['alert', 'report', 'timeline', 'model'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Alert Tab */}
          {activeTab === 'alert' && (
            <div className="space-y-6">
              {/* Image/Video */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Detection Media</h4>
                {alert.detectionVideo ? (
                  <video
                    controls
                    src={alert.detectionVideo}
                    className="w-full rounded-lg"
                  />
                ) : alert.detectionSnapshot ? (
                  <img
                    src={alert.detectionSnapshot}
                    alt="Detection"
                    className="w-full rounded-lg"
                  />
                ) : (
                  <div className="aspect-video bg-slate-700 rounded-lg flex items-center justify-center text-slate-500">
                    No media available
                  </div>
                )}
              </div>

              {/* Detection Data */}
              {alert.detectionData && (
                <div className="bg-slate-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-4">Detection Data</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Confidence:</span>
                      <span className="text-white">{(getConfidence() * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Model Version:</span>
                      <span className="text-white">{alert.modelVersion || 'N/A'}</span>
                    </div>
                    {alert.detectionData.objects && (
                      <div>
                        <span className="text-slate-400">Detected Objects:</span>
                        <pre className="mt-2 p-2 bg-slate-900 rounded text-xs text-slate-300 overflow-auto">
                          {JSON.stringify(alert.detectionData.objects, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="bg-slate-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Alert Metadata</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Worksite:</span>
                    <p className="text-white">{alert.worksite?.name || alert.worksite?.worksiteName || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Camera:</span>
                    <p className="text-white">{alert.camera?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Rule:</span>
                    <p className="text-white">{alert.rule?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Timestamp:</span>
                    <p className="text-white">{new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Override Section */}
              <div className="bg-slate-800 rounded-lg p-4 space-y-4">
                <h4 className="text-sm font-medium text-slate-300">Override Classification</h4>
                
                <div>
                  <label className="block text-xs text-slate-400 mb-2">Classification</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overrideStatus"
                        value="false_positive"
                        checked={overrideStatus === 'false_positive'}
                        onChange={(e) => setOverrideStatus(e.target.value)}
                        className="text-amber-600"
                      />
                      <span className="text-sm text-white">False Positive</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="overrideStatus"
                        value="confirmed_violation"
                        checked={overrideStatus === 'confirmed_violation'}
                        onChange={(e) => setOverrideStatus(e.target.value)}
                        className="text-red-600"
                      />
                      <span className="text-sm text-white">Confirmed Violation</span>
                    </label>
                  </div>
                </div>

                {overrideStatus && overrideStatus !== alert.overrideStatus && (
                  <>
                    <div>
                      <label className="block text-xs text-slate-400 mb-2">Reason *</label>
                      <select
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white rounded text-sm"
                      >
                        <option value="">Select reason...</option>
                        {OVERRIDE_REASONS.map((r) => (
                          <option key={r.id} value={r.id}>{r.label}</option>
                        ))}
                      </select>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isTrainingCandidate}
                        onChange={(e) => setIsTrainingCandidate(e.target.checked)}
                        className="rounded border-slate-500 bg-slate-700 text-blue-600"
                      />
                      <span className="text-sm text-slate-300">Include this sample in future training datasets</span>
                    </label>

                    <button
                      onClick={handleOverride}
                      disabled={isSubmitting || !overrideReason}
                      className="w-full px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
                    >
                      {isSubmitting ? 'Saving...' : 'Save Override'}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Report Tab */}
          {activeTab === 'report' && (
            <div className="space-y-4">
              {loadingReport ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : reportData ? (
                <div className="bg-slate-800 rounded-lg p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Alert Summary</h4>
                    <div className="text-sm text-white space-y-1">
                      <p><span className="text-slate-400">Title:</span> {reportData.alert.title}</p>
                      <p><span className="text-slate-400">Severity:</span> {reportData.alert.severity}</p>
                      <p><span className="text-slate-400">Status:</span> {reportData.alert.status}</p>
                    </div>
                  </div>
                  {reportData.override && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Override Information</h4>
                      <div className="text-sm text-white space-y-1">
                        <p><span className="text-slate-400">Status:</span> {reportData.override.status}</p>
                        <p><span className="text-slate-400">Reason:</span> {reportData.override.reason || 'N/A'}</p>
                        <p><span className="text-slate-400">Overridden By:</span> {reportData.override.overriddenBy?.name || 'N/A'}</p>
                        <p><span className="text-slate-400">Training Candidate:</span> {reportData.override.isTrainingCandidate ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                  )}
                  {reportData.timeline && reportData.timeline.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-300 mb-2">Timeline</h4>
                      <div className="space-y-2">
                        {reportData.timeline.map((event: any, idx: number) => (
                          <div key={idx} className="text-sm text-slate-300">
                            <span className="text-slate-400">{new Date(event.timestamp).toLocaleString()}:</span> {event.event}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">No report data available</div>
              )}
            </div>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-6">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Event Timeline</h4>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-white">Alert Created</p>
                      <p className="text-xs text-slate-400">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  {alert.overrideAt && (
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-2" />
                      <div>
                        <p className="text-sm font-medium text-white">Override Applied</p>
                        <p className="text-xs text-slate-400">{new Date(alert.overrideAt).toLocaleString()}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Status: {alert.overrideStatus} | Reason: {alert.overrideReason || 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Model Analysis Tab */}
          {activeTab === 'model' && (
            <div className="space-y-4">
              <div className="bg-slate-800 rounded-lg p-6">
                <h4 className="text-sm font-medium text-slate-300 mb-4">Model Analysis</h4>
                <div className="space-y-4 text-sm">
                  <div>
                    <span className="text-slate-400">Model Version:</span>
                    <p className="text-white">{alert.modelVersion || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Confidence Score:</span>
                    <p className="text-white">{(getConfidence() * 100).toFixed(1)}%</p>
                  </div>
                  {alert.detectionData && (
                    <div>
                      <span className="text-slate-400">Detection Data:</span>
                      <pre className="mt-2 p-3 bg-slate-900 rounded text-xs text-slate-300 overflow-auto max-h-64">
                        {JSON.stringify(alert.detectionData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

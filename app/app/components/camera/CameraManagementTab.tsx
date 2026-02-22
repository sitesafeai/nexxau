/**
 * CameraManagementTab - Camera management with pagination, fullscreen, and debug
 * 
 * Features:
 * - Pagination (9 cameras per page, 3x3 grid)
 * - Fullscreen camera view
 * - Settings/Debug info modal
 * - Camera deletion (fixed)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDashboard, useSiteManagement } from '@/app/lib/context/DashboardContext';
import CameraGrid from '@/app/components/cameras/CameraGrid';
import AddCameraModal from '@/app/components/cameras/AddCameraModal';
import CameraTile from '@/app/components/cameras/CameraTile';
import { canCreateCamera, type UserRole } from '@/app/lib/permissions';

/**
 * Camera interface matching API response
 */
interface Camera {
  id: string;
  name: string;
  status: string;
  location: string | null;
  streamUrl: string | null;
  janusFeedId: number | null;
  metadata: {
    aiEnabled?: boolean;
    overlayEnabled?: boolean;
    [key: string]: any;
  } | null;
}

const OVERLAY_PREFS_KEY = 'nexxauCameraOverlayPrefs';

const loadOverlayPrefs = (): Record<string, boolean> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = localStorage.getItem(OVERLAY_PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object') {
      return parsed as Record<string, boolean>;
    }
  } catch {
    // ignore invalid storage
  }
  return {};
};

const saveOverlayPrefs = (prefs: Record<string, boolean>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(OVERLAY_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
};

/**
 * CameraManagementTab component
 */
export default function CameraManagementTab() {
  const { state } = useDashboard();
  const { selectedSite } = useSiteManagement();
  const currentUser = state.currentUser;
  const showAddCamera = canCreateCamera((currentUser?.role as UserRole) ?? 'VIEWER');

  // State
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCameraModalOpen, setIsAddCameraModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const camerasPerPage = 9;
  
  // Fullscreen state
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);
  
  // Settings/Debug state
  const [settingsCamera, setSettingsCamera] = useState<Camera | null>(null);

  /**
   * Fetch cameras from API
   */
  const fetchCameras = useCallback(async () => {
    if (!selectedSite?.id) {
      console.log('[CameraManagementTab] No selected site, skipping fetch');
      setCameras([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log(`[CameraManagementTab] Fetching cameras for worksite ${selectedSite.id}`);
      console.log(`[CameraManagementTab] Selected site:`, selectedSite);
      
      // Fetch worksite data which includes cameras with janusFeedId
      const apiUrl = `/api/worksites/${selectedSite.id}`;
      console.log(`[CameraManagementTab] API URL: ${apiUrl}`);
      
      const response = await fetch(apiUrl, {
          cache: 'no-store',
        credentials: 'include' // Include cookies for authentication
      });

      console.log(`[CameraManagementTab] Response status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        let errorMessage = `Failed to fetch worksite (${response.status})`;
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
          errorDetails = errorData.details || '';
          console.error(`[CameraManagementTab] API error response:`, errorData);
        } catch (parseError) {
          // If JSON parse fails, use status text
          const text = await response.text().catch(() => '');
          errorMessage = response.statusText || errorMessage;
          console.error(`[CameraManagementTab] Failed to parse error response:`, parseError, 'Response text:', text);
        }
        
        const fullError = errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
        console.error(`[CameraManagementTab] ❌ API error: ${fullError}`);
        throw new Error(fullError);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        console.error('[CameraManagementTab] Invalid response structure:', data);
        throw new Error(data.error || 'Invalid response from server');
      }

      const worksiteData = data.data;
      const overlayPrefs = loadOverlayPrefs();
      const camerasList = (worksiteData.cameras || []).map((c: any) => {
        const overlayEnabled = typeof overlayPrefs[c.id] === 'boolean'
          ? overlayPrefs[c.id]
          : (c.metadata?.overlayEnabled ?? true);

        return {
          id: c.id,
          name: c.name || 'Unnamed Camera',
        status: c.status || 'pending',
        location: c.location || null,
          streamUrl: c.streamUrl || null,
        janusFeedId: c.janusFeedId || null,
        metadata: {
          ...(c.metadata || {}),
          overlayEnabled
        }
      };
    });

      console.log(`[CameraManagementTab] ✅ Loaded ${camerasList.length} cameras`);
      setCameras(camerasList);
      
      // Reset to page 1 if current page is out of bounds
      const totalPages = Math.ceil(camerasList.length / camerasPerPage);
      if (currentPage > totalPages && totalPages > 0) {
        setCurrentPage(1);
      }
    } catch (err: any) {
      console.error('[CameraManagementTab] ❌ Failed to fetch cameras:', err);
      setError(err.message || 'Failed to load cameras');
      setCameras([]);
    } finally {
      setLoading(false);
    }
  }, [selectedSite?.id, currentPage, camerasPerPage]);

  /**
   * Fetch cameras when site changes
   */
  useEffect(() => {
      fetchCameras();
  }, [fetchCameras]);

  /**
   * Handle camera added
   */
  const handleCameraAdded = useCallback((newCamera: Camera) => {
    setCameras(prev => [...prev, newCamera]);
    // CameraGrid/CameraTile will handle stream connections automatically
  }, []);

  /**
   * Handle camera removal
   */
  const handleRemoveCamera = useCallback(async (cameraId: string) => {
    if (!confirm('Are you sure you want to remove this camera? This action cannot be undone.')) {
      return;
    }

    try {
      console.log(`[CameraManagementTab] Deleting camera ${cameraId}...`);
      
      const response = await fetch(`/api/cameras/${cameraId}`, {
          method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.message || `Failed to delete camera (${response.status})`;
        throw new Error(errorMessage);
      }

      console.log(`[CameraManagementTab] ✅ Camera ${cameraId} removed successfully`);
      
      // Remove from UI
      setCameras(prev => prev.filter(c => c.id !== cameraId));
      
      // Close modals if this camera was open
      if (fullscreenCamera?.id === cameraId) {
        setFullscreenCamera(null);
      }
      if (settingsCamera?.id === cameraId) {
        setSettingsCamera(null);
      }
    } catch (err: any) {
      console.error(`[CameraManagementTab] ❌ Failed to remove camera ${cameraId}:`, err);
      alert(`Failed to remove camera: ${err.message}`);
      // Refresh cameras on error
      fetchCameras();
    }
  }, [fetchCameras, fullscreenCamera, settingsCamera]);

  /**
   * Handle starting all RTP workers
   */
  const handleStartAllRtpWorkers = useCallback(async () => {
    if (isRestoring) return;
    // Updated to use restore-all endpoint which restores both mountpoints and RTP workers
    if (!confirm('This will restore all camera mountpoints and start RTP streaming workers. This fixes cameras after Janus restarts. Continue?')) {
      return;
    }

    try {
      setIsRestoring(true);
      console.log('[CameraManagementTab] Restoring all cameras (mountpoints + RTP workers)...');
      
      const response = await fetch('/api/cameras/restore-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || errorData.message || `Failed to restore cameras (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('[CameraManagementTab] ✅ Cameras restored:', data);
      
      const restored = data.restored || 0;
      const total = data.total || 0;
      const failed = data.failed?.length || 0;
      const results = data.results || [];
      
      if (failed > 0) {
        const failedCameras = results.filter((r: any) => !r.success);
        const errorDetails = failedCameras
          .map((r: any) => `  • ${r.cameraName}: ${r.error || 'Unknown error'}`)
          .join('\n');
        
        alert(
          `Restored cameras: ${restored}/${total} succeeded, ${failed} failed.\n\n` +
          `Failed cameras:\n${errorDetails}`
        );
      } else {
        alert(`Successfully restored ${restored}/${total} cameras (mountpoints + RTP workers).`);
      }
      
      // Refresh cameras to update status
      fetchCameras();
      } catch (err: any) {
        console.error('[CameraManagementTab] ❌ Failed to restore cameras:', err);
        alert(`Failed to restore cameras: ${err.message}`);
      } finally {
        setIsRestoring(false);
      }
  }, [fetchCameras, isRestoring]);

  /**
   * Handle overlay toggle (client-only)
   */
  const handleToggleOverlay = useCallback(async (cameraId: string, enabled: boolean) => {
    setCameras(prev =>
      prev.map(c =>
        c.id === cameraId
          ? { ...c, metadata: { ...c.metadata, overlayEnabled: enabled } }
          : c
      )
    );

    setSettingsCamera(prev =>
      prev?.id === cameraId
        ? { ...prev, metadata: { ...prev.metadata, overlayEnabled: enabled } }
        : prev
    );

    setFullscreenCamera(prev =>
      prev?.id === cameraId
        ? { ...prev, metadata: { ...prev.metadata, overlayEnabled: enabled } }
        : prev
    );

    const prefs = loadOverlayPrefs();
    prefs[cameraId] = enabled;
    saveOverlayPrefs(prefs);
  }, []);

  /**
   * Pagination calculations
   */
  const totalPages = Math.ceil(cameras.length / camerasPerPage);
  const startIndex = (currentPage - 1) * camerasPerPage;
  const endIndex = startIndex + camerasPerPage;
  const currentCameras = cameras.slice(startIndex, endIndex);

  /**
   * Render loading state
   */
  if (loading) {
  return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-400">Loading cameras...</p>
        </div>
      </div>
    );
  }

  /**
   * Render error state
   */
  if (error) {
  return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-400">Error Loading Cameras</h3>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
          <button
          onClick={fetchCameras}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors text-sm font-medium"
        >
          Retry
          </button>
      </div>
    );
  }

  /**
   * Render no site selected
   */
  if (!selectedSite) {
    return (
      <div className="flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="text-center">
          <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-slate-400 text-lg font-medium mb-2">No Worksite Selected</p>
          <p className="text-slate-500 text-sm">Please select a worksite to view cameras</p>
        </div>
      </div>
    );
  }

  /**
   * Render camera grid
   */
            return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Cameras</h2>
          <p className="text-slate-400 text-sm mt-1">
            {cameras.length} {cameras.length === 1 ? 'camera' : 'cameras'} configured
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleStartAllRtpWorkers}
            disabled={isRestoring}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            title="Restore all camera mountpoints and RTP workers (fixes cameras after Janus restarts)"
          >
            {isRestoring ? (
              <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
            {isRestoring ? 'Restoring…' : 'Restore All Cameras'}
          </button>
          {showAddCamera && (
            <button
              onClick={() => setIsAddCameraModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Camera
            </button>
          )}
        </div>
      </div>
        
      {/* Camera Grid */}
      {cameras.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
            <p className="text-slate-400 text-lg font-medium mb-2">No Cameras Configured</p>
            <p className="text-slate-500 text-sm mb-4">
              {showAddCamera ? 'Add a camera to get started' : 'Only super-admins can add cameras. Contact your administrator.'}
            </p>
                {showAddCamera && (
              <button
                onClick={() => setIsAddCameraModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Add Camera
              </button>
                )}
              </div>
            </div>
          ) : (
            <>
          <CameraGrid
            cameras={currentCameras.map(c => ({
              id: c.id,
              name: c.name,
              janusFeedId: c.janusFeedId,
              rtspUrl: c.streamUrl,
              metadata: c.metadata
            }))}
            onToggleOverlay={handleToggleOverlay}
            onRemoveCamera={handleRemoveCamera}
            onOpenSettings={(cameraId) => {
              const camera = cameras.find(c => c.id === cameraId);
              if (camera) {
                setSettingsCamera(camera);
              }
            }}
            onOpenFullscreen={(cameraId) => {
              const camera = cameras.find(c => c.id === cameraId);
              if (camera) {
                setFullscreenCamera(camera);
              }
            }}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4">
                <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                Previous
                </button>
              <span className="text-slate-400 text-sm">
                Page {currentPage} of {totalPages}
              </span>
                  <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
              >
                Next
                  </button>
            </div>
          )}
        </>
      )}

      {/* Add Camera Modal (super-admin only) */}
      {selectedSite && showAddCamera && (
        <AddCameraModal
          worksiteId={selectedSite.id}
          isOpen={isAddCameraModalOpen}
          onClose={() => setIsAddCameraModalOpen(false)}
          onCameraAdded={handleCameraAdded}
        />
      )}

      {/* Fullscreen Modal */}
      {fullscreenCamera && (
        <FullscreenCameraModal
          camera={fullscreenCamera}
          onToggleOverlay={handleToggleOverlay}
          onClose={() => setFullscreenCamera(null)}
        />
      )}

      {/* Settings/Debug Modal */}
      {settingsCamera && (
        <CameraSettingsModal
          camera={settingsCamera}
          onToggleOverlay={handleToggleOverlay}
          onClose={() => setSettingsCamera(null)}
          onStreamSwitched={fetchCameras}
        />
      )}
    </div>
  );
}

/** Detection item from GET /api/cameras/:id/detections */
interface DetectionItem {
  id: number;
  label: string;
  confidence: number;
}

/**
 * Fullscreen Camera Modal — video + real-time detection sidebar
 */
function FullscreenCameraModal({
  camera,
  onToggleOverlay,
  onClose
}: {
  camera: Camera;
  onToggleOverlay: (cameraId: string, enabled: boolean) => Promise<void>;
  onClose: () => void;
}) {
  const [detections, setDetections] = useState<DetectionItem[]>([]);

  // Poll detections every ~1s while fullscreen is open
  useEffect(() => {
    if (!camera.id) return;
    const url = `/api/cameras/${camera.id}/detections`;
    const fetchDetections = async () => {
      try {
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setDetections(Array.isArray(data) ? data : []);
        }
      } catch {
        setDetections([]);
      }
    };
    fetchDetections();
    const interval = setInterval(fetchDetections, 1000);
    return () => clearInterval(interval);
  }, [camera.id]);

  const confidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-emerald-400';
    if (confidence >= 0.6) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-black/80 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center justify-between">
        <h3 className="text-white text-xl font-semibold">{camera.name}</h3>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
        >
          Close
        </button>
      </div>

      {/* Video + Sidebar row: flex-1 + min-h-0 so row gets real height */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Video container: fills space so video has non-zero size */}
        <div className="flex-1 min-w-0 min-h-0 relative bg-black">
          <div className="absolute inset-0">
            <CameraTile
                camera={{
                  id: camera.id,
                  name: camera.name,
                  janusFeedId: camera.janusFeedId,
                  rtspUrl: camera.streamUrl,
                  metadata: camera.metadata
                }}
                onToggleOverlay={onToggleOverlay}
                onRemove={() => {}}
                fullscreen={true}
              />
          </div>
        </div>

        {/* Detection sidebar — fixed width, even layout */}
        <aside
          className="w-[300px] flex-shrink-0 flex flex-col bg-slate-900/95 border-l border-slate-700/80"
          aria-label="Live detections"
        >
          <div className="flex-shrink-0 px-4 py-3 border-b border-slate-700/80">
            <h4 className="text-slate-200 font-semibold text-sm uppercase tracking-wider">
              Live detections
            </h4>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto">
            {detections.length === 0 ? (
              <div className="flex items-center justify-center py-12 px-4">
                <p className="text-slate-500 text-sm">No detections</p>
              </div>
            ) : (
              <ul className="p-3 space-y-0">
                {detections.map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 py-3 px-3 rounded-md border-b border-slate-800 last:border-b-0 first:pt-0"
                  >
                    <span className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400" aria-hidden>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-white text-sm block truncate">{d.label} detected</span>
                      <span className={`text-xs font-medium ${confidenceColor(d.confidence)}`}>
                        {Math.round(d.confidence * 100)}% confidence
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * Camera Settings/Debug Modal
 */
function CameraSettingsModal({
  camera,
  onToggleOverlay,
  onClose,
  onStreamSwitched
}: {
  camera: Camera;
  onToggleOverlay: (cameraId: string, enabled: boolean) => Promise<void>;
  onClose: () => void;
  onStreamSwitched?: () => void;
}) {
  const cameraState = camera;
  const overlayEnabled = camera.metadata?.overlayEnabled ?? true;
  const [janusStreams, setJanusStreams] = useState<Array<{ id: number; name?: string; description?: string }>>([]);
  const [loadingStreams, setLoadingStreams] = useState(false);
  const [selectedFeedId, setSelectedFeedId] = useState<string>(String(camera.janusFeedId ?? ''));
  const [switching, setSwitching] = useState(false);
  const [switchError, setSwitchError] = useState<string | null>(null);

  useEffect(() => {
    setSelectedFeedId(String(camera.janusFeedId ?? ''));
  }, [camera?.id, camera?.janusFeedId]);

  useEffect(() => {
    setLoadingStreams(true);
    fetch('/api/janus/streams')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) setJanusStreams(data.data);
      })
      .catch(() => setJanusStreams([]))
      .finally(() => setLoadingStreams(false));
  }, []);

  const handleSwitchStream = async () => {
    const feedId = Number(selectedFeedId);
    if (!Number.isInteger(feedId) || feedId <= 0) return;
    if (feedId === camera.janusFeedId) return;
    setSwitchError(null);
    setSwitching(true);
    try {
      const res = await fetch(`/api/cameras/${camera.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ janusFeedId: feedId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update');
      onStreamSwitched?.();
      onClose();
    } catch (e: any) {
      setSwitchError(e?.message || 'Failed to switch stream');
    } finally {
      setSwitching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl p-8 max-w-2xl w-full border border-slate-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Camera Settings & Debug Info</h2>
              <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
        <div className="space-y-6">
          {/* Basic Info */}
                  <div>
            <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-4">
                  <div>
                  <label className="text-sm text-slate-400">Camera Name</label>
                  <p className="text-white font-medium">{camera.name}</p>
                  </div>
                  <div>
                  <label className="text-sm text-slate-400">Status</label>
                  <p className="text-white font-medium">{camera.status}</p>
                  </div>
                  <div>
                  <label className="text-sm text-slate-400">Camera ID</label>
                  <p className="text-white font-mono text-sm break-all">{camera.id}</p>
                  </div>
                  <div>
                  <label className="text-sm text-slate-400">Location</label>
                  <p className="text-white font-medium">{camera.location || 'Not set'}</p>
                  </div>
                  </div>
                </div>
              </div>

          {/* Stream Configuration */}
                  <div>
            <h3 className="text-lg font-semibold text-white mb-4">Stream Configuration</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-3">
                  <div>
                <label className="text-sm text-slate-400">RTSP URL</label>
                <p className="text-white font-mono text-sm break-all">{camera.streamUrl || 'Not configured'}</p>
                  </div>
                  <div>
                <label className="text-sm text-slate-400">Janus Feed ID</label>
                <p className="text-white font-mono text-sm">{camera.janusFeedId !== null ? camera.janusFeedId : 'Not set'}</p>
                  </div>
              <div className="pt-3 border-t border-slate-700">
                <label className="text-sm text-slate-400 block mb-2">Switch to Janus stream</label>
                <p className="text-xs text-slate-500 mb-2">Use stream 6 if you run feed-stream-6.sh on your Mac.</p>
                <select
                  value={selectedFeedId}
                  onChange={(e) => { setSelectedFeedId(e.target.value); setSwitchError(null); }}
                  disabled={loadingStreams || switching}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="">Select stream</option>
                  {janusStreams.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.description ?? s.name ?? `Stream ${s.id}`} (ID: {s.id})
                    </option>
                  ))}
                </select>
                {switchError && <p className="text-red-400 text-xs mt-1">{switchError}</p>}
                <button
                  onClick={handleSwitchStream}
                  disabled={!selectedFeedId || Number(selectedFeedId) === camera.janusFeedId || switching}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white rounded-lg text-sm"
                >
                  {switching ? 'Switching…' : 'Switch to this stream'}
                </button>
              </div>
                </div>
              </div>

          {/* Metadata */}
              <div>
            <h3 className="text-lg font-semibold text-white mb-4">Metadata & Settings</h3>
            <div className="bg-slate-900/50 rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Overlay</p>
                  <p className="text-white text-sm">Show detection boxes</p>
              </div>
              <button
                  onClick={() => onToggleOverlay(camera.id, !overlayEnabled)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                    overlayEnabled
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                  title={overlayEnabled ? 'Overlay Enabled' : 'Overlay Disabled'}
                >
                  Overlay {overlayEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
              <pre className="text-xs text-slate-300 overflow-x-auto">
                {JSON.stringify(camera.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
              <button
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
          </div>
    </div>
  );
}

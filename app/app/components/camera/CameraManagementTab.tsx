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
import { useCameraManager } from '@/app/hooks/useCameraManager';

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
    [key: string]: any;
  } | null;
}

/**
 * CameraManagementTab component
 */
export default function CameraManagementTab() {
  const { state } = useDashboard();
  const { selectedSite } = useSiteManagement();
  const currentUser = state.currentUser;

  // State
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddCameraModalOpen, setIsAddCameraModalOpen] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const camerasPerPage = 9;
  
  // Fullscreen state
  const [fullscreenCamera, setFullscreenCamera] = useState<Camera | null>(null);
  
  // Settings/Debug state
  const [settingsCamera, setSettingsCamera] = useState<Camera | null>(null);

  // Camera manager (one per worksite)
  const janusServerUrl = process.env.NEXT_PUBLIC_JANUS_SERVER_URL || 'ws://localhost:8088/janus';
  const roomId = 1234; // TODO: Get from worksite config
  const cameraManager = useCameraManager({
    janusServerUrl,
    roomId
  });

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
      const camerasList = (worksiteData.cameras || []).map((c: any) => ({
        id: c.id,
        name: c.name || 'Unnamed Camera',
        status: c.status || 'pending',
        location: c.location || null,
        streamUrl: c.streamUrl || null,
        janusFeedId: c.janusFeedId || null,
        metadata: c.metadata || null
      }));

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
    // CameraGrid/CameraTile will automatically register with cameraManager
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
   * Handle AI toggle
   */
  const handleToggleAI = useCallback(async (cameraId: string, enabled: boolean) => {
    // Optimistically update UI
    setCameras(prev =>
      prev.map(c =>
        c.id === cameraId
          ? { ...c, metadata: { ...c.metadata, aiEnabled: enabled } }
          : c
      )
    );

    try {
      const response = await fetch(`/api/cameras/${cameraId}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Failed to toggle AI');
      }

      console.log(`[CameraManagementTab] ✅ Camera ${cameraId} AI toggled to ${enabled}`);
    } catch (err: any) {
      console.error(`[CameraManagementTab] ❌ Failed to toggle AI for camera ${cameraId}:`, err);
      alert(`Failed to toggle AI: ${err.message}`);
      // Revert UI on error
      fetchCameras();
    }
  }, [fetchCameras]);

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
        <button
          onClick={() => setIsAddCameraModalOpen(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Camera
        </button>
      </div>

      {/* Camera Grid */}
      {cameras.length === 0 ? (
        <div className="flex items-center justify-center h-64 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="text-center">
            <svg className="w-12 h-12 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="text-slate-400 text-lg font-medium mb-2">No Cameras Configured</p>
            <p className="text-slate-500 text-sm mb-4">Add a camera to get started</p>
            <button
              onClick={() => setIsAddCameraModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              Add Camera
            </button>
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
            cameraManager={cameraManager}
            onToggleAI={handleToggleAI}
            onRemoveCamera={handleRemoveCamera}
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

      {/* Add Camera Modal */}
      {selectedSite && (
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
          cameraManager={cameraManager}
          onClose={() => setFullscreenCamera(null)}
        />
      )}

      {/* Settings/Debug Modal */}
      {settingsCamera && (
        <CameraSettingsModal
          camera={settingsCamera}
          onClose={() => setSettingsCamera(null)}
        />
      )}
    </div>
  );
}

/**
 * Fullscreen Camera Modal
 */
function FullscreenCameraModal({
  camera,
  cameraManager,
  onClose
}: {
  camera: Camera;
  cameraManager: ReturnType<typeof useCameraManager>;
  onClose: () => void;
}) {
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

      {/* Video Container */}
      <div className="flex-1 relative bg-black flex items-center justify-center">
        <CameraTile
          camera={{
            id: camera.id,
            name: camera.name,
            janusFeedId: camera.janusFeedId,
            rtspUrl: camera.streamUrl,
            metadata: camera.metadata
          }}
          cameraManager={cameraManager}
          onToggleAI={async () => {}}
          onRemove={() => {}}
          isFullscreen
        />
      </div>
    </div>
  );
}

/**
 * Camera Settings/Debug Modal
 */
function CameraSettingsModal({
  camera,
  onClose
}: {
  camera: Camera;
  onClose: () => void;
}) {
  const cameraState = camera; // Could get from cameraManager if needed

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
            </div>
          </div>

          {/* Metadata */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-4">Metadata & Settings</h3>
            <div className="bg-slate-900/50 rounded-lg p-4">
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

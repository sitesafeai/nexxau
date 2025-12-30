'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Camera, Settings, ChevronLeft, ChevronRight, RefreshCw, X, Search, Filter, Trash2, Plus } from 'lucide-react';
import { useDashboard, useSiteManagement } from '@/app/lib/context/DashboardContext';
import CameraStreamViewer from './CameraStreamViewer';
import { backgroundStreamManager } from '@/app/lib/streaming/backgroundStreamManager';
import { fetchWithExplicitTimeout, isTimeoutError, isUserAbortError, isNetworkError } from '@/app/lib/streaming/timeoutUtils';
import AddCameraModal from './AddCameraModal';
import { normalizeRole } from '@/app/lib/roles';

// Types
type CameraStatus = 'online' | 'offline';
type UserRole = 'SITE_MANAGER' | 'SAFETY_OFFICER' | 'VIEWER' | 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SUPERVISOR' | 'WORKER';

interface SiteCamera {
  id: string;
  name: string;
  zone?: string;
  status: CameraStatus;
  aiEnabled: boolean;
  recording: boolean;
  recentViolations: number;
  lastDetection: string | null;
  uptime24h: number;
  thumbnailUrl?: string;
  streamUrl?: string;
  hlsUrl?: string;
  mediamtxPath?: string;
  rtspPath?: string;
}

// Camera Card Component
const CameraCard = ({ 
  camera,
  onViewLive,
  onConfigure,
  userRole
}: {
  camera: SiteCamera;
  onViewLive: () => void;
  onConfigure?: () => void;
  userRole?: UserRole;
}) => {
  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600 transition-colors">
      {/* Thumbnail Area */}
      <div 
        className="relative h-28 bg-slate-900 flex items-center justify-center cursor-pointer"
        onClick={onViewLive}
      >
        {camera.thumbnailUrl ? (
          <img src={camera.thumbnailUrl} alt={camera.name} className="w-full h-full object-cover" />
        ) : (
          <Camera className="w-8 h-8 text-slate-600" />
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2 flex items-center space-x-1">
          <span className={`w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
          <span className="text-xs text-white bg-black/60 px-1.5 py-0.5 rounded font-medium">
            {camera.status === 'online' ? 'LIVE' : 'OFFLINE'}
          </span>
        </div>

        {/* AI Badge */}
        {camera.aiEnabled && (
          <div className="absolute top-2 right-2">
            <span className="text-xs text-white bg-blue-600 px-1.5 py-0.5 rounded font-medium">
              AI
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-start justify-between mb-2">
          <div className="min-w-0 flex-1">
            <h4 className="font-medium text-white text-sm truncate">{camera.name}</h4>
            {camera.zone && (
              <p className="text-xs text-slate-400 truncate">{camera.zone}</p>
            )}
          </div>
          {camera.recentViolations > 0 && (
            <span className="text-xs font-medium text-red-400 bg-red-500/10 px-2 py-0.5 rounded flex-shrink-0 ml-2">
              {camera.recentViolations}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <button 
            onClick={onViewLive}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
          >
            View Live
          </button>
          {onConfigure && (
            <button 
              onClick={onConfigure}
              className="px-3 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
              title="Configure Camera"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Modal Component (Dark Theme)
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children,
  maxWidth = '500px'
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div 
        className="relative bg-slate-800 border border-slate-700 rounded-lg shadow-xl w-full mx-4"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white">
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded hover:bg-slate-700 transition-colors text-slate-400 hover:text-white"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default function CameraManagementTab() {
  const { state } = useDashboard();
  const { selectedSite } = useSiteManagement();
  const currentUser = state.currentUser;

  // State
  const [cameras, setCameras] = useState<SiteCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLiveFeedModal, setShowLiveFeedModal] = useState(false);
  const [selectedCameraForLive, setSelectedCameraForLive] = useState<SiteCamera | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);
  const [rawCameraData, setRawCameraData] = useState<any>(null);
  const [showCameraInfoPopup, setShowCameraInfoPopup] = useState(false);
  const [selectedCameraForInfo, setSelectedCameraForInfo] = useState<SiteCamera | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState<SiteCamera | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showAddCameraModal, setShowAddCameraModal] = useState(false);
  const [cameraHlsUrls, setCameraHlsUrls] = useState<Map<string, string>>(new Map());
  const [cameraHlsLoading, setCameraHlsLoading] = useState<Set<string>>(new Set());
  const [cameraHlsErrors, setCameraHlsErrors] = useState<Map<string, string>>(new Map());
  const [currentLiveHlsUrl, setCurrentLiveHlsUrl] = useState<string | null>(null);
  const [currentLiveLoading, setCurrentLiveLoading] = useState(false);
  const [currentLiveError, setCurrentLiveError] = useState<string | null>(null);
  const [hlsUrls, setHlsUrls] = useState<Map<string, string>>(new Map());
  const [hlsLoading, setHlsLoading] = useState<Map<string, boolean>>(new Map());
  const [hlsErrors, setHlsErrors] = useState<Map<string, string>>(new Map());
  const [currentPage, setCurrentPage] = useState(1);
  const camerasPerPage = 8;
  
  // Search and Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [aiFilter, setAiFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'status' | 'violations' | 'uptime'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Helper function to get or convert camera stream URL
  const getCameraStreamUrl = async (camera: SiteCamera): Promise<string | null> => {
    // Priority: hlsUrl > already converted > mediamtxPath > streamUrl conversion
    
    // 1. If camera already has HLS URL, use it
    if (camera.hlsUrl) {
      return camera.hlsUrl;
    }
    
    // 2. Check if we've already converted this camera
    if (cameraHlsUrls.has(camera.id)) {
      return cameraHlsUrls.get(camera.id) || null;
    }
    
    // 3. If mediamtxPath exists, use MediaMTX (legacy support)
    if ((camera as any).mediamtxPath) {
      const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL;
      if (!streamBaseUrl) {
        console.error('[CameraManagementTab] NEXT_PUBLIC_STREAM_BASE_URL is not configured');
        throw new Error('Stream base URL is not configured');
      }
      return `${streamBaseUrl}/live/${(camera as any).mediamtxPath}/index.m3u8`;
    }
    
    // 4. If streamUrl is already HLS or HTTP, use it directly
    if (camera.streamUrl) {
      if (camera.streamUrl.includes('.m3u8') || (camera.streamUrl.startsWith('http') && !camera.streamUrl.startsWith('rtsp://'))) {
        return camera.streamUrl;
      }
      
      // 5. If it's RTSP, convert it via API
      if (camera.streamUrl.startsWith('rtsp://')) {
        // Prevent duplicate API calls
        if (cameraHlsLoading.has(camera.id)) {
          return null; // Still loading
        }
        
        // Check for cached error
        if (cameraHlsErrors.has(camera.id)) {
          return null; // Previous conversion failed
        }
        
        try {
          setCameraHlsLoading(prev => new Set(prev).add(camera.id));
          
          console.log(`[CameraManagementTab] Converting RTSP to HLS for camera ${camera.id}`);
          const response = await fetch(`/api/streams/${camera.id}?rtspUrl=${encodeURIComponent(camera.streamUrl)}`);
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `Failed to convert RTSP: ${response.status}`);
          }
          
          const data = await response.json();
          const hlsUrl = data.hlsUrl;
          
          if (!hlsUrl) {
            throw new Error('API did not return HLS URL');
          }
    
          // Cache the HLS URL
          setCameraHlsUrls(prev => new Map(prev).set(camera.id, hlsUrl));
          console.log(`[CameraManagementTab] ✅ RTSP converted to HLS: ${hlsUrl}`);
          
          return hlsUrl;
        } catch (error: any) {
          console.error(`[CameraManagementTab] ❌ Failed to convert RTSP for camera ${camera.id}:`, error);
          setCameraHlsErrors(prev => new Map(prev).set(camera.id, error.message || 'Conversion failed'));
          return null;
        } finally {
          setCameraHlsLoading(prev => {
            const next = new Set(prev);
            next.delete(camera.id);
            return next;
          });
        }
      }
    }
    
    // 6. If rtspPath exists, try MediaMTX (legacy)
    if ((camera as any).rtspPath) {
      const streamBaseUrl = process.env.NEXT_PUBLIC_STREAM_BASE_URL;
      if (!streamBaseUrl) {
        console.error('[CameraManagementTab] NEXT_PUBLIC_STREAM_BASE_URL is not configured');
        throw new Error('Stream base URL is not configured');
      }
      const pathName = (camera as any).rtspPath.replace(/^\//, '').replace(/\/$/, '') || `camera-${camera.id}`;
      return `${streamBaseUrl}/live/${pathName}/index.m3u8`;
    }
    
    return null;
  };

  // Track in-flight requests to prevent overlapping calls
  const fetchInProgressRef = useRef<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Data Fetching
  const fetchCameras = useCallback(async () => {
    if (!selectedSite?.id) {
      console.log('[CameraManagementTab] fetchCameras: No selectedSite.id, skipping');
      return;
    }
    
    // Prevent overlapping requests
    if (fetchInProgressRef.current) {
      console.log('[CameraManagementTab] fetchCameras: Request already in progress, skipping');
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    fetchInProgressRef.current = true;
    
    try {
      setError(null);
      setLoading(true);
      
      console.log('[CameraManagementTab] fetchCameras: Starting request for worksiteId:', selectedSite.id);
      const requestStart = Date.now();
      
      // Use explicit timeout utility (30 seconds)
      const camerasRes = await fetchWithExplicitTimeout(
        `/api/cameras?worksiteId=${selectedSite.id}`,
        {
          cache: 'no-store',
          timeoutMs: 30000,
          signal: abortController.signal,
        }
      );

      const requestDuration = Date.now() - requestStart;
      console.log(`[CameraManagementTab] fetchCameras: Request completed in ${requestDuration}ms, status: ${camerasRes.status}`);

      if (camerasRes.ok) {
        const data = await camerasRes.json();
        console.log('[CameraManagementTab] fetchCameras: Response data:', Array.isArray(data) ? `${data.length} cameras` : 'non-array response');
        
        // Handle different response formats
        const camerasList = Array.isArray(data) ? data : (data.cameras || data.data || []);
        
        const formattedCameras = camerasList.map((c: any) => ({
          id: c.id,
          name: c.name || 'Unnamed Camera',
          zone: c.zone || c.location,
          location: c.location || c.zone,
          status: (c.status?.toLowerCase() === 'online' || c.status?.toLowerCase() === 'active' ? 'online' : 'offline') as CameraStatus,
          aiEnabled: c.aiEnabled ?? c.aiDetection ?? false,
          recording: c.recording ?? true,
          recentViolations: c.recentViolations ?? 0,
          lastDetection: c.lastDetection,
          uptime24h: c.uptime24h ?? 99,
          thumbnailUrl: c.thumbnailUrl,
          streamUrl: c.streamUrl || null,
          hlsUrl: c.hlsUrl || null,
          mediamtxPath: c.mediamtxPath || null,
          rtspPath: c.rtspPath || null,
        }));
        setCameras(formattedCameras);
        setError(null); // Clear any previous errors on success
        console.log(`[CameraManagementTab] fetchCameras: ✅ Successfully loaded ${formattedCameras.length} cameras`);
      } else {
        // Parse error response
        let errorData: any = {};
        try {
          const text = await camerasRes.text();
          if (text) {
            try {
              errorData = JSON.parse(text);
            } catch (parseError) {
              // Not JSON, use text as error message
              errorData = { error: text, code: 'UNKNOWN' };
            }
          } else {
            errorData = { error: camerasRes.statusText, code: 'UNKNOWN' };
          }
        } catch (e) {
          // Response read failed
          console.error('[CameraManagementTab] fetchCameras: Failed to read error response:', e);
          errorData = { error: camerasRes.statusText || 'Unknown error', code: 'UNKNOWN' };
        }

        // Differentiate error types
        let errorMessage = 'Unable to load cameras';
        if (camerasRes.status === 401) {
          errorMessage = 'Unauthorized. Please log in again.';
        } else if (camerasRes.status === 403) {
          errorMessage = 'Access denied. You do not have permission to view cameras for this worksite.';
        } else if (camerasRes.status === 404) {
          errorMessage = 'Worksite not found.';
        } else if (camerasRes.status === 504 || errorData.code === 'TIMEOUT') {
          errorMessage = 'Request timed out. The server took too long to respond. Please try again.';
        } else if (camerasRes.status === 500) {
          // Use the error message from the server if available
          errorMessage = errorData.message || errorData.error || 'Server error occurred while loading cameras.';
          // Log full error details for debugging
          console.error('[CameraManagementTab] fetchCameras: Server error details:', {
            status: camerasRes.status,
            statusText: camerasRes.statusText,
            errorData,
            headers: Object.fromEntries(camerasRes.headers.entries())
          });
        } else {
          errorMessage = errorData.error || errorData.message || `Unable to load cameras: ${camerasRes.status} ${camerasRes.statusText}`;
        }

        console.error(`[CameraManagementTab] fetchCameras: ❌ Error (${camerasRes.status}):`, errorMessage, errorData);
        setError(errorMessage);
        setCameras([]);
      }
    } catch (error: any) {
      // Explicit error handling using timeout utilities
      if (isUserAbortError(error)) {
        console.log('[CameraManagementTab] fetchCameras: Request aborted by user');
        return; // Don't show error for user abort
      }

      if (isTimeoutError(error)) {
        console.error('[CameraManagementTab] fetchCameras: ❌ Timeout error:', error);
        setError('Request timed out. Please try again.');
        setCameras([]);
        return;
      }

      if (isNetworkError(error)) {
        console.error('[CameraManagementTab] fetchCameras: ❌ Network error:', error);
        setError('Network error. Please check your connection and try again.');
        setCameras([]);
        return;
      }

      // Other errors
      const errorMessage = error?.message || 'Unable to load cameras. Please check your connection and try again.';
      console.error('[CameraManagementTab] fetchCameras: ❌ Error:', error);
      setError(errorMessage);
      setCameras([]);
    } finally {
      fetchInProgressRef.current = false;
      setLoading(false);
    }
  }, [selectedSite?.id]);

  useEffect(() => {
    if (selectedSite?.id) {
      fetchCameras();
      // Background refresh every 60 seconds
      const interval = setInterval(() => fetchCameras(), 60000);
      return () => clearInterval(interval);
    }
  }, [selectedSite?.id, fetchCameras]);

  // Cleanup background streams on component unmount
  useEffect(() => {
    return () => {
      backgroundStreamManager.stopAllStreams();
    };
  }, []);

  // Reset to page 1 when cameras or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [cameras.length, searchQuery, statusFilter, aiFilter, sortBy, sortOrder]);

  // Filter and sort cameras
  const filteredAndSortedCameras = useMemo(() => {
    let filtered = [...cameras];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(camera =>
        camera.name.toLowerCase().includes(query) ||
        (camera.zone && camera.zone.toLowerCase().includes(query)) ||
        (camera.location && camera.location.toLowerCase().includes(query))
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(camera => camera.status === statusFilter);
    }

    // Apply AI filter
    if (aiFilter !== 'all') {
      filtered = filtered.filter(camera =>
        aiFilter === 'enabled' ? camera.aiEnabled : !camera.aiEnabled
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'violations':
          comparison = (a.recentViolations || 0) - (b.recentViolations || 0);
          break;
        case 'uptime':
          comparison = (a.uptime24h || 0) - (b.uptime24h || 0);
          break;
        default:
          comparison = 0;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [cameras, searchQuery, statusFilter, aiFilter, sortBy, sortOrder]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredAndSortedCameras.length / camerasPerPage);
  const startIndex = (currentPage - 1) * camerasPerPage;
  const endIndex = startIndex + camerasPerPage;
  const currentCameras = filteredAndSortedCameras.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  const handlePageClick = (page: number) => {
    setCurrentPage(page);
  };

  const handleDeleteCamera = async () => {
    if (!cameraToDelete) return;

    setDeleting(true);
    const abortController = new AbortController();
    
    try {
      // Import explicit timeout utilities
      const { fetchWithExplicitTimeout, isTimeoutError, isUserAbortError, isNetworkError } = await import('@/app/lib/streaming/timeoutUtils');
      const { streamHealthManager } = await import('@/app/lib/streaming/streamHealthManager');

      // Call DELETE API endpoint with explicit timeout (30 seconds)
      const response = await fetchWithExplicitTimeout(
        `/api/cameras/${cameraToDelete.id}`,
        {
          method: 'DELETE',
          timeoutMs: 30000,
          signal: abortController.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        const errorMessage = errorData.error || `Failed to delete camera: ${response.status}`;
        console.error(`[Camera] Delete failed: ${errorMessage}`, errorData);
        throw new Error(errorMessage);
      }

      console.log(`[Camera] ✅ Deleted camera ${cameraToDelete.id}`);

      // Clean up health manager tracking
      streamHealthManager.remove(cameraToDelete.id);

      // Stop background stream for this camera
      backgroundStreamManager.stopBackgroundStream(cameraToDelete.id);

      // Close dialogs
      setShowDeleteConfirm(false);
      setShowCameraInfoPopup(false);
      setCameraToDelete(null);
      setSelectedCameraForInfo(null);

      // Refresh camera list
      await fetchCameras();
    } catch (error: any) {
      // Explicit error handling
      if (isUserAbortError(error)) {
        console.log('[Camera] Delete aborted by user');
        return; // Don't show error for user abort
      }

      let errorMessage = 'Failed to delete camera';
      
      if (isTimeoutError(error)) {
        errorMessage = 'Delete request timed out. The camera may still be deleted. Please refresh.';
        console.error('[Camera] Delete timeout:', error);
      } else if (isNetworkError(error)) {
        errorMessage = 'Network error. Please check your connection and try again.';
        console.error('[Camera] Delete network error:', error);
      } else {
        errorMessage = error.message || 'Unknown error occurred';
        console.error('[Camera] Delete error:', error);
      }

      // Show user-friendly error
      alert(errorMessage);
    } finally {
      setDeleting(false);
      // Cleanup abort controller
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    }
  };

  const getHlsStreamUrl = async (camera: SiteCamera): Promise<string | null> => {
    if (camera.hlsUrl) return camera.hlsUrl;
    if (!camera.streamUrl || !camera.id) return null;

    // Check cache
    if (hlsUrls.has(camera.id)) return hlsUrls.get(camera.id)!;
    if (hlsLoading.has(camera.id) && hlsLoading.get(camera.id)) return null; // Already loading

    setHlsLoading(prev => new Map(prev).set(camera.id, true));
    setHlsErrors(prev => new Map(prev).delete(camera.id));

    const abortController = new AbortController();

    try {
      if (camera.streamUrl.startsWith('rtsp://')) {
        const response = await fetchWithExplicitTimeout(
          `/api/streams/${camera.id}?rtspUrl=${encodeURIComponent(camera.streamUrl)}`,
          {
            timeoutMs: 15000,
            signal: abortController.signal,
          }
        );
        const data = await response.json();
        if (response.ok && data.hlsUrl) {
          setHlsUrls(prev => new Map(prev).set(camera.id, data.hlsUrl));
          return data.hlsUrl;
        } else {
          throw new Error(data.error || 'Failed to get HLS stream');
        }
      } else if (camera.streamUrl.includes('.m3u8')) {
        setHlsUrls(prev => new Map(prev).set(camera.id, camera.streamUrl!));
        return camera.streamUrl;
      }
      return null;
    } catch (error: any) {
      // Explicit error handling
      if (isUserAbortError(error)) {
        console.log(`[CameraManagementTab] HLS URL fetch aborted for ${camera.id}`);
        return null;
      }

      let errorMessage = 'Failed to load stream';
      if (isTimeoutError(error)) {
        errorMessage = 'Stream request timed out';
        console.error(`[CameraManagementTab] HLS URL timeout for ${camera.id}:`, error);
      } else if (isNetworkError(error)) {
        errorMessage = 'Network error loading stream';
        console.error(`[CameraManagementTab] HLS URL network error for ${camera.id}:`, error);
      } else {
        errorMessage = error.message || 'Failed to load stream';
        console.error(`[CameraManagementTab] HLS URL error for ${camera.id}:`, error);
      }

      setHlsErrors(prev => new Map(prev).set(camera.id, errorMessage));
      return null;
    } finally {
      setHlsLoading(prev => new Map(prev).set(camera.id, false));
      // Cleanup abort controller
      if (!abortController.signal.aborted) {
        abortController.abort();
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Cameras Section */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg backdrop-blur-sm">
        <div className="px-5 py-4 border-b border-slate-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <h3 className="font-semibold text-white">Camera Monitoring</h3>
          <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-slate-400">
            {cameras.filter(c => c.status === 'online').length} / {cameras.length} online
          </span>
          
          {/* Add Camera Button */}
          {(() => {
            const userRole = normalizeRole(currentUser?.role);
            const canAddCamera = 
              userRole === 'SUPER_ADMIN' ||
              userRole === 'COMPANY_ADMIN' ||
              userRole === 'SITE_ADMIN' ||
              userRole === 'SAFETY_MANAGER' ||
              userRole === 'SAFETY_ADMIN';
            
            return (
              <button
                onClick={() => setShowAddCameraModal(true)}
                disabled={!selectedSite?.id || !canAddCamera}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                title={!selectedSite?.id ? 'Select a worksite first' : !canAddCamera ? 'Insufficient permissions' : 'Add new camera'}
              >
                <Plus className="w-4 h-4" />
                Add Camera
              </button>
            );
          })()}
          
            <button
              onClick={async () => {
                try {
                  // Fetch raw camera data from API
                  const response = await fetch(`/api/cameras?worksiteId=${selectedSite?.id}`, { cache: 'no-store' });
                  const data = await response.json();
                  setRawCameraData({
                    apiResponse: data,
                    camerasInState: cameras,
                    selectedSiteId: selectedSite?.id,
                    timestamp: new Date().toISOString()
                  });
                  setShowDebugModal(true);
                } catch (error) {
                  console.error('Error fetching camera debug data:', error);
                  setRawCameraData({
                    error: error instanceof Error ? error.message : 'Unknown error',
                    camerasInState: cameras,
                    selectedSiteId: selectedSite?.id,
                    timestamp: new Date().toISOString()
                  });
                  setShowDebugModal(true);
                }
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium rounded transition-colors flex items-center gap-2"
              title="Show all camera information for debugging"
            >
              <Settings className="w-4 h-4" />
              Debug Cameras
            </button>
          </div>
        </div>
        
        <div className="p-5">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
              <p className="text-slate-400 mt-2">Loading cameras...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center justify-center">
                <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-400 font-medium text-lg mb-1">Failed to Load Cameras</p>
                <p className="text-slate-400 text-sm mb-4 max-w-md">{error}</p>
                <button
                  onClick={() => fetchCameras()}
                  disabled={loading}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Retrying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : cameras.length === 0 ? (
            <div className="text-center py-8">
              <Camera className="w-12 h-12 mx-auto mb-3 text-slate-600" />
              <p className="text-slate-400">No cameras configured for this site</p>
            </div>
          ) : (
            <>
            {/* Search and Filter Controls */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search cameras by name, zone, or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Filters and Sort */}
              <div className="flex flex-wrap items-center gap-3">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'online' | 'offline')}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">All Status</option>
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>

                {/* AI Filter */}
                <select
                  value={aiFilter}
                  onChange={(e) => setAiFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All AI Status</option>
                  <option value="enabled">AI Enabled</option>
                  <option value="disabled">AI Disabled</option>
                </select>

                {/* Sort By */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'name' | 'status' | 'violations' | 'uptime')}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="name">Sort by Name</option>
                  <option value="status">Sort by Status</option>
                  <option value="violations">Sort by Violations</option>
                  <option value="uptime">Sort by Uptime</option>
                </select>

                {/* Sort Order */}
                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-white text-sm font-medium transition-colors"
                  title={`Sort ${sortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>

                {/* Clear Filters */}
                {(searchQuery || statusFilter !== 'all' || aiFilter !== 'all' || sortBy !== 'name' || sortOrder !== 'asc') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('all');
                      setAiFilter('all');
                      setSortBy('name');
                      setSortOrder('asc');
                    }}
                    className="px-3 py-2 bg-slate-600 hover:bg-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                {/* Results Count */}
                <div className="ml-auto text-sm text-slate-400">
                  Showing {filteredAndSortedCameras.length} of {cameras.length} cameras
                </div>
              </div>
            </div>

            {/* No Results Message */}
            {filteredAndSortedCameras.length === 0 && cameras.length > 0 && (
              <div className="text-center py-8">
                <Camera className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p className="text-slate-400">No cameras match your filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setAiFilter('all');
                    setSortBy('name');
                    setSortOrder('asc');
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Clear All Filters
                </button>
              </div>
            )}

            {/* Camera Grid */}
            {filteredAndSortedCameras.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {currentCameras.map((camera) => (
                  <CameraCard
                    key={camera.id}
                    camera={camera}
                    onViewLive={async () => {
                      setSelectedCameraForLive(camera);
                      setShowLiveFeedModal(true);
                      
                      // Check if background stream exists and is healthy
                      const existingStream = backgroundStreamManager.getBackgroundStream(camera.id);
                      if (existingStream) {
                        // Verify the stream is actually playing (not paused/ended/errored)
                        const video = existingStream.videoElement;
                        const isStreamHealthy = video && 
                          !video.paused && 
                          !video.ended && 
                          video.readyState >= 2 && // HAVE_CURRENT_DATA or better
                          video.error === null; // No video errors
                        
                        // Also check stream health manager
                        const { streamHealthManager } = await import('@/app/lib/streaming/streamHealthManager');
                        const health = streamHealthManager.getHealth(camera.id);
                        const isHealthHealthy = !health || (health.state !== 'offline' && health.state !== 'error');
                        
                        if (isStreamHealthy && isHealthHealthy) {
                          // Stream is healthy - use it immediately (no loading delay)
                          console.log(`[CameraManagementTab] Reusing existing healthy background stream for camera ${camera.id}`);
                          setCurrentLiveHlsUrl(existingStream.hlsUrl);
                          setCurrentLiveLoading(false);
                          setCurrentLiveError(null);
                          return;
                        } else {
                          // Background stream exists but is not healthy - stop it and start fresh
                          console.warn(`[CameraManagementTab] Background stream for camera ${camera.id} exists but is not healthy (video: ${isStreamHealthy}, health: ${isHealthHealthy}), restarting...`);
                          backgroundStreamManager.stopBackgroundStream(camera.id);
                          // Fall through to start new stream
                        }
                      }
                      
                      // No existing stream - fetch and start new one
                      setCurrentLiveLoading(true);
                      setCurrentLiveError(null);
                      setCurrentLiveHlsUrl(null);
                      
                      try {
                        const url = await getCameraStreamUrl(camera);
                        if (url) {
                          setCurrentLiveHlsUrl(url);
                          setCurrentLiveLoading(false);
                          // Register with background manager to keep it playing
                          backgroundStreamManager.startBackgroundStream(camera.id, url);
                          // Mark camera as viewed in stream registry (for background streaming policy)
                          const { streamRegistry } = await import('@/app/lib/streaming/streamRegistry');
                          streamRegistry.markAsViewed(camera.id);
                          console.log(`[CameraManagementTab] ✅ Camera ${camera.id} marked as viewed`);
                        } else {
                          setCurrentLiveError('Failed to get stream URL. Check camera configuration.');
                          setCurrentLiveLoading(false);
                        }
                      } catch (error: any) {
                        console.error('[CameraManagementTab] Error getting stream URL:', error);
                        setCurrentLiveError(error.message || 'Failed to get stream URL');
                        setCurrentLiveLoading(false);
                      }
                    }}
                    onConfigure={async () => {
                      // Fetch full camera details to show in popup
                      try {
                        const response = await fetch(`/api/cameras/${camera.id}`);
                        if (response.ok) {
                          const data = await response.json();
                          const fullCamera = data.camera || data.data || data;
                          setSelectedCameraForInfo({
                            ...camera,
                            ...fullCamera,
                            zone: fullCamera.zone || fullCamera.location || camera.zone,
                            location: fullCamera.location || fullCamera.zone || camera.zone,
                            hlsUrl: fullCamera.hlsUrl || camera.hlsUrl,
                            streamUrl: fullCamera.streamUrl || camera.streamUrl,
                            mediamtxPath: fullCamera.mediamtxPath || camera.mediamtxPath,
                            rtspPath: fullCamera.rtspPath || camera.rtspPath,
                            aiEnabled: fullCamera.aiEnabled ?? fullCamera.aiDetection ?? camera.aiEnabled,
                            status: fullCamera.status || camera.status
                          });
                        } else {
                          // Fallback to existing camera data
                          setSelectedCameraForInfo(camera);
                        }
                      } catch (error) {
                        console.error('Error fetching camera details:', error);
                        // Fallback to existing camera data
                        setSelectedCameraForInfo(camera);
                      }
                      setShowCameraInfoPopup(true);
                    }}
                    userRole={currentUser?.role as UserRole}
                  />
                ))}
              </div>
            )}
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between border-t border-slate-700/50 pt-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePreviousPage}
                    disabled={currentPage === 1}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                      // Show first page, last page, current page, and pages around current
                      if (
                        page === 1 ||
                        page === totalPages ||
                        (page >= currentPage - 1 && page <= currentPage + 1)
                      ) {
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageClick(page)}
                            className={`px-3 py-2 text-sm font-medium rounded transition-colors ${
                              currentPage === page
                                ? 'bg-blue-600 text-white'
                                : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      } else if (
                        page === currentPage - 2 ||
                        page === currentPage + 2
                      ) {
                        return (
                          <span key={page} className="px-2 text-slate-400">
                            ...
                          </span>
                        );
                      }
                      return null;
                    })}
                  </div>
                  
                  <button
                    onClick={handleNextPage}
                    disabled={currentPage === totalPages}
                    className="px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="text-sm text-slate-400">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredAndSortedCameras.length)} of {filteredAndSortedCameras.length} cameras
                </div>
              </div>
            )}
            </>
          )}
        </div>
      </div>

      {/* Camera Info Popup */}
      {showCameraInfoPopup && selectedCameraForInfo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => {
          setShowCameraInfoPopup(false);
          setSelectedCameraForInfo(null);
        }}>
          <div className="bg-slate-900 rounded-xl w-full max-w-3xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 sticky top-0 bg-slate-900">
              <h3 className="text-xl font-semibold text-white">Camera Information: {selectedCameraForInfo.name}</h3>
              <button
                onClick={() => {
                  setShowCameraInfoPopup(false);
                  setSelectedCameraForInfo(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-4">Basic Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-slate-400 text-sm">Camera ID:</span>
                    <p className="text-white font-mono text-sm mt-1">{selectedCameraForInfo.id}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Name:</span>
                    <p className="text-white mt-1">{selectedCameraForInfo.name || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Location:</span>
                    <p className="text-white mt-1">{selectedCameraForInfo.location || selectedCameraForInfo.zone || 'N/A'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Status:</span>
                    <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedCameraForInfo.status === 'online' ? 'bg-green-500/20 text-green-400' :
                      selectedCameraForInfo.status === 'offline' ? 'bg-red-500/20 text-red-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {selectedCameraForInfo.status || 'unknown'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">AI Detection:</span>
                    <p className={`mt-1 inline-block px-2 py-1 rounded text-xs font-medium ${
                      selectedCameraForInfo.aiEnabled ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {selectedCameraForInfo.aiEnabled ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Recent Violations (24h):</span>
                    <p className="text-white mt-1">{selectedCameraForInfo.recentViolations || 0}</p>
                  </div>
                </div>
              </div>

              {/* Stream URLs */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-4">Stream Configuration</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-slate-400 text-sm">HLS URL:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.hlsUrl || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">Stream URL:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.streamUrl || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">MediaMTX Path:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.mediamtxPath || 'Not configured'}
                    </p>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">RTSP Path:</span>
                    <p className="text-white font-mono text-xs mt-1 break-all bg-slate-900/50 p-2 rounded">
                      {selectedCameraForInfo.rtspPath || 'Not configured'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Additional Metadata */}
              <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <h4 className="text-lg font-semibold text-white mb-4">Additional Information</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Uptime (24h):</span>
                    <span className="text-white">{selectedCameraForInfo.uptime24h || 'N/A'}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Recording:</span>
                    <span className={`${selectedCameraForInfo.recording ? 'text-green-400' : 'text-gray-400'}`}>
                      {selectedCameraForInfo.recording ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Raw Data (for debugging) */}
              <details className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                <summary className="text-lg font-semibold text-white cursor-pointer">Raw Camera Data (Debug)</summary>
                <pre className="mt-4 text-xs text-slate-300 bg-slate-900/50 p-4 rounded overflow-auto max-h-64">
                  {JSON.stringify(selectedCameraForInfo, null, 2)}
                </pre>
              </details>
            </div>

            <div className="px-6 py-4 border-t border-slate-700 flex justify-between items-center">
              <button
                onClick={() => {
                  setCameraToDelete(selectedCameraForInfo);
                  setShowDeleteConfirm(true);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete Camera
              </button>
              <button
                onClick={() => {
                  setShowCameraInfoPopup(false);
                  setSelectedCameraForInfo(null);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Feed Modal */}
      {showLiveFeedModal && selectedCameraForLive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-xl w-full max-w-5xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-white">{selectedCameraForLive.name}</h3>
                <p className="text-sm text-slate-400">{selectedCameraForLive.zone || 'Unspecified'}</p>
              </div>
              <button
                onClick={() => {
                  setShowLiveFeedModal(false);
                  setSelectedCameraForLive(null);
                  // Don't stop the stream - let it continue in background
                  // setCurrentLiveHlsUrl(null);
                }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="aspect-video bg-black relative">
              {currentLiveLoading ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
                  <p className="text-white font-medium mb-2">Starting Stream...</p>
                  <p className="text-slate-400 text-sm">This may take a few moments for RTSP conversion.</p>
                </div>
              ) : currentLiveError ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-white font-medium mb-2">Stream Error</p>
                  <p className="text-slate-400 text-sm">{currentLiveError}</p>
                </div>
              ) : currentLiveHlsUrl ? (
                <CameraStreamViewer
                  hlsUrl={currentLiveHlsUrl}
                  cameraId={selectedCameraForLive?.id}
                  autoPlay
                  controls
                  className="w-full h-full object-contain"
                  checkStatus={true}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <Camera className="w-20 h-20 text-slate-700 mb-4" />
                  <p className="text-white font-medium mb-2">No Stream Available</p>
                  <p className="text-slate-400 text-sm">This camera does not have a configured stream URL or it's not yet converted.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Debug Camera Data Modal */}
      <Modal
        isOpen={showDebugModal}
        onClose={() => {
          setShowDebugModal(false);
          setRawCameraData(null);
        }}
        title="Camera Debug Information"
        maxWidth="900px"
      >
        {rawCameraData ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-900 rounded border border-slate-700">
              <h4 className="text-sm font-semibold text-white mb-2">Debug Info</h4>
              <div className="text-xs text-slate-400 space-y-1">
                <p><strong>Selected Site ID:</strong> {rawCameraData.selectedSiteId || 'None'}</p>
                <p><strong>Cameras in State:</strong> {rawCameraData.camerasInState?.length || 0}</p>
                <p><strong>Timestamp:</strong> {rawCameraData.timestamp}</p>
                {rawCameraData.error && (
                  <p className="text-red-400"><strong>Error:</strong> {rawCameraData.error}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-slate-900 rounded border border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">API Response</h4>
                <pre className="text-xs text-slate-300 overflow-auto max-h-96 p-3 bg-slate-950 rounded border border-slate-800">
                  {JSON.stringify(rawCameraData.apiResponse, null, 2)}
                </pre>
              </div>

              <div className="p-3 bg-slate-900 rounded border border-slate-700">
                <h4 className="text-sm font-semibold text-white mb-2">Cameras in Component State</h4>
                <pre className="text-xs text-slate-300 overflow-auto max-h-96 p-3 bg-slate-950 rounded border border-slate-800">
                  {JSON.stringify(rawCameraData.camerasInState, null, 2)}
                </pre>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(rawCameraData, null, 2));
                  alert('Debug data copied to clipboard!');
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded transition-colors"
              >
                Copy All Data
              </button>
              <button
                onClick={() => {
                  setShowDebugModal(false);
                  setRawCameraData(null);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading camera debug data...</p>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && cameraToDelete && (
        <Modal
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (!deleting) {
              setShowDeleteConfirm(false);
              setCameraToDelete(null);
            }
          }}
          title="Delete Camera"
          maxWidth="500px"
        >
          <div className="space-y-4">
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-white font-medium mb-2">
                Are you sure you want to delete this camera?
              </p>
              <p className="text-slate-300 text-sm mb-2">
                This will permanently stop the live stream and remove all configuration.
              </p>
              <p className="text-slate-400 text-sm font-mono">
                Camera: {cameraToDelete.name} ({cameraToDelete.id})
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setCameraToDelete(null);
                }}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCamera}
                disabled={deleting}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Add Camera Modal */}
      {selectedSite && (
        <AddCameraModal
          isOpen={showAddCameraModal}
          onClose={() => setShowAddCameraModal(false)}
          worksiteId={selectedSite.id}
          worksiteName={selectedSite.name}
          onSuccess={() => {
            // Refresh camera list after successful creation
            fetchCameras();
          }}
        />
      )}
    </div>
  );
}

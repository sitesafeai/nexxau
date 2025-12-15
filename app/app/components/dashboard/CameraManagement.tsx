"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import CameraFeed from '../CameraFeed';

interface Camera {
  id: string;
  name: string;
  siteId: string;
  siteName: string;
  status: 'online' | 'offline' | 'maintenance';
  aiDetectionEnabled: boolean;
  violations: number;
  detections: number;
  lastActivity: string;
  streamUrl?: string;
  hlsUrl?: string;
}

interface CameraManagementProps {
  currentUser: any;
  siteFilter?: string;
}

export default function CameraManagement({ currentUser, siteFilter }: CameraManagementProps) {
  const router = useRouter();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [sites, setSites] = useState<{id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  // Removed selectedSite state - always use siteFilter prop (worksite-specific)
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline' | 'maintenance'>('all');
  const [aiFilter, setAiFilter] = useState<'all' | 'on' | 'off'>('all');

  // Modals
  const [showLiveFeed, setShowLiveFeed] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showTestAI, setShowTestAI] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('[CameraManagement] Fetching cameras for worksite:', siteFilter);
      
      // Only fetch cameras for the specific worksite (no dropdown needed)
      const cameraUrl = siteFilter ? `/api/cameras?worksiteId=${siteFilter}` : '/api/cameras';
      const camerasRes = await fetch(cameraUrl, { cache: 'no-store' });

      if (camerasRes.ok) {
        const data = await camerasRes.json();
        console.log('[CameraManagement] Cameras API response:', data);
        
        const rawCameras = data.success ? (data.data || []) : (data.data || data || []);
        console.log('[CameraManagement] Raw cameras array:', rawCameras.length, 'cameras');
        
        // Helper function to get the best available stream URL
        const getStreamUrl = (cam: any): string | null => {
          // Priority: hlsUrl > mediamtxPath (generate HLS) > streamUrl > rtspPath (generate HLS)
          if (cam.hlsUrl) {
            console.log(`[CameraManagement] Camera ${cam.id} using hlsUrl:`, cam.hlsUrl);
            return cam.hlsUrl;
          }
          
          // If mediamtxPath exists, generate HLS URL
          if (cam.mediamtxPath) {
            const hlsUrl = `http://localhost:8888/live/${cam.mediamtxPath}/index.m3u8`;
            console.log(`[CameraManagement] Camera ${cam.id} generating HLS from mediamtxPath:`, hlsUrl);
            return hlsUrl;
          }
          
          // Use streamUrl if it's an HLS URL or HTTP URL
          if (cam.streamUrl) {
            if (cam.streamUrl.includes('.m3u8') || cam.streamUrl.startsWith('http')) {
              console.log(`[CameraManagement] Camera ${cam.id} using streamUrl (HLS/HTTP):`, cam.streamUrl);
              return cam.streamUrl;
            }
            // If it's RTSP, try to generate HLS URL from camera ID
            if (cam.streamUrl.startsWith('rtsp://')) {
              const hlsUrl = `http://localhost:8888/live/camera-${cam.id}/index.m3u8`;
              console.log(`[CameraManagement] Camera ${cam.id} has RTSP, trying generated HLS:`, hlsUrl);
              return hlsUrl;
            }
          }
          
          // If rtspPath exists, try to generate HLS URL (assuming MediaMTX naming convention)
          if (cam.rtspPath) {
            // Try common MediaMTX path patterns
            const pathName = cam.rtspPath.replace(/^\//, '').replace(/\/$/, '') || `camera-${cam.id}`;
            const hlsUrl = `http://localhost:8888/live/${pathName}/index.m3u8`;
            console.log(`[CameraManagement] Camera ${cam.id} generating HLS from rtspPath:`, hlsUrl);
            return hlsUrl;
          }
          
          console.log(`[CameraManagement] Camera ${cam.id} has no stream URL available. Available fields:`, {
            hlsUrl: cam.hlsUrl,
            streamUrl: cam.streamUrl,
            mediamtxPath: cam.mediamtxPath,
            rtspPath: cam.rtspPath
          });
          return null;
        };

        // Map API response to expected Camera interface
        const mappedCameras = rawCameras.map((cam: any) => {
          const streamUrl = getStreamUrl(cam);
          return {
            id: cam.id,
            name: cam.name,
            siteId: cam.worksiteId || cam.siteId || '',
            siteName: cam.worksite?.name || cam.siteName || 'Unknown Site',
            status: (cam.status || 'offline').toLowerCase() === 'active' ? 'online' : (cam.status || 'offline').toLowerCase(),
            aiDetectionEnabled: cam.aiEnabled ?? cam.aiDetectionEnabled ?? true,
            violations: cam.violationCount ?? cam.violations ?? 0,
            detections: cam.detectionCount ?? cam.detections ?? 0,
            lastActivity: cam.lastActivity || cam.updatedAt || 'N/A',
            streamUrl: streamUrl || cam.streamUrl || null,
            hlsUrl: streamUrl || cam.hlsUrl || null,
          };
        });
        
        console.log('[CameraManagement] Mapped cameras:', mappedCameras.length, 'cameras');
        console.log('[CameraManagement] Sample camera data:', mappedCameras[0] ? {
          id: mappedCameras[0].id,
          name: mappedCameras[0].name,
          hasStreamUrl: !!mappedCameras[0].streamUrl,
          hasHlsUrl: !!mappedCameras[0].hlsUrl,
          streamUrl: mappedCameras[0].streamUrl,
          hlsUrl: mappedCameras[0].hlsUrl
        } : 'No cameras');
        setCameras(mappedCameras);
      } else {
        const errorText = await camerasRes.text();
        console.error('[CameraManagement] Cameras API error:', camerasRes.status, errorText);
        setCameras([]);
      }
    } catch (error) {
      console.error('[CameraManagement] Error fetching cameras:', error);
      setCameras([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCameras = useMemo(() => {
    let result = [...cameras];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(cam =>
        cam.name.toLowerCase().includes(query) ||
        cam.siteName.toLowerCase().includes(query)
      );
    }

    // No site filtering - already filtered by API based on siteFilter prop

    if (statusFilter !== 'all') {
      result = result.filter(cam => cam.status === statusFilter);
    }

    if (aiFilter !== 'all') {
      result = result.filter(cam => aiFilter === 'on' ? cam.aiDetectionEnabled : !cam.aiDetectionEnabled);
    }

    return result;
  }, [cameras, searchQuery, statusFilter, aiFilter]);

  const stats = useMemo(() => ({
    total: cameras.length,
    online: cameras.filter(c => c.status === 'online').length,
    offline: cameras.filter(c => c.status === 'offline').length,
    aiEnabled: cameras.filter(c => c.aiDetectionEnabled).length
  }), [cameras]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'offline':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'maintenance':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const handleViewLiveFeed = (camera: Camera) => {
    setSelectedCamera(camera);
    setShowLiveFeed(true);
  };

  const handleConfigure = (camera: Camera) => {
    setSelectedCamera(camera);
    setShowConfigModal(true);
  };

  const handleTestAI = async (camera: Camera) => {
    setSelectedCamera(camera);
    setShowTestAI(true);
  };

  const handleToggleAI = async (camera: Camera) => {
    try {
      await fetch(`/api/cameras/${camera.id}/ai-detection`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !camera.aiDetectionEnabled })
      });
      fetchData();
    } catch (error) {
      console.error('Error toggling AI:', error);
    }
  };

  const handleSaveConfiguration = async (formData: any) => {
    if (!selectedCamera) return;
    
    try {
      console.log('[CameraManagement] Saving camera config:', selectedCamera.id, formData);
      
      const response = await fetch(`/api/cameras/${selectedCamera.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        setShowConfigModal(false);
        fetchData(); // Refresh camera list
        alert('Camera configuration saved successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('[CameraManagement] Error saving configuration:', error);
      alert('Error saving camera configuration');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-slate-800/50 rounded-xl p-4 animate-pulse">
              <div className="w-16 h-8 bg-slate-700 rounded mb-2" />
              <div className="w-24 h-4 bg-slate-700 rounded" />
            </div>
          ))}
        </div>
        <div className="bg-slate-800/50 rounded-xl p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-4 animate-pulse">
              <div className="w-12 h-12 bg-slate-700 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="w-1/3 h-4 bg-slate-700 rounded" />
                <div className="w-1/4 h-3 bg-slate-700 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Camera Management</h1>
          <p className="text-sm text-slate-400 mt-1">Monitor and configure cameras across all sites</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
          <p className="text-2xl font-bold text-white">{stats.total}</p>
          <p className="text-sm text-slate-400">Total Cameras</p>
        </div>
        <div className="bg-slate-800/30 rounded-xl p-4 border border-emerald-500/20">
          <p className="text-2xl font-bold text-emerald-400">{stats.online}</p>
          <p className="text-sm text-slate-400">Online</p>
        </div>
        <div className="bg-slate-800/30 rounded-xl p-4 border border-red-500/20">
          <p className="text-2xl font-bold text-red-400">{stats.offline}</p>
          <p className="text-sm text-slate-400">Offline</p>
        </div>
        <div className="bg-slate-800/30 rounded-xl p-4 border border-blue-500/20">
          <p className="text-2xl font-bold text-blue-400">{stats.aiEnabled}</p>
          <p className="text-sm text-slate-400">AI Enabled</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cameras..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Site dropdown removed - worksite is always specific from URL parameter */}

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All Status</option>
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>

            <select
              value={aiFilter}
              onChange={(e) => setAiFilter(e.target.value as any)}
              className="px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="all">All AI Status</option>
              <option value="on">AI On</option>
              <option value="off">AI Off</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cameras Table */}
      <div className="bg-slate-800/30 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-400 uppercase tracking-wider bg-slate-800/50">
                <th className="px-4 py-3 text-left font-medium">Camera</th>
                <th className="px-4 py-3 text-left font-medium">Site</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">AI Detection</th>
                <th className="px-4 py-3 text-left font-medium">Violations</th>
                <th className="px-4 py-3 text-left font-medium">Detections</th>
                <th className="px-4 py-3 text-left font-medium">Last Activity</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/30">
              {filteredCameras.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <svg className="w-12 h-12 text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <p className="text-slate-400 font-medium">No cameras found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCameras.map((camera) => (
                  <tr key={camera.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-4 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center overflow-hidden">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          <div className={`absolute top-1 right-1 w-2 h-2 rounded-full ${camera.status === 'online' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        </div>
                        <span className="text-sm font-medium text-white">{camera.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300">{camera.siteName}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(camera.status)}`}>
                        {camera.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleToggleAI(camera)}
                        className={`px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                          camera.aiDetectionEnabled
                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
                            : 'bg-slate-500/20 text-slate-400 hover:bg-slate-500/30'
                        }`}
                      >
                        {camera.aiDetectionEnabled ? 'ON' : 'OFF'}
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`text-sm font-medium ${camera.violations > 0 ? 'text-red-400' : 'text-slate-400'}`}>
                        {camera.violations}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-300">{camera.detections}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-400">{camera.lastActivity}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center justify-end space-x-1">
                        <button
                          onClick={() => handleViewLiveFeed(camera)}
                          className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                          title="View Live Feed"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleConfigure(camera)}
                          className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                          title="Configure Camera"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleTestAI(camera)}
                          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                          title="Test AI Detection"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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

      {/* Live Feed Modal */}
      {showLiveFeed && selectedCamera && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-xl w-full max-w-5xl border border-slate-700 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedCamera.name}</h3>
                  <p className="text-sm text-slate-400">{selectedCamera.siteName}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full border ${getStatusBadge(selectedCamera.status)}`}>
                  {selectedCamera.status}
                </span>
                {selectedCamera.aiDetectionEnabled && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    AI Active
                  </span>
                )}
                <button
                  onClick={() => setShowLiveFeed(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Video Container */}
            <div className="aspect-video bg-black relative">
              {(selectedCamera.hlsUrl || selectedCamera.streamUrl) ? (
                <div className="relative w-full h-full">
                  <CameraFeed
                    streamUrl={selectedCamera.hlsUrl || selectedCamera.streamUrl || ''}
                    cameraId={selectedCamera.id}
                    autoPlay={true}
                    enableDetection={selectedCamera.aiDetectionEnabled}
                    className="w-full h-full"
                  />
                  
                  {/* Live indicator overlay */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600 rounded text-white text-xs font-bold z-10">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                  
                  {/* Stream info overlay */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded text-xs text-white z-10">
                    <p className="font-mono">Stream: {selectedCamera.hlsUrl ? 'HLS' : selectedCamera.streamUrl?.startsWith('rtsp://') ? 'RTSP' : 'HTTP'}</p>
                    {selectedCamera.hlsUrl && (
                      <p className="text-green-400 mt-1">✓ Browser-compatible format</p>
                    )}
                    {selectedCamera.streamUrl?.startsWith('rtsp://') && (
                      <p className="text-yellow-400 mt-1">⚠ Transcoding required</p>
                    )}
                  </div>
                </div>
              ) : (
                /* No stream URL available */
                <div className="flex flex-col items-center justify-center h-full text-center p-8">
                  <svg className="w-20 h-20 text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <p className="text-white font-medium mb-2">No Stream Available</p>
                  <p className="text-slate-400 text-sm mb-4">This camera does not have a configured stream URL.</p>
                  <div className="space-y-2 max-w-md">
                    <p className="text-xs text-slate-500">Camera ID: <span className="font-mono">{selectedCamera.id}</span></p>
                    <p className="text-xs text-slate-500">Please configure a valid HLS or RTSP stream URL for this camera.</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowLiveFeed(false);
                      handleConfigure(selectedCamera);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Configure Stream
                  </button>
                </div>
              )}
            </div>
            
            {/* Debug Info */}
            <div className="px-6 py-3 border-t border-slate-700 bg-slate-900/50">
              <details className="text-xs">
                <summary className="cursor-pointer text-slate-400 hover:text-white">Debug Info</summary>
                <div className="mt-2 space-y-1 font-mono text-slate-500">
                  <p>Camera ID: {selectedCamera.id}</p>
                  <p>Stream URL: {selectedCamera.streamUrl || 'None'}</p>
                  <p>HLS URL: {selectedCamera.hlsUrl || 'None'}</p>
                  <p>Status: {selectedCamera.status}</p>
                </div>
              </details>
            </div>
            
            {/* Footer with camera info */}
            <div className="px-6 py-4 border-t border-slate-700 grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs uppercase">Violations (24h)</p>
                <p className={`font-semibold ${selectedCamera.violations > 0 ? 'text-red-400' : 'text-slate-300'}`}>
                  {selectedCamera.violations}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase">Detections</p>
                <p className="font-semibold text-slate-300">{selectedCamera.detections}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs uppercase">Last Activity</p>
                <p className="font-semibold text-slate-300">{selectedCamera.lastActivity}</p>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => handleTestAI(selectedCamera)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium rounded transition-colors"
                >
                  Test AI
                </button>
                <button
                  onClick={() => {
                    setShowLiveFeed(false);
                    handleConfigure(selectedCamera);
                  }}
                  className="px-3 py-1.5 border border-slate-600 hover:bg-slate-700 text-slate-300 text-xs font-medium rounded transition-colors"
                >
                  Configure
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Configure Camera Modal */}
      {showConfigModal && selectedCamera && (
        <ConfigureCameraModal
          camera={selectedCamera}
          onClose={() => setShowConfigModal(false)}
          onSave={handleSaveConfiguration}
          onToggleAI={() => handleToggleAI(selectedCamera)}
        />
      )}

      {/* Test AI Modal */}
      {showTestAI && selectedCamera && (
        <TestAIModal
          camera={selectedCamera}
          onClose={() => setShowTestAI(false)}
        />
      )}
    </div>
  );
}

// Configure Camera Modal Component
function ConfigureCameraModal({ 
  camera, 
  onClose, 
  onSave, 
  onToggleAI 
}: { 
  camera: any; 
  onClose: () => void; 
  onSave: (data: any) => void;
  onToggleAI: () => void;
}) {
  const [formData, setFormData] = useState({
    name: camera.name || '',
    location: camera.location || '',
    hlsUrl: camera.hlsUrl || '',
    streamUrl: camera.streamUrl?.startsWith('rtsp://') ? camera.streamUrl : '',
    status: camera.status || 'online'
  });

  const handleSubmit = () => {
    const updateData: any = {
      name: formData.name,
      location: formData.location,
      status: formData.status
    };

    // Add URLs if they've changed
    if (formData.hlsUrl && formData.hlsUrl !== camera.hlsUrl) {
      updateData.hlsUrl = formData.hlsUrl;
    }
    if (formData.streamUrl && formData.streamUrl !== camera.streamUrl) {
      updateData.streamUrl = formData.streamUrl;
    }

    onSave(updateData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h3 className="text-xl font-semibold text-white">Configure Camera: {camera.name}</h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Camera Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Location / Description</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g., Main Entrance, Zone A, North Building"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Stream URL (HLS)</label>
            <input
              type="text"
              value={formData.hlsUrl}
              onChange={(e) => setFormData({ ...formData, hlsUrl: e.target.value })}
              placeholder="https://example.com/stream.m3u8"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">For HLS streams (.m3u8) - browser compatible</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">RTSP URL (Optional)</label>
            <input
              type="text"
              value={formData.streamUrl}
              onChange={(e) => setFormData({ ...formData, streamUrl: e.target.value })}
              placeholder="rtsp://username:password@192.168.1.100:554/stream"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-slate-500 mt-1">Requires transcoding service like MediaMTX</p>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-white">AI Detection</p>
              <p className="text-xs text-slate-400">Enable real-time object detection</p>
            </div>
            <button
              onClick={onToggleAI}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                camera.aiDetectionEnabled ? 'bg-blue-600' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  camera.aiDetectionEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="online">Online</option>
              <option value="active">Active</option>
              <option value="offline">Offline</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete camera "${camera.name}"?`)) {
                fetch(`/api/cameras/${camera.id}`, { method: 'DELETE' })
                  .then(res => {
                    if (res.ok) {
                      alert('Camera deleted successfully');
                      onClose();
                      window.location.reload();
                    } else {
                      alert('Failed to delete camera');
                    }
                  });
              }
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Delete Camera
          </button>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-600 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Test AI Modal Component
function TestAIModal({ camera, onClose }: { camera: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 rounded-xl w-full max-w-4xl border border-slate-700 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <div>
            <h3 className="text-xl font-semibold text-white">Test AI Detection: {camera.name}</h3>
            <p className="text-sm text-slate-400 mt-1">Real-time object detection preview</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* AI Detection Video Container */}
        <div className="aspect-video bg-black relative">
          {camera.hlsUrl || camera.streamUrl ? (
            <>
              <CameraFeed
                streamUrl={camera.hlsUrl || camera.streamUrl || ''}
                cameraId={camera.id}
                autoPlay={true}
                enableDetection={true}
                className="w-full h-full"
              />
              
              {/* AI Detection indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 bg-purple-600 rounded-lg text-white text-xs font-bold z-10">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                AI DETECTION ACTIVE
              </div>
              
              {/* Instructions */}
              <div className="absolute bottom-4 left-4 right-4 bg-black/80 backdrop-blur-sm rounded-lg p-4 z-10">
                <h4 className="text-white font-semibold mb-2 flex items-center gap-2">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  How it works
                </h4>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Green boxes appear around detected people</li>
                  <li>• Detection runs in real-time using TensorFlow.js</li>
                  <li>• Confidence scores shown for each detection</li>
                  <li>• Use this to test camera positioning and AI accuracy</li>
                </ul>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400">No stream URL configured for this camera</p>
            </div>
          )}
        </div>
        
        <div className="px-6 py-4 border-t border-slate-700 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            <p>Detections will appear as bounding boxes overlaid on the video feed</p>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


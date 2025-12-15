'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import CameraFeed from '@/app/components/CameraFeed';

interface Camera {
  id: string;
  name: string;
  externalId: string | null;
  type: string;
  status: string;
  enabled: boolean;
  streamUrl: string | null;
  hlsUrl: string | null;
  connection: {
    type: string;
    rtspUrl: string;
    webrtcUrl: string;
    hlsUrl: string;
    snapshotUrl: string;
    profile: string;
  } | null;
  metadata: {
    lat: number | null;
    lon: number | null;
    mountHeight: number | null;
    orientation: number | null;
    fov: number | null;
    tags: string[];
    model: string;
    notes: string;
    resolution: string;
    fps: number | null;
    codec: string;
  } | null;
  worksite: {
    id: string;
    name: string;
    worksiteName?: string;
  };
  health?: {
    status: string;
    streamQuality: number;
    frameRate: number;
    resolution: string;
    latency: number;
  }[];
  aiEnabled: boolean;
  retentionDays: number;
  createdAt: string;
  updatedAt: string;
}

interface Alert {
  id: string;
  title: string;
  severity: string;
  status: string;
  detectedAt: string;
  confidence: number;
  ruleId: string;
  rule?: { name: string };
}

interface Detection {
  id: string;
  timestamp: string;
  detections: any[];
  frameData?: string;
}

export default function CameraMonitoringPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const cameraId = params.id as string;
  const worksiteParam = searchParams.get('worksite');

  // State
  const [camera, setCamera] = useState<Camera | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLive, setIsLive] = useState(true);
  const [showOverlays, setShowOverlays] = useState(true);
  const [volume, setVolume] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  
  // UI state
  const [showCreateIncident, setShowCreateIncident] = useState(false);
  const [showClipExport, setShowClipExport] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fetch camera data
  useEffect(() => {
    async function fetchCamera() {
      try {
        setLoading(true);
        const response = await fetch(`/api/cameras/${cameraId}`);
        if (!response.ok) throw new Error('Failed to fetch camera');
        const data = await response.json();
        setCamera(data.data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (cameraId) {
      fetchCamera();
    }
  }, [cameraId]);

  // Fetch alerts for this camera
  useEffect(() => {
    async function fetchAlerts() {
      try {
        const response = await fetch(`/api/alerts?cameraId=${cameraId}&limit=10`);
        if (response.ok) {
          const data = await response.json();
          setAlerts(data.data || []);
        }
      } catch (err) {
        console.error('Failed to fetch alerts:', err);
      }
    }

    if (cameraId) {
      fetchAlerts();
      // Refresh alerts every 30 seconds
      const interval = setInterval(fetchAlerts, 30000);
      return () => clearInterval(interval);
    }
  }, [cameraId]);

  // Get stream URL helper
  const getStreamUrl = useCallback(() => {
    if (!camera) return null;
    
    // Helper function to get the best available stream URL
    if (camera.hlsUrl) return camera.hlsUrl;
    if (camera.connection?.hlsUrl) return camera.connection.hlsUrl;
    if (camera.mediamtxPath) return `http://localhost:8888/live/${camera.mediamtxPath}/index.m3u8`;
    if (camera.streamUrl) {
      if (camera.streamUrl.includes('.m3u8') || camera.streamUrl.startsWith('http')) return camera.streamUrl;
      if (camera.streamUrl.startsWith('rtsp://')) return `http://localhost:8888/live/camera-${camera.id}/index.m3u8`;
    }
    if (camera.rtspPath) {
      const pathName = camera.rtspPath.replace(/^\//, '').replace(/\/$/, '') || `camera-${camera.id}`;
      return `http://localhost:8888/live/${pathName}/index.m3u8`;
    }
    return null;
  }, [camera]);

  // Handle video play/pause state from CameraFeed
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, []);

  // Toggle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play().catch(err => console.log('Play failed:', err));
    } else {
      video.pause();
    }
  };

  const handleSnapshot = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      
      // Download snapshot
      const link = document.createElement('a');
      link.download = `snapshot_${camera?.name}_${new Date().toISOString()}.jpg`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      const response = await fetch(`/api/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: 'Acknowledged from camera monitoring' }),
      });
      if (response.ok) {
        setAlerts(prev => prev.map(a => 
          a.id === alertId ? { ...a, status: 'ACKNOWLEDGED' } : a
        ));
      }
    } catch (err) {
      console.error('Failed to acknowledge alert:', err);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'emergency':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  const getStatusBadge = (status: string) => {
    const isOnline = status === 'online' || status === 'active' || status === 'ONLINE';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
        isOnline ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
      }`}>
        <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
        {isOnline ? 'Online' : 'Offline'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 animate-spin text-blue-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-300">Loading camera...</span>
        </div>
      </div>
    );
  }

  if (error || !camera) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">Camera Not Found</h2>
          <p className="text-slate-400 mb-4">{error || 'Unable to load camera'}</p>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Top Bar */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard?worksite=${worksiteParam || camera.worksite.id}&tab=cameras`)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl font-bold text-white">{camera.name}</h1>
                {getStatusBadge(camera.status)}
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                {camera.worksite.name} • Last updated: {new Date(camera.updatedAt).toLocaleString()}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleSnapshot}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Snapshot
            </button>
            <button
              onClick={() => setShowClipExport(true)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Export Clip
            </button>
            <button
              onClick={() => setShowCreateIncident(true)}
              className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Create Incident
            </button>
            <button
              onClick={() => router.push(`/dashboard/camera/${cameraId}/edit?worksite=${worksiteParam}`)}
              className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Video Player - 8 columns */}
          <div className="col-span-8 space-y-4">
            {/* Video Container */}
            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
              <div className="relative aspect-video bg-black">
                {getStreamUrl() ? (
                  <CameraFeed
                    ref={videoRef}
                    streamUrl={getStreamUrl() || ''}
                    cameraId={camera.id}
                    autoPlay={true}
                    enableDetection={camera.aiEnabled && showOverlays}
                    className="w-full h-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <svg className="w-20 h-20 text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white font-medium mb-2">No Stream Available</p>
                    <p className="text-slate-400 text-sm mb-4">This camera does not have a configured stream URL.</p>
                  </div>
                )}
                
                {/* Live Badge */}
                {isLive && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1 bg-red-600 rounded text-white text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    LIVE
                  </div>
                )}

                {/* Overlay Toggle */}
                <button
                  onClick={() => setShowOverlays(!showOverlays)}
                  className={`absolute top-4 right-4 px-3 py-1 rounded text-xs font-medium transition-colors ${
                    showOverlays ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  AI Overlays {showOverlays ? 'ON' : 'OFF'}
                </button>

                {/* Stream unavailable overlay */}
                {!camera.streamUrl && !camera.hlsUrl && !camera.connection?.hlsUrl && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
                    <svg className="w-20 h-20 text-slate-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-white font-medium mb-2">Stream Not Available</p>
                    <p className="text-slate-400 text-sm mb-4">Configure stream URL to view live feed</p>
                    <button
                      onClick={() => router.push(`/dashboard/camera/${cameraId}/edit?worksite=${worksiteParam}`)}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                    >
                      Configure Stream
                    </button>
                  </div>
                )}
              </div>

              {/* Video Controls */}
              <div className="px-4 py-3 border-t border-slate-700 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    {isPlaying ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    )}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setVolume(volume === 0 ? 1 : 0)}
                      className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                      {volume === 0 ? (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                      )}
                    </button>
                  </div>

                  <div className="text-xs text-slate-400">
                    {new Date().toLocaleTimeString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsLive(true)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      isLive ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Live
                  </button>
                  <button
                    onClick={() => setIsLive(false)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      !isLive ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    Playback
                  </button>
                </div>
              </div>
            </div>

            {/* Camera Info Cards */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase mb-1">Resolution</p>
                <p className="text-lg font-semibold text-white">
                  {camera.metadata?.resolution || camera.health?.[0]?.resolution || '1920x1080'}
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase mb-1">Frame Rate</p>
                <p className="text-lg font-semibold text-white">
                  {camera.metadata?.fps || camera.health?.[0]?.frameRate || 30} FPS
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase mb-1">AI Detection</p>
                <p className={`text-lg font-semibold ${camera.aiEnabled ? 'text-green-400' : 'text-slate-400'}`}>
                  {camera.aiEnabled ? 'Enabled' : 'Disabled'}
                </p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <p className="text-xs text-slate-500 uppercase mb-1">Retention</p>
                <p className="text-lg font-semibold text-white">{camera.retentionDays} days</p>
              </div>
            </div>
          </div>

          {/* Right Panel - 4 columns */}
          <div className="col-span-4 space-y-4">
            {/* Active Alerts */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="px-4 py-3 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Active Alerts</h3>
                  <span className="text-xs text-slate-400">{alerts.length} total</span>
                </div>
              </div>
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {alerts.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">No active alerts</p>
                ) : (
                  alerts.map(alert => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)} cursor-pointer hover:bg-opacity-30 transition-colors`}
                      onClick={() => setSelectedAlert(alert)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{alert.title}</p>
                          <p className="text-xs text-slate-400 mt-1">
                            {new Date(alert.detectedAt).toLocaleTimeString()} • {Math.round(alert.confidence * 100)}% conf
                          </p>
                        </div>
                        {alert.status === 'ACTIVE' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAcknowledge(alert.id);
                            }}
                            className="ml-2 px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded transition-colors"
                          >
                            Ack
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Camera Metadata */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">Camera Details</h3>
              </div>
              <div className="p-4 space-y-3 text-sm">
                {camera.externalId && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">External ID</span>
                    <span className="text-white font-mono">{camera.externalId}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Type</span>
                  <span className="text-white">{camera.type || camera.connection?.type || 'RTSP'}</span>
                </div>
                {camera.metadata?.model && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Model</span>
                    <span className="text-white">{camera.metadata.model}</span>
                  </div>
                )}
                {camera.metadata?.mountHeight && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mount Height</span>
                    <span className="text-white">{camera.metadata.mountHeight}m</span>
                  </div>
                )}
                {camera.metadata?.orientation !== null && camera.metadata?.orientation !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Orientation</span>
                    <span className="text-white">{camera.metadata.orientation}°</span>
                  </div>
                )}
                {camera.metadata?.tags && camera.metadata.tags.length > 0 && (
                  <div className="pt-2 border-t border-slate-700">
                    <span className="text-slate-400 text-xs uppercase">Tags</span>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {camera.metadata.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {camera.metadata?.notes && (
                  <div className="pt-2 border-t border-slate-700">
                    <span className="text-slate-400 text-xs uppercase">Notes</span>
                    <p className="text-white text-xs mt-1">{camera.metadata.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="px-4 py-3 border-b border-slate-700">
                <h3 className="text-sm font-semibold text-white">Recent Activity</h3>
              </div>
              <div className="p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-green-400" />
                  <span>Camera online</span>
                  <span className="ml-auto text-xs">2m ago</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                  <span>AI detection ran</span>
                  <span className="ml-auto text-xs">5m ago</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-2 h-2 rounded-full bg-yellow-400" />
                  <span>Alert triggered</span>
                  <span className="ml-auto text-xs">12m ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clip Export Modal */}
      {showClipExport && (
        <ClipExportModal
          camera={camera}
          onClose={() => setShowClipExport(false)}
        />
      )}

      {/* Create Incident Modal */}
      {showCreateIncident && (
        <CreateIncidentModal
          camera={camera}
          onClose={() => setShowCreateIncident(false)}
        />
      )}
    </div>
  );
}

// Clip Export Modal Component
function ClipExportModal({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const [startTime, setStartTime] = useState(-30);
  const [endTime, setEndTime] = useState(0);
  const [includeOverlay, setIncludeOverlay] = useState(true);
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await fetch(`/api/cameras/${camera.id}/clip`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startOffset: startTime,
          endOffset: endTime,
          includeOverlay,
        }),
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle job ID or direct download
        alert('Clip export started. You will be notified when ready.');
        onClose();
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-lg border border-slate-700 shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Export Clip</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Start Time (seconds ago)</label>
            <input
              type="number"
              value={Math.abs(startTime)}
              onChange={e => setStartTime(-Math.abs(parseInt(e.target.value) || 0))}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">End Time (seconds ago, 0 = now)</label>
            <input
              type="number"
              value={endTime}
              onChange={e => setEndTime(parseInt(e.target.value) || 0)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
            />
          </div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={includeOverlay}
              onChange={e => setIncludeOverlay(e.target.checked)}
              className="rounded border-slate-600 bg-slate-800 text-blue-600"
            />
            <span className="text-sm text-slate-300">Include AI detection overlay</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
          >
            {exporting ? 'Exporting...' : 'Export Clip'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Create Incident Modal Component
function CreateIncidentModal({ camera, onClose }: { camera: Camera; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
    
    setCreating(true);
    try {
      const response = await fetch('/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          severity,
          cameraId: camera.id,
          worksiteId: camera.worksite.id,
          detectedAt: new Date().toISOString(),
        }),
      });
      
      if (response.ok) {
        alert('Incident created successfully.');
        onClose();
      }
    } catch (err) {
      console.error('Failed to create incident:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 rounded-lg border border-slate-700 shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-white mb-4">Create Incident</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Brief incident description"
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Severity</label>
            <select
              value={severity}
              onChange={e => setSeverity(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Detailed description of the incident..."
              rows={4}
              className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white placeholder-slate-500 resize-none"
            />
          </div>
          <div className="text-sm text-slate-400">
            Camera: {camera.name} • {camera.worksite.name}
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={creating || !title.trim()}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 text-white rounded-lg transition-colors"
          >
            {creating ? 'Creating...' : 'Create Incident'}
          </button>
        </div>
      </div>
    </div>
  );
}


/**
 * CameraTile - Individual camera display component
 * 
 * Responsibilities:
 * - Own exactly ONE <video> element
 * - Attach/detach stream via useCameraManager
 * - Reflect camera state visually
 * - Zero WebRTC logic
 * 
 * Constraints:
 * - No timers
 * - No retries
 * - No subscriptions
 * - All side effects in useEffect
 */

'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useYOLOCamera } from '@/app/hooks/useYOLOCamera';
import { useJanusStream } from '@/app/lib/hooks/useJanusStream';

export interface CameraTileProps {
  camera: {
    id: string;
    name: string;
    janusFeedId: number | null;
    rtspUrl: string | null;
    metadata: {
      aiEnabled?: boolean;
      overlayEnabled?: boolean;
      [key: string]: any;
    } | null;
  };
  onToggleOverlay: (cameraId: string, enabled: boolean) => Promise<void>;
  onRemove: (cameraId: string) => void;
  onOpenSettings?: (cameraId: string) => void;
  onOpenFullscreen?: (cameraId: string) => void;
  fullscreen?: boolean; // If true, tile is in fullscreen mode
}

/**
 * CameraTile component
 * 
 * Lifecycle:
 * 1. Mount → create video element → call cameraManager.addCamera()
 * 2. Stream attached → video plays
 * 3. Unmount → call cameraManager.removeCamera() → cleanup video
 */
const CameraTile: React.FC<CameraTileProps> = React.memo(({
  camera,
  onToggleOverlay,
  onRemove,
  onOpenSettings,
  onOpenFullscreen,
  fullscreen = false
}) => {
  const { id, name, janusFeedId, metadata } = camera;
  
  // Video element ref (owned by this component)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Canvas overlay ref for YOLO detections
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  
  const overlayEnabled = metadata?.overlayEnabled ?? true;
  const aiEnabled = metadata?.aiEnabled ?? false;

  const [lastFrameAt, setLastFrameAt] = useState<Date | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const wentLiveAtRef = useRef<number | null>(null);
  
  const {
    streamState,
    stream,
    error
  } = useJanusStream({ cameraId: id });
  
  const status = streamState === 'loading'
    ? 'connecting'
    : streamState === 'live'
      ? 'live'
      : streamState === 'error'
        ? 'failed'
        : streamState === 'offline'
          ? 'offline'
          : 'offline';
  
  // YOLO detection hook (only active when overlay is on and camera is live)
  const {
    detections
  } = useYOLOCamera(
    id,
    videoRef,
    overlayRef,
    {
      enabled: overlayEnabled && status === 'live',
      feedId: janusFeedId ?? undefined
    }
  );

  const peopleCount = detections.length;
  const detectionSummary = overlayEnabled
    ? peopleCount > 0
      ? `People: ${peopleCount} • Missing: helmet, vest`
      : 'No detections'
    : 'Overlay off';
  
  /**
   * Fullscreen: ensure stream is attached to the fullscreen video element.
   * Runs on mount/stream change and once after a short delay (ref may not be set on first run).
   */
  useEffect(() => {
    if (!fullscreen) return;
    const attach = () => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(console.error);
      }
    };
    attach();
    const t = setTimeout(attach, 150);
    return () => clearTimeout(t);
  }, [fullscreen, stream]);

  /**
   * Bind MediaStream to video element
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }
    
    // Only update srcObject if stream actually changed
    if (stream && video.srcObject !== stream) {
      const videoTracks = stream.getVideoTracks();
      console.log(`[CameraTile ${id}] Attaching stream to video element`, {
        hasVideoTracks: videoTracks.length > 0,
        videoTrackState: videoTracks[0]?.readyState,
        videoTrackEnabled: videoTracks[0]?.enabled,
      });
      
      // Check if stream has active video tracks
      if (videoTracks.length === 0) {
        console.warn(`[CameraTile ${id}] Stream has no video tracks`);
        return;
      }
      
      // DEBUG: Log stream details when attaching
      console.log(`[DEBUG ${id}] Attaching stream with video tracks:`, {
        trackCount: videoTracks.length,
        trackId: videoTracks[0]?.id,
        trackKind: videoTracks[0]?.kind,
        trackEnabled: videoTracks[0]?.enabled,
        trackReadyState: videoTracks[0]?.readyState,
        trackSettings: videoTracks[0]?.getSettings ? videoTracks[0].getSettings() : 'N/A',
      });
      
      video.srcObject = stream;
      wentLiveAtRef.current = Date.now();

      // Wait for video element to be ready, then play
      const playVideo = async () => {
        try {
          // Ensure video is loaded and ready
          if (video.readyState < 2) { // HAVE_CURRENT_DATA
            await new Promise((resolve) => {
              const onLoadedData = () => {
                video.removeEventListener('loadeddata', onLoadedData);
                resolve(undefined);
              };
              video.addEventListener('loadeddata', onLoadedData);
              // Timeout after 2 seconds
              setTimeout(() => {
                video.removeEventListener('loadeddata', onLoadedData);
                resolve(undefined);
              }, 2000);
            });
          }
          
          // Explicitly play the video when stream is attached
          if (video.paused) {
            await video.play();
            console.log(`[CameraTile ${id}] Video playing successfully`);
          } else {
            console.log(`[CameraTile ${id}] Video already playing`);
          }
        } catch (error: any) {
          // Autoplay might be blocked - log but don't fail
          console.warn(`[CameraTile ${id}] Video play() failed:`, error.message || error);
          // Try to play again when user interacts (handled by autoplay attribute)
        }
      };
      
      // Play immediately, and also try again after a short delay
      playVideo();
      setTimeout(() => {
        if (video.paused && video.srcObject === stream) {
          console.log(`[CameraTile ${id}] Retrying video play after delay`);
          video.play().catch(() => {
            // Ignore errors
          });
        }
      }, 500);
    } else if (!stream && video.srcObject) {
      // Only clear srcObject if stream is actually null/removed
      console.log(`[CameraTile ${id}] Clearing video srcObject (stream removed)`);
      video.srcObject = null;
      wentLiveAtRef.current = null;
    }

    const handleTimeUpdate = () => {
      setLastFrameAt(new Date());
      
      // DEBUG: Log when video is actually updating (receiving frames)
      const videoElement = videoRef.current;
      if (videoElement && videoElement.currentTime > 0) {
        // Only log occasionally to avoid spam (every 5 seconds)
        const currentTimeSec = Math.floor(videoElement.currentTime);
        if (currentTimeSec % 5 === 0 && videoElement.currentTime % 1 < 0.1) {
          console.log(`[DEBUG ${id}] Video timeupdate:`, {
            currentTime: videoElement.currentTime.toFixed(2),
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            readyState: videoElement.readyState,
          });
        }
      }
    };

    const handleLoadedData = () => {
      // Try to play when video data is loaded
      if (video.paused && video.srcObject) {
        video.play().catch(() => {
          // Ignore autoplay errors
        });
      }
    };

    const handlePlay = () => {
      console.log(`[CameraTile ${id}] Video started playing`);
      
      // DEBUG: Check if video element is actually receiving frames
      const videoElement = videoRef.current;
      if (videoElement) {
        console.log(`[DEBUG ${id}] Video dimensions:`, {
          videoWidth: videoElement.videoWidth,
          videoHeight: videoElement.videoHeight,
          readyState: videoElement.readyState,
          paused: videoElement.paused,
          currentTime: videoElement.currentTime,
          srcObject: videoElement.srcObject ? 'present' : 'null',
          videoTracks: stream?.getVideoTracks().length || 0,
        });
        
        // Check again after 1 second
        setTimeout(() => {
          console.log(`[DEBUG ${id}] After 1s:`, {
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            currentTime: videoElement.currentTime,
            readyState: videoElement.readyState,
            paused: videoElement.paused,
          });
        }, 1000);
        
        // Check again after 3 seconds
        setTimeout(() => {
          console.log(`[DEBUG ${id}] After 3s:`, {
            videoWidth: videoElement.videoWidth,
            videoHeight: videoElement.videoHeight,
            currentTime: videoElement.currentTime,
            readyState: videoElement.readyState,
          });
        }, 3000);
      }
    };

    const handlePause = () => {
      console.log(`[CameraTile ${id}] Video paused`);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    
    return () => {
      // Only remove event listeners, don't clear srcObject here
      // Let the stream change logic handle srcObject clearing
      if (video) {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadeddata', handleLoadedData);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      }
    };
  }, [stream, id]);

  useEffect(() => {
    if (!lastFrameAt) {
      return;
    }
    const interval = window.setInterval(() => {
      setNowTick(Date.now());
    }, 1000);
    return () => window.clearInterval(interval);
  }, [lastFrameAt]);
  
  /**
   * Handle overlay toggle
   */
  const handleToggleOverlay = useCallback(async () => {
    try {
      await onToggleOverlay(id, !overlayEnabled);
    } catch (error) {
      console.error(`[CameraTile ${id}] Failed to toggle overlay:`, error);
      // Error handling is done by parent
    }
  }, [id, overlayEnabled, onToggleOverlay]);
  
  /**
   * Handle remove
   */
  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);

  /**
   * Handle fix connection (recreate mountpoint)
   */
  const [isFixing, setIsFixing] = useState(false);
  const handleFixConnection = useCallback(async () => {
    setIsFixing(true);
    try {
      const response = await fetch(`/api/cameras/${id}/recreate-mountpoint`, {
        method: 'POST',
      });
      const data = await response.json();
      if (data.success) {
        // Reload the page to refresh camera data
        window.location.reload();
      } else {
        console.error('[CameraTile] Failed to fix connection:', data.error);
        alert(`Failed to fix connection: ${data.error || data.details}`);
      }
    } catch (error: any) {
      console.error('[CameraTile] Error fixing connection:', error);
      alert(`Error fixing connection: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  }, [id]);
  
  // "Live" only means WebRTC is connected; we may not be receiving actual video frames.
  const NO_SIGNAL_THRESHOLD_MS = 8000;
  const NO_SIGNAL_GRACE_MS = 12000; // Don't show "No video signal" for 12s after stream attaches (ramp-up)
  const hasVideoSignal =
    status === 'live' &&
    lastFrameAt != null &&
    nowTick - lastFrameAt.getTime() < NO_SIGNAL_THRESHOLD_MS;
  const pastGracePeriod = wentLiveAtRef.current != null && nowTick - wentLiveAtRef.current > NO_SIGNAL_GRACE_MS;
  const showNoVideoSignalOverlay = status === 'live' && !hasVideoSignal && pastGracePeriod;

  /**
   * Get status badge config
   */
  const getStatusBadge = (): { text: string; className: string } => {
    if (status === 'live' && showNoVideoSignalOverlay) {
      return { text: 'No signal', className: 'bg-amber-600 text-white' };
    }
    switch (status) {
      case 'connecting':
        return { text: 'Connecting...', className: 'bg-blue-500 text-white' };
      case 'live':
        return { text: 'Live', className: 'bg-green-500 text-white' };
      case 'unhealthy':
        return { text: 'Recovering...', className: 'bg-yellow-500 text-white' };
      case 'failed':
        return { text: 'Failed', className: 'bg-red-500 text-white' };
      case 'offline':
      default:
        return { text: 'Offline', className: 'bg-gray-500 text-white' };
    }
  };
  
  const statusBadge = getStatusBadge();
  const lastFrameLabel = lastFrameAt
    ? `${Math.max(0, Math.round((nowTick - lastFrameAt.getTime()) / 1000))}s ago`
    : '—';
  
  return (
    <div className={`relative bg-black overflow-hidden shadow-lg w-full h-full ${fullscreen ? '' : 'rounded-lg'}`}>
      {/* Video container */}
      <div className={`relative w-full h-full bg-black ${fullscreen ? '' : 'aspect-video'}`}>
        {/* Video element (attached via ref) */}
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            className={`w-full h-full ${fullscreen ? 'object-contain' : 'object-cover'}`}
            muted
            autoPlay
            playsInline
            controls={false}
            preload="auto"
            style={{
              backgroundColor: 'black',
              ...(fullscreen ? { width: '100%', height: '100%', objectFit: 'contain' as const } : { objectFit: 'cover' })
            }}
          />
          {/* Canvas overlay for YOLO detections */}
          <canvas
            ref={overlayRef}
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ zIndex: 10 }}
          />
        </div>
        
        {/* No video signal overlay: WebRTC is "live" but no frames received (ingest not sending or wrong port) */}
        {showNoVideoSignalOverlay && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-amber-900/70 gap-3">
            <span className="text-amber-200 font-medium">No video signal</span>
            <p className="text-amber-100/90 text-xs text-center max-w-[220px]">
              Stream is connected but no frames are arriving. The camera ingest may not be sending RTP to this mountpoint, or the RTSP source may be down.
            </p>
            <button
              onClick={handleFixConnection}
              disabled={isFixing}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              {isFixing ? 'Fixing...' : 'Fix connection (recreate stream)'}
            </button>
          </div>
        )}

        {/* Status overlay */}
        {status !== 'live' && (
          <div className={`absolute inset-0 flex items-center justify-center ${
            status === 'connecting' ? 'bg-black bg-opacity-50' :
            status === 'unhealthy' ? 'bg-yellow-900 bg-opacity-50' :
            status === 'failed' ? 'bg-red-900 bg-opacity-50' :
            'bg-gray-900 bg-opacity-50'
          }`}>
            {status === 'connecting' && (
              <div className="flex flex-col items-center gap-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                <span className="text-white text-sm">Connecting...</span>
              </div>
            )}
            {status === 'unhealthy' && (
              <div className="flex flex-col items-center gap-2">
                <div className="text-yellow-300 text-sm">Recovering...</div>
                <button
                  onClick={handleFixConnection}
                  disabled={isFixing}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  {isFixing ? 'Fixing...' : 'Fix Connection'}
                </button>
              </div>
            )}
            {status === 'failed' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-red-300 text-sm">Connection Failed</span>
                {error && (
                  <span className="text-red-400 text-xs">{error}</span>
                )}
                <button
                  onClick={handleFixConnection}
                  disabled={isFixing}
                  className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded transition-colors"
                >
                  {isFixing ? 'Fixing...' : 'Fix Connection'}
                </button>
              </div>
            )}
            {status === 'offline' && (
              <div className="text-gray-400 text-sm">Offline</div>
            )}
          </div>
        )}
        
        {/* Status badge (top-right) */}
        <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-semibold ${statusBadge.className}`}>
          {statusBadge.text}
        </div>

        {/* Detection summary (top-left) */}
        {status === 'live' && (
          <div className="absolute top-2 left-2 px-2 py-1 rounded text-xs font-semibold bg-black/70 text-white">
            {detectionSummary}
          </div>
        )}

        {/* AI badge */}
        {aiEnabled && (
          <div className="absolute top-10 left-2 px-2 py-1 rounded text-[10px] font-semibold bg-blue-600 text-white">
            AI
          </div>
        )}
      </div>
      
      {/* Controls (bottom) - hidden in fullscreen */}
      {!fullscreen && (
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
        <div className="flex items-center justify-between">
          {/* Camera name */}
          <div className="text-white font-medium text-sm truncate flex-1">
            {name}
            <div className="text-[10px] text-slate-300 mt-1">Last frame: {lastFrameLabel}</div>
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2 ml-2">
            {/* Fullscreen button */}
            {onOpenFullscreen && (
              <button
                onClick={() => onOpenFullscreen(id)}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                title="Fullscreen View"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}
            
            {/* Settings/Config button */}
            {onOpenSettings && (
              <button
                onClick={() => onOpenSettings(id)}
                className="p-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                title="Camera Settings"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            )}
            
            {/* Fix Connection button - show when not live */}
            {(status === 'failed' || status === 'unhealthy' || (status === 'connecting' && error)) && (
              <button
                onClick={handleFixConnection}
                disabled={isFixing}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-xs font-medium rounded transition-colors"
                title="Fix Connection"
              >
                {isFixing ? 'Fixing...' : 'Fix'}
              </button>
            )}
            
            {/* Overlay toggle */}
            <button
              onClick={handleToggleOverlay}
              disabled={status === 'offline' || status === 'failed'}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                overlayEnabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={overlayEnabled ? 'Overlay Enabled' : 'Overlay Disabled'}
            >
              Overlay {overlayEnabled ? 'ON' : 'OFF'}
            </button>
            
            {/* Remove button - hidden in fullscreen */}
            {!fullscreen && (
              <button
                onClick={handleRemove}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
                title="Remove Camera"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
});

CameraTile.displayName = 'CameraTile';

export default CameraTile;


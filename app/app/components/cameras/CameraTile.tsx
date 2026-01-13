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

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CameraState, CameraStatus } from '@/app/types/camera';
import { useCameraManager } from '@/app/hooks/useCameraManager';
import { useYOLOCamera } from '@/app/hooks/useYOLOCamera';

export interface CameraTileProps {
  camera: {
    id: string;
    name: string;
    janusFeedId: number | null;
    rtspUrl: string | null;
    metadata: {
      aiEnabled?: boolean;
      [key: string]: any;
    } | null;
  };
  cameraManager: ReturnType<typeof useCameraManager>;
  onToggleAI: (cameraId: string, enabled: boolean) => Promise<void>;
  onRemove: (cameraId: string) => void;
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
  cameraManager,
  onToggleAI,
  onRemove
}) => {
  const { id, name, janusFeedId, rtspUrl, metadata } = camera;
  const { addCamera, removeCamera, getCameraState } = cameraManager;
  
  // Video element ref (owned by this component)
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  
  // Canvas overlay ref for YOLO detections
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  
  // Camera state from manager
  const cameraState = getCameraState(id);
  const status: CameraStatus = cameraState?.status || 'offline';
  const aiEnabled = cameraState?.aiEnabled ?? metadata?.aiEnabled ?? false;
  const error = cameraState?.error || null;
  
  // YOLO detection hook (only active when AI is enabled and camera is live)
  useYOLOCamera(
    id,
    videoRef,
    overlayRef,
    {
      enabled: aiEnabled && status === 'live',
      fps: 5
    }
  );
  
  // Track if camera is registered with manager
  const [isRegistered, setIsRegistered] = useState(false);
  
  /**
   * Create video element on mount
   */
  useEffect(() => {
    if (videoRef.current || videoElement) {
      return; // Already created
    }
    
    // Create video element
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    video.className = 'w-full h-full object-cover';
    video.id = `camera-video-${id}`;
    
    videoRef.current = video;
    setVideoElement(video);
    
    console.log(`[CameraTile ${id}] Video element created`);
  }, [id, videoElement]);
  
  /**
   * Register camera with manager when video element is ready
   */
  useEffect(() => {
    if (!videoElement || !janusFeedId || !rtspUrl || isRegistered || !cameraManager.isInitialized) {
      return;
    }
    
    // Validate janusFeedId
    if (typeof janusFeedId !== 'number' || janusFeedId <= 0) {
      console.warn(`[CameraTile ${id}] Invalid janusFeedId: ${janusFeedId}`);
      return;
    }
    
    console.log(`[CameraTile ${id}] Registering camera with manager`, { janusFeedId });
    
    // Register camera with manager
    addCamera({
      id,
      name,
      janusFeedId,
      rtspUrl,
      aiEnabled: metadata?.aiEnabled ?? false,
      videoElement
    })
      .then(() => {
        setIsRegistered(true);
        console.log(`[CameraTile ${id}] ✅ Camera registered successfully`);
      })
      .catch((error: Error) => {
        console.error(`[CameraTile ${id}] ❌ Failed to register camera:`, error);
        // Error state will be set by manager
      });
    
    // Cleanup on unmount
    return () => {
      if (isRegistered) {
        console.log(`[CameraTile ${id}] Unregistering camera from manager`);
        removeCamera(id);
        setIsRegistered(false);
      }
      
      // Cleanup video element
      if (videoElement) {
        videoElement.srcObject = null;
        videoElement.load();
      }
    };
  }, [videoElement, janusFeedId, rtspUrl, id, name, metadata?.aiEnabled, isRegistered, cameraManager.isInitialized, addCamera, removeCamera]);
  
  /**
   * Handle AI toggle
   */
  const handleToggleAI = useCallback(async () => {
    try {
      await onToggleAI(id, !aiEnabled);
    } catch (error) {
      console.error(`[CameraTile ${id}] Failed to toggle AI:`, error);
      // Error handling is done by parent
    }
  }, [id, aiEnabled, onToggleAI]);
  
  /**
   * Handle remove
   */
  const handleRemove = useCallback(() => {
    onRemove(id);
  }, [id, onRemove]);
  
  /**
   * Get status badge config
   */
  const getStatusBadge = (): { text: string; className: string } => {
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
  
  return (
    <div className="relative bg-black rounded-lg overflow-hidden shadow-lg">
      {/* Video container */}
      <div className="relative w-full aspect-video bg-black">
        {/* Video element (attached via ref) */}
        {videoElement && (
          <div
            ref={(container) => {
              if (container && videoElement && !container.contains(videoElement)) {
                container.appendChild(videoElement);
              }
            }}
            className="w-full h-full relative"
          >
            {/* Canvas overlay for YOLO detections */}
            <canvas
              ref={overlayRef}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10 }}
            />
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
              <div className="text-yellow-300 text-sm">Recovering...</div>
            )}
            {status === 'failed' && (
              <div className="flex flex-col items-center gap-2">
                <span className="text-red-300 text-sm">Connection Failed</span>
                {error && (
                  <span className="text-red-400 text-xs">{error}</span>
                )}
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
      </div>
      
      {/* Controls (bottom) */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-3">
        <div className="flex items-center justify-between">
          {/* Camera name */}
          <div className="text-white font-medium text-sm truncate flex-1">
            {name}
          </div>
          
          {/* Controls */}
          <div className="flex items-center gap-2 ml-2">
            {/* AI toggle */}
            <button
              onClick={handleToggleAI}
              disabled={status === 'offline' || status === 'failed'}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                aiEnabled
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={aiEnabled ? 'AI Enabled' : 'AI Disabled'}
            >
              AI {aiEnabled ? 'ON' : 'OFF'}
            </button>
            
            {/* Remove button */}
            <button
              onClick={handleRemove}
              className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
              title="Remove Camera"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

CameraTile.displayName = 'CameraTile';

export default CameraTile;


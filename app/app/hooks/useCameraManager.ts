/**
 * useCameraManager - React hook for managing multi-camera Janus session
 * 
 * Responsibilities:
 * - Own the JanusSessionManager instance (one per worksite)
 * - Track camera states in React state
 * - Expose methods: addCamera, removeCamera, toggleAI
 * - Listen to manager events (health, failure, recovery)
 * 
 * Constraints:
 * - One manager instance (stored in ref)
 * - One subscriber per camera
 * - Clean teardown on unmount
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { JanusSessionManager, CameraSubscriptionConfig } from '@/app/lib/janus/JanusSessionManager';
import { CameraState, CameraStatus } from '@/app/types/camera';

/**
 * Configuration for camera manager
 */
interface UseCameraManagerConfig {
  janusServerUrl: string;
  roomId: number;
  onError?: (error: Error) => void;
}

/**
 * Return type for useCameraManager hook
 */
export interface UseCameraManagerReturn {
  cameras: Map<string, CameraState>;
  isInitialized: boolean;
  addCamera: (config: {
    id: string;
    name: string;
    janusFeedId: number;
    rtspUrl: string;
    aiEnabled?: boolean;
    videoElement: HTMLVideoElement;
  }) => Promise<void>;
  removeCamera: (cameraId: string) => void;
  toggleAI: (cameraId: string, enabled: boolean) => Promise<void>;
  getCameraState: (cameraId: string) => CameraState | undefined;
}

/**
 * Default Janus server URL (fallback)
 */
const DEFAULT_JANUS_URL = process.env.NEXT_PUBLIC_JANUS_SERVER_URL || 'ws://localhost:8088/janus';
const DEFAULT_ROOM_ID = 1234; // TODO: Get from worksite config

/**
 * useCameraManager hook
 * 
 * Manages a single JanusSessionManager instance per worksite
 */
export function useCameraManager(config: UseCameraManagerConfig): UseCameraManagerReturn {
  const { janusServerUrl = DEFAULT_JANUS_URL, roomId = DEFAULT_ROOM_ID, onError } = config;
  
  // Manager instance (stored in ref, created once)
  const managerRef = useRef<JanusSessionManager | null>(null);
  const isInitializedRef = useRef<boolean>(false);
  
  // Camera states (React state)
  const [cameras, setCameras] = useState<Map<string, CameraState>>(new Map());
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  
  /**
   * Initialize manager (once on mount)
   */
  useEffect(() => {
    if (managerRef.current || isInitializedRef.current) {
      return; // Already initialized
    }
    
    console.log('[useCameraManager] Initializing JanusSessionManager', {
      janusServerUrl,
      roomId
    });
    
    const manager = JanusSessionManager.getInstance();
    managerRef.current = manager;
    
    // Initialize session
    manager.initSession(janusServerUrl, roomId)
      .then(() => {
        console.log('[useCameraManager] ✅ Manager initialized');
        isInitializedRef.current = true;
        setIsInitialized(true);
      })
      .catch((error: Error) => {
        console.error('[useCameraManager] ❌ Manager initialization failed:', error);
        onError?.(error);
        managerRef.current = null;
      });
    
    // Cleanup on unmount
    return () => {
      console.log('[useCameraManager] Cleaning up manager');
      if (managerRef.current) {
        managerRef.current.destroySession();
        managerRef.current = null;
      }
      isInitializedRef.current = false;
      setIsInitialized(false);
    };
  }, [janusServerUrl, roomId, onError]);
  
  /**
   * Update camera state
   */
  const updateCameraState = useCallback((cameraId: string, updates: Partial<CameraState>) => {
    setCameras(prev => {
      const next = new Map(prev);
      const current = next.get(cameraId);
      if (current) {
        next.set(cameraId, { ...current, ...updates });
      }
      return next;
    });
  }, []);
  
  /**
   * Derive camera status from manager state
   */
  const getCameraStatus = useCallback((cameraId: string): CameraStatus => {
    const manager = managerRef.current;
    if (!manager || !isInitializedRef.current) {
      return 'offline';
    }
    
    // Check if camera is attached
    const isAttached = manager.isCameraAttached(cameraId);
    const cameraState = cameras.get(cameraId);
    
    if (!cameraState) {
      return 'offline';
    }
    
    // If manager says it's attached, camera is live
    if (isAttached) {
      return 'live';
    }
    
    // Otherwise, use state status
    return cameraState.status;
  }, [cameras]);
  
  /**
   * Add camera
   * 
   * Video element must be provided by the component (CameraTile)
   */
  const addCamera = useCallback(async (config: {
    id: string;
    name: string;
    janusFeedId: number;
    rtspUrl: string;
    aiEnabled?: boolean;
    videoElement: HTMLVideoElement;
  }): Promise<void> => {
    const { id, name, janusFeedId, rtspUrl, aiEnabled = false, videoElement } = config;
    
    if (!managerRef.current || !isInitializedRef.current) {
      throw new Error('Manager not initialized');
    }
    
    // Check if camera already exists
    if (cameras.has(id)) {
      console.warn(`[useCameraManager] Camera ${id} already exists`);
      return;
    }
    
    // Validate janusFeedId
    if (!janusFeedId || janusFeedId <= 0) {
      throw new Error(`Invalid janusFeedId: ${janusFeedId}`);
    }
    
    // Validate video element
    if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
      throw new Error('Invalid video element: must be HTMLVideoElement instance');
    }
    
    console.log(`[useCameraManager] Adding camera ${id}`, { name, janusFeedId });
    
    // Create initial state
    const initialState: CameraState = {
      id,
      name,
      janusFeedId,
      rtspUrl,
      status: 'connecting',
      aiEnabled,
      videoElement,
      error: null
    };
    
    // Add to state
    setCameras(prev => new Map(prev).set(id, initialState));
    
    try {
      // Attach subscriber
      const subscriptionConfig: CameraSubscriptionConfig = {
        cameraId: id,
        janusFeedId,
        videoElement,
        roomId
      };
      
      await managerRef.current.attachSubscriber(subscriptionConfig);
      
      // Update state to live
      updateCameraState(id, {
        status: 'live',
        error: null
      });
      
      console.log(`[useCameraManager] ✅ Camera ${id} added successfully`);
    } catch (error: any) {
      console.error(`[useCameraManager] ❌ Failed to add camera ${id}:`, error);
      
      // Update state to failed
      updateCameraState(id, {
        status: 'failed',
        error: error.message || 'Failed to connect camera'
      });
      
      throw error;
    }
  }, [cameras, updateCameraState, roomId]);
  
  /**
   * Remove camera
   */
  const removeCamera = useCallback((cameraId: string) => {
    const manager = managerRef.current;
    if (!manager) {
      return;
    }
    
    console.log(`[useCameraManager] Removing camera ${cameraId}`);
    
    // Detach from manager
    manager.detachSubscriber(cameraId);
    
    // Remove from state
    setCameras(prev => {
      const next = new Map(prev);
      next.delete(cameraId);
      return next;
    });
    
    console.log(`[useCameraManager] ✅ Camera ${cameraId} removed`);
  }, []);
  
  /**
   * Toggle AI for camera
   */
  const toggleAI = useCallback(async (cameraId: string, enabled: boolean): Promise<void> => {
    const cameraState = cameras.get(cameraId);
    if (!cameraState) {
      throw new Error(`Camera ${cameraId} not found`);
    }
    
    console.log(`[useCameraManager] Toggling AI for camera ${cameraId}: ${enabled}`);
    
    // Update state immediately (optimistic update)
    updateCameraState(cameraId, { aiEnabled: enabled });
    
    try {
      // Call backend API to toggle AI
      const response = await fetch(`/api/cameras/${cameraId}/toggle-ai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to toggle AI');
      }
      
      console.log(`[useCameraManager] ✅ AI toggled for camera ${cameraId}`);
    } catch (error: any) {
      console.error(`[useCameraManager] ❌ Failed to toggle AI for camera ${cameraId}:`, error);
      
      // Revert optimistic update
      updateCameraState(cameraId, { aiEnabled: !enabled });
      
      throw error;
    }
  }, [cameras, updateCameraState]);
  
  /**
   * Get camera state
   */
  const getCameraState = useCallback((cameraId: string): CameraState | undefined => {
    return cameras.get(cameraId);
  }, [cameras]);
  
  // Periodically check camera status from manager
  useEffect(() => {
    if (!isInitializedRef.current || !managerRef.current) {
      return;
    }
    
    const interval = setInterval(() => {
      cameras.forEach((cameraState, cameraId) => {
        const manager = managerRef.current;
        if (!manager) return;
        
        const isAttached = manager.isCameraAttached(cameraId);
        const currentStatus = cameraState.status;
        
        // Update status based on manager state
        if (isAttached && currentStatus !== 'live') {
          updateCameraState(cameraId, { status: 'live', error: null });
        } else if (!isAttached && currentStatus === 'live') {
          // Camera was live but is now disconnected
          updateCameraState(cameraId, { status: 'offline' });
        }
      });
    }, 2000); // Check every 2 seconds
    
    return () => clearInterval(interval);
  }, [cameras, updateCameraState]);
  
  return {
    cameras,
    isInitialized,
    addCamera,
    removeCamera,
    toggleAI,
    getCameraState
  };
}


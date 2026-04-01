/**
 * PHASE 5: React Hook for Camera Store
 * 
 * This hook provides React components with access to camera state.
 * Components read state through this hook.
 * 
 * Constraints:
 * - UI reads state (via this hook)
 * - Services mutate state (via camera-service)
 * - No bidirectional coupling
 */

import { useEffect, useState } from 'react';
import { cameraStore, CameraState } from '@/lib/camera/camera-store';
import { Camera } from '@/lib/camera/types';

/**
 * Hook to access camera store state
 * 
 * Components use this to read camera state.
 * State is mutated by services, not by components.
 */
export function useCameraStore(): CameraState {
  const [state, setState] = useState<CameraState>(cameraStore.getState());

  useEffect(() => {
    // Subscribe to store changes
    const unsubscribe = cameraStore.subscribe(() => {
      setState(cameraStore.getState());
    });

    // Initial state
    setState(cameraStore.getState());

    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook to get a specific camera by ID
 */
export function useCamera(cameraId: string): Camera | undefined {
  const state = useCameraStore();
  return state.cameras.get(cameraId);
}

/**
 * Hook to get all cameras as an array
 */
export function useCameras(): Camera[] {
  const state = useCameraStore();
  return Array.from(state.cameras.values());
}


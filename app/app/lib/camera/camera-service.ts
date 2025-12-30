/**
 * PHASE 5: Camera Service - Business Logic
 * 
 * This service contains all business logic for camera operations.
 * It mutates the camera store state.
 * 
 * Responsibilities:
 * - Test camera connectivity
 * - Update camera status
 * - Handle reconnection logic
 * 
 * Constraints:
 * - Mutates state (cameraStore)
 * - No UI logic
 * - No component dependencies
 */

import { Camera, CameraProtocol, CameraStatus } from './types';
import { cameraStore } from './camera-store';

interface TestCameraResult {
  success: boolean;
  latencyMs: number | null;
  snapshot: string | null;
  error: string | null;
}

/**
 * Test camera connectivity and update status
 */
export async function testCamera(camera: Camera): Promise<TestCameraResult> {
  // Update status to connecting
  cameraStore.updateCameraStatus(camera.id, 'connecting');

  try {
    const response = await fetch('/api/cameras/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamUrl: camera.streamUrl,
        protocol: camera.protocol,
      }),
    });

    const result: TestCameraResult = await response.json();

    // Update camera status based on test result
    if (result.success) {
      cameraStore.updateCameraStatus(camera.id, 'live');
    } else {
      cameraStore.updateCameraStatus(camera.id, 'error');
    }

    return result;
  } catch (error: any) {
    const result: TestCameraResult = {
      success: false,
      latencyMs: null,
      snapshot: null,
      error: error.message || 'Failed to test camera',
    };

    cameraStore.updateCameraStatus(camera.id, 'error');
    return result;
  }
}

/**
 * Resolve camera stream URL
 */
export async function resolveCameraStream(cameraId: string): Promise<string | null> {
  const camera = cameraStore.getCamera(cameraId);
  if (!camera) {
    return null;
  }

  try {
    const response = await fetch(
      `/api/cameras/${cameraId}/stream?streamUrl=${encodeURIComponent(camera.streamUrl)}&protocol=${camera.protocol}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.streamUrl || data.directUrl || null;
  } catch {
    return null;
  }
}

/**
 * Monitor camera status with periodic checks
 * 
 * @param cameraId - Camera ID to monitor
 * @param intervalMs - Check interval in milliseconds
 * @returns Function to stop monitoring
 */
export function monitorCameraStatus(
  cameraId: string,
  intervalMs: number = 30000
): () => void {
  const camera = cameraStore.getCamera(cameraId);
  if (!camera) {
    return () => {}; // No-op if camera doesn't exist
  }

  let isMonitoring = true;

  const checkStatus = async () => {
    if (!isMonitoring) return;

    try {
      const result = await testCamera(camera);
      // Status is updated by testCamera function
    } catch (error) {
      // Error handling is done in testCamera
    }

    if (isMonitoring) {
      setTimeout(checkStatus, intervalMs);
    }
  };

  // Start monitoring
  checkStatus();

  // Return stop function
  return () => {
    isMonitoring = false;
  };
}

/**
 * Add a camera to the store
 */
export function addCamera(camera: Camera): void {
  cameraStore.setCamera(camera);
  // Set initial status to offline until tested
  cameraStore.updateCameraStatus(camera.id, 'offline');
}

/**
 * Remove a camera from the store
 */
export function removeCamera(cameraId: string): void {
  cameraStore.removeCamera(cameraId);
}

/**
 * Update camera information
 */
export function updateCamera(camera: Camera): void {
  cameraStore.setCamera(camera);
}


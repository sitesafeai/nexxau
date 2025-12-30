/**
 * PHASE 5: Camera State Management
 * 
 * This module manages camera state in a centralized way.
 * Services mutate state, UI components read state.
 * 
 * Constraints:
 * - UI reads state
 * - Services mutate state
 * - No bidirectional coupling
 * - No business logic in components
 */

import { Camera, CameraStatus } from './types';

/**
 * Camera state interface
 */
export interface CameraState {
  cameras: Map<string, Camera>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Camera store - simple in-memory state management
 * In a production app, this might use Zustand, Redux, or Context API
 */
class CameraStore {
  private state: CameraState = {
    cameras: new Map(),
    isLoading: false,
    error: null,
  };

  private listeners: Set<() => void> = new Set();

  /**
   * Subscribe to state changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }

  /**
   * Get current state (read-only)
   */
  getState(): CameraState {
    return {
      cameras: new Map(this.state.cameras),
      isLoading: this.state.isLoading,
      error: this.state.error,
    };
  }

  /**
   * Get a specific camera by ID
   */
  getCamera(id: string): Camera | undefined {
    return this.state.cameras.get(id);
  }

  /**
   * Get all cameras as an array
   */
  getCameras(): Camera[] {
    return Array.from(this.state.cameras.values());
  }

  /**
   * Add or update a camera
   */
  setCamera(camera: Camera): void {
    this.state.cameras.set(camera.id, { ...camera });
    this.notify();
  }

  /**
   * Remove a camera
   */
  removeCamera(id: string): void {
    this.state.cameras.delete(id);
    this.notify();
  }

  /**
   * Update camera status
   */
  updateCameraStatus(id: string, status: CameraStatus): void {
    const camera = this.state.cameras.get(id);
    if (camera) {
      this.state.cameras.set(id, { ...camera, status });
      this.notify();
    }
  }

  /**
   * Set loading state
   */
  setLoading(isLoading: boolean): void {
    this.state.isLoading = isLoading;
    this.notify();
  }

  /**
   * Set error state
   */
  setError(error: string | null): void {
    this.state.error = error;
    this.notify();
  }

  /**
   * Clear all cameras
   */
  clear(): void {
    this.state.cameras.clear();
    this.state.error = null;
    this.notify();
  }
}

// Singleton instance
export const cameraStore = new CameraStore();


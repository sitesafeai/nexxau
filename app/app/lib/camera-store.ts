'use client';

import React from 'react';

export interface Camera {
  id: string;
  name: string;
  location: string;
  streamUrl: string;
  streamType: 'hls' | 'rtsp' | 'webrtc' | 'http';
  status: 'online' | 'offline' | 'error' | 'testing';
  description?: string;
  resolution?: string;
  fps?: number;
  addedAt?: string;
  lastActivity?: string;
  minutesSinceActivity?: number;
  worksiteId?: string;
  hasVideo?: boolean;
  alerts?: number;
  detectionCount?: number;
  violationCount?: number;
  features?: {
    aiDetection: boolean;
    nightVision: boolean;
    ptz: boolean;
    audio: boolean;
  };
  worksite?: {
    id: string;
    name: string;
    worksiteName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

// No default demo cameras - all cameras must be created by users
const DEFAULT_CAMERAS: Camera[] = [];

class CameraStore {
  private cameras: Camera[] = [];
  private listeners: Set<() => void> = new Set();
  private loading = false;
  private initialized = false;

  constructor() {
    // Client-side only initialization
    if (typeof window !== 'undefined') {
      this.initializeCameras();
    }
  }

  private async initializeCameras() {
    if (this.initialized) return;
    this.initialized = true;
    
    try {
      // Try to fetch from API (will be filtered by worksite when called with ID)
      await this.fetchCamerasForWorksite();
    } catch (error) {
      console.error('Failed to fetch cameras from API:', error);
      // No fallback - show empty state
      this.cameras = [];
      this.notifyListeners();
    }
  }

  async fetchCamerasForWorksite(worksiteId?: string) {
    this.loading = true;
    try {
      const url = worksiteId 
        ? `/api/cameras?worksiteId=${worksiteId}`
        : '/api/cameras';
      
      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        this.cameras = result.data.map((cam: any) => ({
          id: cam.id,
          name: cam.name,
          location: cam.location,
          streamUrl: cam.streamUrl,
          streamType: cam.streamType,
          status: cam.status,
          resolution: cam.resolution,
          fps: cam.fps,
          lastActivity: cam.lastActivity,
          minutesSinceActivity: cam.minutesSinceActivity,
          detectionCount: cam.detectionCount,
          violationCount: cam.violationCount,
          features: cam.features,
          worksiteId: cam.worksiteId,
          worksite: cam.worksite,
          createdAt: cam.createdAt,
          updatedAt: cam.updatedAt,
          hasVideo: true,
          alerts: cam.violationCount || 0
        }));
        console.log('📹 Loaded', this.cameras.length, 'cameras from API');
      } else {
        // If no cameras in DB, use demo cameras
        this.cameras = DEFAULT_CAMERAS;
        console.log('📹 Using demo cameras (no cameras in database)');
      }
      
      this.notifyListeners();
    } catch (error) {
      console.error('Error fetching cameras from API:', error);
      throw error;
    } finally {
      this.loading = false;
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getCameras(): Camera[] {
    return [...this.cameras];
  }

  getCamera(id: string): Camera | undefined {
    return this.cameras.find(cam => cam.id === id);
  }

  async addCamera(camera: Omit<Camera, 'id' | 'addedAt'>): Promise<Camera | null> {
    try {
      const response = await fetch('/api/cameras', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: camera.name,
          streamUrl: camera.streamUrl,
          location: camera.location,
          type: 'IP Camera',
          worksiteId: camera.worksiteId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create camera');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const newCamera: Camera = {
          id: result.data.id,
          name: result.data.name,
          location: result.data.location,
          streamUrl: result.data.streamUrl,
          streamType: result.data.streamType,
          status: result.data.status,
          resolution: result.data.resolution,
          fps: result.data.fps,
          lastActivity: result.data.lastActivity,
          minutesSinceActivity: result.data.minutesSinceActivity,
          detectionCount: result.data.detectionCount,
          violationCount: result.data.violationCount,
          features: result.data.features,
          worksiteId: result.data.worksiteId,
          worksite: result.data.worksite,
          createdAt: result.data.createdAt,
          updatedAt: result.data.updatedAt,
          hasVideo: true,
          alerts: 0
        };

        this.cameras.push(newCamera);
        this.notifyListeners();
        
        console.log('✅ Added camera to database:', newCamera.name);
        return newCamera;
      }
      
      return null;
    } catch (error) {
      console.error('Error adding camera:', error);
      throw error;
    }
  }

  async updateCamera(id: string, updates: Partial<Camera>): Promise<Camera | null> {
    try {
      const response = await fetch(`/api/cameras/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update camera');
      }

      const result = await response.json();
      
      if (result.success && result.data) {
        const index = this.cameras.findIndex(cam => cam.id === id);
        if (index !== -1) {
          this.cameras[index] = {
            ...this.cameras[index],
            ...result.data
          };
          this.notifyListeners();
          console.log('📝 Updated camera in database:', this.cameras[index].name);
          return this.cameras[index];
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error updating camera:', error);
      throw error;
    }
  }

  async deleteCamera(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/cameras/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete camera');
      }

      const result = await response.json();
      
      if (result.success) {
        const index = this.cameras.findIndex(cam => cam.id === id);
        if (index !== -1) {
          const deletedCamera = this.cameras[index];
          this.cameras.splice(index, 1);
          this.notifyListeners();
          console.log('🗑️ Deleted camera from database:', deletedCamera.name);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error deleting camera:', error);
      throw error;
    }
  }

  async updateCameraHealth(id: string, healthData: {
    status?: 'ONLINE' | 'OFFLINE' | 'ERROR';
    streamQuality?: number;
    frameRate?: number;
    resolution?: string;
    bitrate?: number;
    latency?: number;
    errors?: any;
  }) {
    try {
      const response = await fetch(`/api/cameras/${id}/health`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(healthData)
      });

      if (response.ok) {
        // Refresh camera data to get updated health status
        await this.refreshCamera(id);
      }
    } catch (error) {
      console.error('Error updating camera health:', error);
    }
  }

  async refreshCamera(id: string) {
    try {
      const response = await fetch(`/api/cameras/${id}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          const index = this.cameras.findIndex(cam => cam.id === id);
          if (index !== -1) {
            this.cameras[index] = {
              ...this.cameras[index],
              ...result.data
            };
            this.notifyListeners();
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing camera:', error);
    }
  }

  async refreshCameras(worksiteId?: string) {
    await this.fetchCamerasForWorksite(worksiteId);
  }

  updateCameraStatus(id: string, status: Camera['status']) {
    const camera = this.cameras.find(cam => cam.id === id);
    if (camera) {
      camera.status = status;
      camera.lastActivity = new Date().toISOString();
      camera.minutesSinceActivity = 0;
      this.notifyListeners();
      
      // Update in database asynchronously
      this.updateCameraHealth(id, {
        status: status === 'online' ? 'ONLINE' : status === 'offline' ? 'OFFLINE' : 'ERROR'
      });
    }
  }

  getCamerasByStatus(status: Camera['status']): Camera[] {
    return this.cameras.filter(cam => cam.status === status);
  }

  getOnlineCameras(): Camera[] {
    return this.getCamerasByStatus('online');
  }

  getStats() {
    return {
      total: this.cameras.length,
      online: this.cameras.filter(c => c.status === 'online').length,
      offline: this.cameras.filter(c => c.status === 'offline').length,
      error: this.cameras.filter(c => c.status === 'error').length,
      testing: this.cameras.filter(c => c.status === 'testing').length,
      totalAlerts: this.cameras.reduce((sum, cam) => sum + (cam.alerts || 0), 0)
    };
  }

  isLoading(): boolean {
    return this.loading;
  }
}

// Singleton instance
export const cameraStore = new CameraStore();

// React hook for using camera store
export function useCameraStore(worksiteId?: string) {
  const [cameras, setCameras] = React.useState<Camera[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Load cameras for specific worksite
    const loadCameras = async () => {
      await cameraStore.fetchCamerasForWorksite(worksiteId);
      setCameras(cameraStore.getCameras());
      setLoading(cameraStore.isLoading());
    };
    
    loadCameras();

    // Subscribe to changes
    const unsubscribe = cameraStore.subscribe(() => {
      setCameras(cameraStore.getCameras());
      setLoading(cameraStore.isLoading());
    });

    return unsubscribe;
  }, [worksiteId]);

  return {
    cameras,
    loading,
    addCamera: async (camera: Omit<Camera, 'id' | 'addedAt'>) => {
      try {
        return await cameraStore.addCamera(camera);
      } catch (error) {
        console.error('Failed to add camera:', error);
        throw error;
      }
    },
    updateCamera: async (id: string, updates: Partial<Camera>) => {
      try {
        return await cameraStore.updateCamera(id, updates);
      } catch (error) {
        console.error('Failed to update camera:', error);
        throw error;
      }
    },
    deleteCamera: async (id: string) => {
      try {
        return await cameraStore.deleteCamera(id);
      } catch (error) {
        console.error('Failed to delete camera:', error);
        throw error;
      }
    },
    getCamera: (id: string) => cameraStore.getCamera(id),
    updateStatus: (id: string, status: Camera['status']) => cameraStore.updateCameraStatus(id, status),
    updateHealth: (id: string, healthData: any) => cameraStore.updateCameraHealth(id, healthData),
    refreshCamera: (id: string) => cameraStore.refreshCamera(id),
    refreshCameras: () => cameraStore.refreshCameras(),
    getStats: () => cameraStore.getStats()
  };
}

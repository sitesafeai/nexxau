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
    
    // Don't load cameras on initialization - wait for explicit worksiteId
    // This prevents loading all cameras when no worksite is selected
    console.log('[CameraStore] Initialized - cameras will be loaded when worksiteId is provided');
    this.cameras = [];
    this.loading = false;
    this.notifyListeners();
  }

  async fetchCamerasForWorksite(worksiteId?: string) {
    // Don't fetch if worksiteId is explicitly undefined/null
    // This prevents loading all cameras when we don't have a worksite selected
    if (worksiteId === undefined || worksiteId === null) {
      console.log('[CameraStore] Skipping fetch - worksiteId is undefined/null');
      this.loading = false;
      this.cameras = [];
      this.notifyListeners();
      return;
    }
    
    this.loading = true;
    try {
      const url = `/api/cameras?worksiteId=${worksiteId}`;
      
      console.log('[CameraStore] Fetching cameras from:', url);
      const response = await fetch(url, {
        credentials: 'include',
        cache: 'no-store' // Ensure we get fresh data
      });
      
      if (!response.ok) {
        let errorMessage = `API error: ${response.status}`;
        try {
          const errorData = await response.json();
          console.error('[CameraStore] API error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData.error,
            details: errorData.details,
            debug: errorData.debug
          });
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // If we can't parse the error response, just use the status
          console.error('[CameraStore] API error (could not parse response):', response.status, response.statusText);
        }
        
        // Don't throw - just set empty array and log the error
        // This prevents the app from crashing when API has issues
        console.warn('[CameraStore] ⚠️ Failed to fetch cameras, using empty array');
        this.cameras = [];
        this.loading = false;
        this.notifyListeners();
        return;
      }

      const result = await response.json();
      console.log('[CameraStore] API response:', { 
        success: result.success, 
        dataLength: result.data?.length || result.length || 0,
        worksiteId 
      });
      
      // Handle both response formats: { success: true, data: [...] } or { data: [...] }
      const camerasData = result.success && Array.isArray(result.data) 
        ? result.data 
        : Array.isArray(result.data) 
        ? result.data 
        : Array.isArray(result) 
        ? result 
        : [];
      
      console.log('[CameraStore] Parsed cameras data:', camerasData.length, 'cameras');
      
      // Remove duplicates by ID
      const uniqueCameras = camerasData.filter((cam: any, index: number, self: any[]) => 
        index === self.findIndex((c: any) => c.id === cam.id)
      );
      
      console.log('[CameraStore] After deduplication:', uniqueCameras.length, 'unique cameras');
      
      if (uniqueCameras.length > 0) {
        // If worksiteId is provided, filter cameras to only those for that worksite
        let filteredCameras = uniqueCameras;
        if (worksiteId) {
          const beforeFilter = uniqueCameras.length;
          filteredCameras = uniqueCameras.filter((cam: any) => {
            const matches = cam.worksiteId === worksiteId;
            if (!matches && beforeFilter <= 5) {
              // Only log if we have few cameras (to avoid spam)
              console.log('[CameraStore] Camera', cam.id.substring(0, 10) + '...', cam.name, 'worksiteId:', cam.worksiteId, '≠ requested:', worksiteId);
            }
            return matches;
          });
          console.log('[CameraStore] Filtered from', beforeFilter, 'to', filteredCameras.length, 'cameras for worksite', worksiteId);
          
          if (filteredCameras.length === 0 && beforeFilter > 0) {
            const availableWorksiteIds = [...new Set(uniqueCameras.map((c: any) => c.worksiteId))];
            console.warn('[CameraStore] ⚠️ No cameras match worksiteId', worksiteId);
            console.warn('[CameraStore] Available worksiteIds in fetched cameras:', availableWorksiteIds);
            console.warn('[CameraStore] This means either:');
            console.warn('[CameraStore]   1. No cameras exist for this worksite');
            console.warn('[CameraStore]   2. The API filter is not working correctly');
            console.warn('[CameraStore]   3. Cameras were created with a different worksiteId');
          }
        }
        
        this.cameras = filteredCameras.map((cam: any) => ({
          id: cam.id,
          name: cam.name,
          location: cam.location || cam.metadata?.notes || 'Unspecified',
          streamUrl: cam.streamUrl || cam.hlsUrl,
          streamType: cam.streamType || (cam.hlsUrl ? 'hls' : 'rtsp'),
          status: cam.status || 'pending',
          resolution: cam.resolution || '1920x1080',
          fps: cam.fps || 30,
          lastActivity: cam.lastActivity || cam.createdAt,
          minutesSinceActivity: cam.minutesSinceActivity || 0,
          detectionCount: cam.detectionCount || 0,
          violationCount: cam.violationCount || 0,
          features: cam.features || { aiDetection: true, nightVision: false, ptz: false, audio: false },
          worksiteId: cam.worksiteId,
          worksite: cam.worksite,
          createdAt: cam.createdAt,
          updatedAt: cam.updatedAt,
          hasVideo: true,
          alerts: cam.violationCount || 0
        }));
        console.log('📹 Loaded', this.cameras.length, 'cameras from API (worksite:', worksiteId || 'all', ')');
        console.log('📹 Camera IDs:', this.cameras.map(c => c.id));
        console.log('📹 Camera names:', this.cameras.map(c => c.name));
        console.log('📹 Camera worksiteIds:', this.cameras.map(c => c.worksiteId));
      } else {
        // If no cameras in DB, use empty array (don't use demo cameras)
        this.cameras = [];
        console.log('📹 No cameras found in database for worksite:', worksiteId || 'all');
      }
      
      this.notifyListeners();
      console.log('📹 Notified', this.listeners.size, 'listeners');
    } catch (error: any) {
      console.error('[CameraStore] Error fetching cameras from API:', error);
      console.error('[CameraStore] Error details:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name
      });
      // Don't throw - just set empty array to prevent app crash
      this.cameras = [];
      this.loading = false;
      this.notifyListeners();
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
        // Instead of pushing, refresh the entire list to avoid duplicates
        // This ensures we have the latest data from the server
        // Use retry logic with increasing delays to handle transaction isolation
        const createdCameraId = result.data.id;
        const createdCameraName = result.data.name;
        const targetWorksiteId = camera.worksiteId;
        
        console.log('[CameraStore] Camera created successfully:', {
          id: createdCameraId,
          name: createdCameraName,
          worksiteId: targetWorksiteId
        });
        
        // Retry with increasing delays: 500ms, 1000ms, 2000ms
        const retryDelays = [500, 1000, 2000];
        let newCamera: any = null;
        
        for (let attempt = 0; attempt < retryDelays.length; attempt++) {
          if (attempt > 0) {
            console.log(`[CameraStore] Retry attempt ${attempt + 1}/${retryDelays.length}, waiting ${retryDelays[attempt]}ms...`);
            await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          } else {
            // First attempt with minimal delay
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          
          console.log(`[CameraStore] Refreshing cameras for worksite (attempt ${attempt + 1}):`, targetWorksiteId);
          await this.fetchCamerasForWorksite(targetWorksiteId);
          console.log('[CameraStore] After refresh, found', this.cameras.length, 'cameras');
          
          // Find the newly created camera
          newCamera = this.cameras.find((cam: any) => 
            cam.id === createdCameraId || 
            (cam.name === createdCameraName && cam.worksiteId === targetWorksiteId)
          );
          
          if (newCamera) {
            console.log(`[CameraStore] ✅ Found newly created camera on attempt ${attempt + 1}:`, newCamera.name);
            break;
          } else {
            console.warn(`[CameraStore] ⚠️ Camera not found in store after attempt ${attempt + 1}`);
            if (this.cameras.length > 0) {
              console.warn('[CameraStore] Available cameras in store:', this.cameras.map((c: any) => ({
                id: c.id,
                name: c.name,
                worksiteId: c.worksiteId
              })));
            }
          }
        }
        
        if (!newCamera) {
          console.error('[CameraStore] ❌ Camera not found after all retry attempts');
          console.error('[CameraStore] Created camera ID:', createdCameraId);
          console.error('[CameraStore] Created camera name:', createdCameraName);
          console.error('[CameraStore] Target worksiteId:', targetWorksiteId);
          console.error('[CameraStore] Cameras in store:', this.cameras.length);
          
          // Last resort: try fetching all cameras and filtering client-side
          console.log('[CameraStore] Attempting fallback: fetching all cameras and filtering client-side...');
          await this.fetchCamerasForWorksite(); // Fetch all cameras
          newCamera = this.cameras.find((cam: any) => 
            cam.id === createdCameraId || 
            (cam.name === createdCameraName && cam.worksiteId === targetWorksiteId)
          );
          
          if (newCamera) {
            console.log('[CameraStore] ✅ Found camera using fallback method');
            // Filter to target worksite for consistency
            await this.fetchCamerasForWorksite(targetWorksiteId);
          } else {
            console.error('[CameraStore] ❌ Camera still not found even with fallback method');
          }
        }
        
        return newCamera || null;
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
        let errorMessage = 'Failed to update camera';
        try {
        const error = await response.json();
          errorMessage = error.error || error.message || errorMessage;
        } catch (e) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
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
    // Don't load cameras if worksiteId is undefined/null
    // This prevents loading all cameras when currentSite is not yet available
    if (!worksiteId) {
      console.log('[useCameraStore] Skipping camera load - worksiteId is undefined/null');
      // Clear cameras immediately to prevent showing cameras from other worksites
      setCameras([]);
      setLoading(false);
      // Clear the store to prevent stale data
      cameraStore.cameras = [];
      cameraStore.notifyListeners();
      return;
    }
    
    // Clear cameras first to prevent showing stale data from previous worksite
    setCameras([]);
    setLoading(true);
    
    // Load cameras for specific worksite
    const loadCameras = async () => {
      console.log('[useCameraStore] Loading cameras for worksite:', worksiteId);
      await cameraStore.fetchCamerasForWorksite(worksiteId);
      const loadedCameras = cameraStore.getCameras();
      // Filter to ensure we only show cameras for this worksite (safety check)
      const filteredCameras = loadedCameras.filter((c: any) => c.worksiteId === worksiteId);
      console.log('[useCameraStore] Loaded', filteredCameras.length, 'cameras for worksite', worksiteId);
      setCameras(filteredCameras);
      setLoading(cameraStore.isLoading());
    };
    
    loadCameras();

    // Subscribe to changes - but filter to only show cameras for this worksite
    const unsubscribe = cameraStore.subscribe(() => {
      const updatedCameras = cameraStore.getCameras();
      // Always filter by worksiteId to prevent showing cameras from other worksites
      const filteredCameras = updatedCameras.filter((c: any) => c.worksiteId === worksiteId);
      console.log('[useCameraStore] Store updated, cameras count:', filteredCameras.length, 'for worksite', worksiteId);
      setCameras(filteredCameras);
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
    refreshCameras: (worksiteId?: string) => cameraStore.refreshCameras(worksiteId),
    getStats: () => cameraStore.getStats()
  };
}

'use client';

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
  addedAt: string;
  lastSeen?: string;
  worksiteId?: string;
  hasVideo?: boolean;
  alerts?: number;
}

const STORAGE_KEY = 'sitesafe_cameras';

// Default demo cameras
const DEFAULT_CAMERAS: Camera[] = [
  {
    id: 'demo-cam-1',
    name: 'People Detection Camera',
    location: 'Main Entrance - Building A',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    streamType: 'hls',
    status: 'online',
    description: 'Main entrance monitoring with people counting',
    resolution: '1080p',
    fps: 30,
    addedAt: new Date().toISOString(),
    hasVideo: true,
    alerts: 0
  },
  {
    id: 'demo-cam-2',
    name: 'Construction Zone Camera',
    location: 'Building B - Floor 2',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    streamType: 'hls',
    status: 'online',
    description: 'Construction safety and PPE compliance monitoring',
    resolution: '720p',
    fps: 30,
    addedAt: new Date().toISOString(),
    hasVideo: true,
    alerts: 2
  },
  {
    id: 'demo-cam-3',
    name: 'Warehouse Monitoring',
    location: 'Loading Dock - East Side',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
    streamType: 'hls',
    status: 'online',
    description: 'Forklift and vehicle safety monitoring',
    resolution: '1080p',
    fps: 30,
    addedAt: new Date().toISOString(),
    hasVideo: true,
    alerts: 0
  },
  {
    id: 'demo-cam-4',
    name: 'Parking Lot Camera',
    location: 'Main Parking Lot',
    streamUrl: 'https://bitdash-a.akamaihd.net/content/MI201109210084_1/m3u8s/f08e80da-bf1d-4e3d-8899-f0f6155f6efa.m3u8',
    streamType: 'hls',
    status: 'online',
    description: 'Vehicle tracking and access monitoring',
    resolution: '720p',
    fps: 30,
    addedAt: new Date().toISOString(),
    hasVideo: true,
    alerts: 1
  }
];

class CameraStore {
  private cameras: Camera[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadFromStorage();
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cameras = JSON.parse(stored);
        console.log('📹 Loaded', this.cameras.length, 'cameras from storage');
      } else {
        // Initialize with default cameras
        this.cameras = DEFAULT_CAMERAS;
        this.saveToStorage();
        console.log('📹 Initialized with', this.cameras.length, 'demo cameras');
      }
    } catch (error) {
      console.error('Error loading cameras from storage:', error);
      this.cameras = DEFAULT_CAMERAS;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cameras));
      console.log('💾 Saved', this.cameras.length, 'cameras to storage');
    } catch (error) {
      console.error('Error saving cameras to storage:', error);
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

  addCamera(camera: Omit<Camera, 'id' | 'addedAt'>): Camera {
    const newCamera: Camera = {
      ...camera,
      id: `cam-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      addedAt: new Date().toISOString(),
      status: 'testing' // Start as testing, will update to online when stream connects
    };

    this.cameras.push(newCamera);
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('✅ Added camera:', newCamera.name);
    return newCamera;
  }

  updateCamera(id: string, updates: Partial<Camera>): Camera | null {
    const index = this.cameras.findIndex(cam => cam.id === id);
    if (index === -1) return null;

    this.cameras[index] = {
      ...this.cameras[index],
      ...updates
    };

    this.saveToStorage();
    this.notifyListeners();
    
    console.log('📝 Updated camera:', this.cameras[index].name);
    return this.cameras[index];
  }

  deleteCamera(id: string): boolean {
    const index = this.cameras.findIndex(cam => cam.id === id);
    if (index === -1) return false;

    const deletedCamera = this.cameras[index];
    this.cameras.splice(index, 1);
    
    this.saveToStorage();
    this.notifyListeners();
    
    console.log('🗑️ Deleted camera:', deletedCamera.name);
    return true;
  }

  updateCameraStatus(id: string, status: Camera['status']) {
    this.updateCamera(id, { 
      status,
      lastSeen: new Date().toISOString()
    });
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

  resetToDefaults() {
    this.cameras = DEFAULT_CAMERAS;
    this.saveToStorage();
    this.notifyListeners();
    console.log('🔄 Reset to default cameras');
  }

  exportCameras(): string {
    return JSON.stringify(this.cameras, null, 2);
  }

  importCameras(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      if (Array.isArray(imported)) {
        this.cameras = imported;
        this.saveToStorage();
        this.notifyListeners();
        console.log('📥 Imported', this.cameras.length, 'cameras');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error importing cameras:', error);
      return false;
    }
  }
}

// Singleton instance
export const cameraStore = new CameraStore();

// React hook for using camera store
export function useCameraStore() {
  const [cameras, setCameras] = React.useState<Camera[]>([]);

  React.useEffect(() => {
    // Initial load
    setCameras(cameraStore.getCameras());

    // Subscribe to changes
    const unsubscribe = cameraStore.subscribe(() => {
      setCameras(cameraStore.getCameras());
    });

    return unsubscribe;
  }, []);

  return {
    cameras,
    addCamera: (camera: Omit<Camera, 'id' | 'addedAt'>) => cameraStore.addCamera(camera),
    updateCamera: (id: string, updates: Partial<Camera>) => cameraStore.updateCamera(id, updates),
    deleteCamera: (id: string) => cameraStore.deleteCamera(id),
    getCamera: (id: string) => cameraStore.getCamera(id),
    updateStatus: (id: string, status: Camera['status']) => cameraStore.updateCameraStatus(id, status),
    getStats: () => cameraStore.getStats(),
    resetToDefaults: () => cameraStore.resetToDefaults(),
    exportCameras: () => cameraStore.exportCameras(),
    importCameras: (json: string) => cameraStore.importCameras(json)
  };
}

// Import React for the hook
import React from 'react';


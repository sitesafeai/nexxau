/**
 * Camera types and interfaces
 */

/**
 * Camera status as seen by the UI
 */
export type CameraStatus = 'connecting' | 'live' | 'unhealthy' | 'failed' | 'offline';

/**
 * Camera configuration from API
 */
export interface CameraData {
  id: string;
  name: string;
  status: string; // API status: 'pending' | 'online' | 'offline'
  location: string | null;
  streamUrl: string | null;
  janusFeedId: number | null;
  metadata: {
    aiEnabled?: boolean;
    recording?: boolean;
    [key: string]: any;
  } | null;
}

/**
 * Camera state as managed by useCameraManager
 */
export interface CameraState {
  id: string;
  name: string;
  janusFeedId: number;
  rtspUrl: string;
  status: CameraStatus;
  aiEnabled: boolean;
  videoElement: HTMLVideoElement | null;
  error: string | null;
}

/**
 * Camera subscription configuration
 */
export interface CameraSubscriptionConfig {
  cameraId: string;
  janusFeedId: number;
  videoElement: HTMLVideoElement;
  roomId: number;
}


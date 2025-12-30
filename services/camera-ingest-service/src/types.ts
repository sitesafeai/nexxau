/**
 * Camera state management
 */

export interface CameraConfig {
  id: string;
  tenantId: string;
  rtspUrl: string;
  fps?: number; // Frames per second (default: 1)
  frameOutputPath?: string; // Default: /tmp/frames/{cameraId}
}

export enum CameraStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  DEGRADED = 'DEGRADED',
  FAILING = 'FAILING',
}

export interface CameraState {
  config: CameraConfig;
  status: CameraStatus;
  process?: any; // ChildProcess
  failureCount: number;
  lastFailureAt?: Date;
  lastHeartbeat?: Date;
  startedAt?: Date;
  restartAttempt?: number;
}

export interface Heartbeat {
  cameraId: string;
  tenantId: string;
  timestamp: Date;
  status: CameraStatus;
  frameCount?: number;
  uptime?: number; // seconds
}

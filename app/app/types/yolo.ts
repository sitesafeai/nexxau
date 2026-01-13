/**
 * YOLO detection types
 */

/**
 * Bounding box coordinates
 */
export interface BoundingBox {
  x: number; // Top-left x
  y: number; // Top-left y
  width: number;
  height: number;
}

/**
 * Detection result from YOLO backend
 */
export interface Detection {
  class: string;
  confidence: number;
  bbox: BoundingBox;
}

/**
 * YOLO detection message from WebSocket
 */
export interface YOLODetectionMessage {
  cameraId: string;
  detections: Detection[];
  timestamp: number;
}

/**
 * YOLO hook status
 */
export type YOLOStatus = 'connecting' | 'live' | 'unhealthy' | 'failed';


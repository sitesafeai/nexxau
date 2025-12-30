/**
 * PHASE 2: Backend Streaming Service
 * 
 * This service provides live video streaming functionality.
 * It is completely separate from camera testing (Phase 1).
 * 
 * Responsibilities:
 * - Accept a camera ID
 * - Resolve the camera's stream URL
 * - Proxy or relay the stream
 * - Expose a clean stream URL or response
 * 
 * Constraints:
 * - No UI logic
 * - No test logic
 * - No snapshots
 * - No frontend assumptions
 * - Must be separate from testing service
 */

import { Camera, CameraProtocol } from './types';

/**
 * Stream resolution result
 */
export interface StreamResolution {
  streamUrl: string;
  protocol: CameraProtocol;
  proxyUrl?: string; // If proxying is needed
  directUrl?: string; // If direct access is possible
}

/**
 * Resolves a camera's stream URL
 * 
 * This function takes a camera object and returns the appropriate
 * stream URL that can be used for playback.
 * 
 * @param camera - The camera object
 * @returns Stream resolution with URL and protocol
 */
export function resolveCameraStream(camera: Camera): StreamResolution {
  // Validate camera has required fields
  if (!camera.streamUrl || !camera.protocol) {
    throw new Error('Camera missing streamUrl or protocol');
  }
  
  // For direct protocols, return the stream URL as-is
  // The frontend will handle the protocol-specific player
  return {
    streamUrl: camera.streamUrl,
    protocol: camera.protocol,
    directUrl: camera.streamUrl
  };
}

/**
 * Validates that a stream URL is accessible
 * 
 * This is a lightweight check - not a full connection test.
 * Used to verify the URL format and basic accessibility.
 * 
 * @param streamUrl - The stream URL to validate
 * @param protocol - The expected protocol
 * @returns true if URL format is valid
 */
export function validateStreamUrl(streamUrl: string, protocol: CameraProtocol): boolean {
  try {
    const url = new URL(streamUrl);
    
    // Protocol-specific validation
    switch (protocol) {
      case 'rtsp':
        return url.protocol === 'rtsp:';
      case 'hls':
        return (url.protocol === 'http:' || url.protocol === 'https:') && 
               (streamUrl.includes('.m3u8') || streamUrl.includes('m3u8'));
      case 'webrtc':
        return url.protocol === 'webrtc:' || url.protocol === 'ws:' || url.protocol === 'wss:';
      default:
        return false;
    }
  } catch {
    return false;
  }
}

/**
 * Gets the appropriate MIME type for a stream protocol
 * 
 * @param protocol - The stream protocol
 * @returns MIME type string
 */
export function getStreamMimeType(protocol: CameraProtocol): string {
  switch (protocol) {
    case 'hls':
      return 'application/vnd.apple.mpegurl';
    case 'webrtc':
      return 'application/webrtc';
    case 'rtsp':
      return 'application/x-rtsp';
    default:
      return 'application/octet-stream';
  }
}


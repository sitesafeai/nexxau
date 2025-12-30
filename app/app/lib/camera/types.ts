/**
 * PHASE 0: Camera Domain Model
 * 
 * This file defines the core contract for the camera subsystem.
 * It contains ONLY the domain model - no implementation, no UI concerns,
 * no permissions, no analytics, no business logic.
 */

/**
 * Supported streaming protocols
 */
export type CameraProtocol = 'rtsp' | 'webrtc' | 'hls';

/**
 * Camera operational status
 */
export type CameraStatus = 'offline' | 'connecting' | 'live' | 'error';

/**
 * Core Camera domain model
 * 
 * This represents a camera in the system. It contains ONLY the essential
 * information needed to identify, connect to, and understand the state of a camera.
 * 
 * Constraints:
 * - No UI-specific fields (no displayName, no icon, no color)
 * - No permission fields (no canEdit, no accessLevel)
 * - No analytics fields (no lastSeen, no uptime, no frameCount)
 * - No ingestion fields (no ingestUrl, no recordingEnabled)
 * - No metadata fields (no location, no description, no tags)
 */
export interface Camera {
  /**
   * Unique identifier for the camera
   */
  id: string;

  /**
   * Human-readable name for the camera
   */
  name: string;

  /**
   * Streaming protocol used by this camera
   */
  protocol: CameraProtocol;

  /**
   * Full URL to access the camera stream
   * Examples:
   * - RTSP: rtsp://user:pass@192.168.1.100:554/stream1
   * - WebRTC: webrtc://camera.example.com/stream
   * - HLS: https://stream.example.com/camera1/index.m3u8
   */
  streamUrl: string;

  /**
   * Current operational status of the camera
   * - offline: Camera is not reachable or not configured
   * - connecting: Attempting to establish connection
   * - live: Successfully streaming and accessible
   * - error: Connection failed or stream is broken
   */
  status: CameraStatus;
}

/**
 * SYSTEM CONTRACT: What This System DOES
 * 
 * 1. Test camera connectivity
 *    - Attempt to connect to a camera stream URL
 *    - Capture a single frame if possible
 *    - Measure connection latency
 *    - Report success or failure
 * 
 * 2. Provide live video streaming
 *    - Accept a camera ID
 *    - Resolve the camera's stream URL
 *    - Proxy or relay the stream to the client
 *    - Handle stream errors gracefully
 * 
 * 3. Display camera status
 *    - Show current connection status
 *    - Display test results
 *    - Show live video when available
 * 
 * SYSTEM CONTRACT: What This System DOES NOT Do
 * 
 * 1. Does NOT manage camera credentials
 *    - Credentials are embedded in streamUrl
 *    - No separate credential storage or management
 * 
 * 2. Does NOT persist camera data
 *    - No database operations in this subsystem
 *    - Cameras are passed in, not stored
 * 
 * 3. Does NOT handle permissions
 *    - No access control logic
 *    - No role-based restrictions
 * 
 * 4. Does NOT perform analytics
 *    - No frame counting
 *    - No uptime tracking
 *    - No performance metrics collection
 * 
 * 5. Does NOT manage recordings
 *    - No video recording
 *    - No snapshot storage
 *    - No playback of historical footage
 * 
 * 6. Does NOT handle AI detection
 *    - No object detection
 *    - No zone monitoring
 *    - No alert generation
 * 
 * 7. Does NOT provide camera discovery
 *    - No ONVIF discovery
 *    - No network scanning
 *    - Cameras must be explicitly provided
 */


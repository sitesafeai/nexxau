/**
 * useYOLOCamera - React hook for per-camera YOLO detection
 * 
 * Responsibilities:
 * - Capture frames from video element at configurable FPS
 * - Send frames to YOLO backend via WebSocket
 * - Receive detection results with bounding boxes
 * - Render bounding boxes on canvas overlay
 * - Handle errors per-camera (isolated failures)
 * - Clean cleanup on unmount
 * 
 * Constraints:
 * - Per-camera isolation (failure of one camera doesn't affect others)
 * - Throttled frame capture (~5 FPS default)
 * - Clean cleanup (cancel frames, close WS, clear overlay)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Detection, YOLOStatus } from '@/app/types/yolo';

export interface UseYOLOCameraOptions {
  fps?: number; // Frames per second (default: 5)
  wsUrl?: string; // WebSocket URL (default: from env or localhost:8766)
  enabled?: boolean; // Whether YOLO is enabled (default: true)
}

export interface UseYOLOCameraReturn {
  detections: Detection[];
  status: YOLOStatus;
  error: string | null;
}

/**
 * Default YOLO WebSocket URL
 */
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_YOLO_WS_URL || 'ws://localhost:8766/ws/detections';
const DEFAULT_FPS = 5;

/**
 * useYOLOCamera hook
 * 
 * @param cameraId - Camera ID for tracking
 * @param videoRef - Reference to video element
 * @param overlayRef - Reference to canvas overlay element
 * @param options - Configuration options
 */
export function useYOLOCamera(
  cameraId: string,
  videoRef: React.RefObject<HTMLVideoElement>,
  overlayRef: React.RefObject<HTMLCanvasElement>,
  options: UseYOLOCameraOptions = {}
): UseYOLOCameraReturn {
  const { fps = DEFAULT_FPS, wsUrl = DEFAULT_WS_URL, enabled = true } = options;
  
  // State
  const [detections, setDetections] = useState<Detection[]>([]);
  const [status, setStatus] = useState<YOLOStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const frameCallbackHandleRef = useRef<number | null>(null);
  const intervalHandleRef = useRef<NodeJS.Timeout | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const frameIntervalMs = 1000 / fps; // Milliseconds between frames
  
  // Track if hook is active
  const isActiveRef = useRef<boolean>(false);
  
  /**
   * Connect WebSocket to YOLO backend
   */
  const connectWebSocket = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }
    
    console.log(`[useYOLOCamera ${cameraId}] Connecting to YOLO WebSocket: ${wsUrl}`);
    setStatus('connecting');
    setError(null);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log(`[useYOLOCamera ${cameraId}] ✅ WebSocket connected`);
        setStatus('live');
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verify this detection is for this camera
          if (data.cameraId && data.cameraId !== cameraId) {
            console.warn(`[useYOLOCamera ${cameraId}] Received detection for different camera: ${data.cameraId}`);
            return;
          }
          
          // Handle detection message
          if (data.detections && Array.isArray(data.detections)) {
            setDetections(data.detections);
            setStatus('live');
            setError(null);
          } else if (data.error) {
            console.error(`[useYOLOCamera ${cameraId}] YOLO backend error:`, data.error);
            setError(data.error);
            setStatus('failed');
          }
        } catch (err: any) {
          console.error(`[useYOLOCamera ${cameraId}] Failed to parse detection message:`, err);
        }
      };
      
      ws.onerror = (err) => {
        console.error(`[useYOLOCamera ${cameraId}] WebSocket error:`, err);
        setError('WebSocket connection error');
        setStatus('failed');
      };
      
      ws.onclose = (event) => {
        console.log(`[useYOLOCamera ${cameraId}] WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
        
        if (isActiveRef.current && enabled) {
          // Unexpected close - mark as unhealthy
          setStatus('unhealthy');
          setError('WebSocket disconnected');
          
          // Attempt reconnect after delay (only if still enabled)
          setTimeout(() => {
            if (isActiveRef.current && enabled && wsRef.current?.readyState !== WebSocket.OPEN) {
              console.log(`[useYOLOCamera ${cameraId}] Attempting WebSocket reconnect...`);
              connectWebSocket();
            }
          }, 3000);
        } else {
          setStatus('failed');
        }
      };
    } catch (err: any) {
      console.error(`[useYOLOCamera ${cameraId}] Failed to create WebSocket:`, err);
      setError(err.message || 'Failed to connect to YOLO backend');
      setStatus('failed');
    }
  }, [cameraId, wsUrl, enabled]);
  
  /**
   * Send frame to YOLO backend
   */
  const sendFrame = useCallback(() => {
    const video = videoRef.current;
    const ws = wsRef.current;
    
    if (!video || !ws || ws.readyState !== WebSocket.OPEN) {
      return; // Not ready
    }
    
    // Check if video is playing and has valid dimensions
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return; // Video not ready
    }
    
    try {
      // Create temporary canvas to capture frame
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.warn(`[useYOLOCamera ${cameraId}] Failed to get canvas context`);
        return;
      }
      
      // Draw video frame to canvas
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert to JPEG blob (quality 0.8 for balance between size and quality)
      canvas.toBlob((blob) => {
        if (!blob || ws.readyState !== WebSocket.OPEN) {
          return;
        }
        
        // Send frame as binary (backend expects binary JPEG)
        ws.send(blob);
        
        console.log(`[useYOLOCamera ${cameraId}] Frame sent (${blob.size} bytes)`);
      }, 'image/jpeg', 0.8);
    } catch (err: any) {
      console.error(`[useYOLOCamera ${cameraId}] Failed to send frame:`, err);
    }
  }, [cameraId, videoRef]);
  
  /**
   * Render detections on canvas overlay
   */
  const renderDetections = useCallback(() => {
    const canvas = overlayRef.current;
    if (!canvas) {
      return;
    }
    
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw bounding boxes
    detections.forEach((detection) => {
      const { bbox, class: className, confidence } = detection;
      
      // Scale bbox to canvas dimensions (bbox is in 0-1 normalized coordinates)
      const x = bbox.x * canvas.width;
      const y = bbox.y * canvas.height;
      const width = bbox.width * canvas.width;
      const height = bbox.height * canvas.height;
      
      // Draw bounding box
      ctx.strokeStyle = '#00ff00'; // Green
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      const label = `${className} ${(confidence * 100).toFixed(1)}%`;
      ctx.font = '14px Arial';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      const textMetrics = ctx.measureText(label);
      ctx.fillRect(x, y - 20, textMetrics.width + 8, 20);
      
      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 4, y - 5);
    });
  }, [detections, overlayRef, videoRef]);
  
  /**
   * Frame capture using requestVideoFrameCallback (modern browsers)
   */
  const startFrameCaptureModern = useCallback(() => {
    const video = videoRef.current;
    if (!video || !('requestVideoFrameCallback' in HTMLVideoElement.prototype)) {
      return false; // Not supported, use fallback
    }
    
    const captureFrame = () => {
      if (!isActiveRef.current || !enabled) {
        return;
      }
      
      const now = performance.now();
      const timeSinceLastFrame = now - lastFrameTimeRef.current;
      
      // Throttle to target FPS
      if (timeSinceLastFrame >= frameIntervalMs) {
        sendFrame();
        lastFrameTimeRef.current = now;
      }
      
      // Schedule next frame
      if (isActiveRef.current && enabled) {
        try {
          frameCallbackHandleRef.current = (video as any).requestVideoFrameCallback(captureFrame);
        } catch (err) {
          console.warn(`[useYOLOCamera ${cameraId}] requestVideoFrameCallback failed, using fallback`);
          startFrameCaptureFallback();
        }
      }
    };
    
    try {
      frameCallbackHandleRef.current = (video as any).requestVideoFrameCallback(captureFrame);
      console.log(`[useYOLOCamera ${cameraId}] Using requestVideoFrameCallback for frame capture`);
      return true;
    } catch (err) {
      console.warn(`[useYOLOCamera ${cameraId}] requestVideoFrameCallback not available, using fallback`);
      return false;
    }
  }, [cameraId, videoRef, enabled, frameIntervalMs, sendFrame]);
  
  /**
   * Frame capture fallback using setInterval
   */
  const startFrameCaptureFallback = useCallback(() => {
    if (intervalHandleRef.current) {
      clearInterval(intervalHandleRef.current);
    }
    
    intervalHandleRef.current = setInterval(() => {
      if (!isActiveRef.current || !enabled) {
        return;
      }
      
      sendFrame();
    }, frameIntervalMs);
    
    console.log(`[useYOLOCamera ${cameraId}] Using setInterval for frame capture (${fps} FPS)`);
  }, [cameraId, enabled, frameIntervalMs, fps, sendFrame]);
  
  /**
   * Start frame capture
   */
  const startFrameCapture = useCallback(() => {
    if (!videoRef.current || !enabled) {
      return;
    }
    
    // Try modern API first, fallback to setInterval
    if (!startFrameCaptureModern()) {
      startFrameCaptureFallback();
    }
  }, [enabled, videoRef, startFrameCaptureModern, startFrameCaptureFallback]);
  
  /**
   * Stop frame capture
   */
  const stopFrameCapture = useCallback(() => {
    // Cancel requestVideoFrameCallback
    if (frameCallbackHandleRef.current !== null && videoRef.current) {
      if ('cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        try {
          (videoRef.current as any).cancelVideoFrameCallback(frameCallbackHandleRef.current);
        } catch (err) {
          // Ignore cancellation errors
        }
      }
      frameCallbackHandleRef.current = null;
    }
    
    // Clear interval
    if (intervalHandleRef.current) {
      clearInterval(intervalHandleRef.current);
      intervalHandleRef.current = null;
    }
  }, [videoRef]);
  
  /**
   * Initialize YOLO when enabled
   */
  useEffect(() => {
    if (!enabled) {
      setStatus('failed');
      setError(null);
      return;
    }
    
    if (!videoRef.current || !overlayRef.current) {
      return; // Not ready yet
    }
    
    isActiveRef.current = true;
    
    // Connect WebSocket
    connectWebSocket();
    
    // Start frame capture when video is ready
    const video = videoRef.current;
    const handleVideoReady = () => {
      if (video.readyState >= 2 && video.videoWidth > 0) {
        startFrameCapture();
      }
    };
    
    if (video.readyState >= 2) {
      handleVideoReady();
    } else {
      video.addEventListener('loadedmetadata', handleVideoReady);
      video.addEventListener('canplay', handleVideoReady);
    }
    
    // Cleanup
    return () => {
      isActiveRef.current = false;
      
      // Stop frame capture
      stopFrameCapture();
      
      // Close WebSocket
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      
      // Clear overlay
      if (overlayRef.current) {
        const ctx = overlayRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
        }
      }
      
      // Remove event listeners
      video.removeEventListener('loadedmetadata', handleVideoReady);
      video.removeEventListener('canplay', handleVideoReady);
    };
  }, [enabled, videoRef, overlayRef, connectWebSocket, startFrameCapture, stopFrameCapture]);
  
  /**
   * Render detections when they change
   */
  useEffect(() => {
    if (enabled && detections.length > 0) {
      renderDetections();
    } else if (overlayRef.current) {
      // Clear overlay when no detections
      const ctx = overlayRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, overlayRef.current.width, overlayRef.current.height);
      }
    }
  }, [detections, enabled, renderDetections, overlayRef]);
  
  return {
    detections,
    status,
    error
  };
}


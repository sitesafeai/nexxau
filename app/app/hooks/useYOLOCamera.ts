/**
 * useYOLOCamera - React hook for per-camera YOLO detection
 * 
 * Responsibilities:
 * - Receive detection results with bounding boxes over WebSocket
 * - Render bounding boxes on canvas overlay
 * - Handle errors per-camera (isolated failures)
 * - Clean cleanup on unmount
 * 
 * Constraints:
 * - Per-camera isolation (failure of one camera doesn't affect others)
 * - Throttled rendering (~30 FPS max)
 * - Clean cleanup (cancel frames, close WS, clear overlay)
 */

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Detection, YOLOStatus } from '@/app/types/yolo';

export interface UseYOLOCameraOptions {
  wsUrl?: string; // WebSocket URL (default: from env or ws://192.168.64.4:8188)
  enabled?: boolean; // Whether YOLO is enabled (default: true)
  feedId?: number; // Janus feed ID for filtering
}

export interface UseYOLOCameraReturn {
  detections: Detection[];
  status: YOLOStatus;
  error: string | null;
}

/**
 * Default YOLO WebSocket URL
 * Note: If YOLO service is not running, this will fail gracefully
 */
const DEFAULT_WS_URL = process.env.NEXT_PUBLIC_YOLO_WS_URL || 'ws://localhost:8766/ws/detections';
const MAX_RENDER_FPS = 30;

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
  const rawWsUrl = options.wsUrl ?? DEFAULT_WS_URL;
  const wsUrl = typeof rawWsUrl === 'string' ? rawWsUrl.trim() : '';
  const { enabled = true, feedId } = options;
  
  // State
  const [detections, setDetections] = useState<Detection[]>([]);
  const [status, setStatus] = useState<YOLOStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  
  // Refs for cleanup
  const wsRef = useRef<WebSocket | null>(null);
  const lastRenderTimeRef = useRef<number>(0);
  // Track if hook is active
  const isActiveRef = useRef<boolean>(false);
  // Track connection attempts to avoid spam
  const connectionAttemptsRef = useRef<number>(0);
  const lastErrorLogRef = useRef<number>(0);
  
  /**
   * Connect WebSocket to YOLO backend
   */
  const connectWebSocket = useCallback(() => {
    if (!wsUrl) {
      setStatus('failed');
      setError('YOLO WebSocket URL is missing');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }
    
    if (wsRef.current?.readyState === WebSocket.CONNECTING) {
      return; // Already connecting
    }
    
    // Only log connection attempts occasionally to avoid spam
    if (connectionAttemptsRef.current === 0) {
      console.log(`[useYOLOCamera ${cameraId}] Connecting to YOLO WebSocket: ${wsUrl}`);
    }
    setStatus('connecting');
    setError(null);
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      // Reset connection attempts on successful connection
      ws.onopen = () => {
        connectionAttemptsRef.current = 0; // Reset on success
        console.log(`[useYOLOCamera ${cameraId}] ✅ WebSocket connected`);
        setStatus('live');
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Verify this detection is for this camera/feed
          if (data.cameraId && data.cameraId !== cameraId) {
            return;
          }
          if (typeof feedId === 'number' && data.feedId !== undefined && data.feedId !== feedId) {
            return;
          }
          
          // Handle detection message
          if (data.detections && Array.isArray(data.detections)) {
            const normalized = data.detections
              .map((d: any) => {
                if (d.bbox && typeof d.bbox.x === 'number') {
                  return d;
                }
                if (Array.isArray(d.bbox)) {
                  const [x1, y1, x2, y2] = d.bbox;
                  return {
                    class: d.label || d.class,
                    confidence: d.confidence,
                    bbox: {
                      x: x1,
                      y: y1,
                      width: x2 - x1,
                      height: y2 - y1,
                    },
                  };
                }
                return null;
              })
              .filter((item): item is Detection => Boolean(item));

            setDetections(normalized);
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
        // Only log errors occasionally to avoid spam (max once per 10 seconds)
        const now = Date.now();
        if (now - lastErrorLogRef.current > 10000) {
          console.warn(`[useYOLOCamera ${cameraId}] WebSocket connection failed (YOLO service may not be running)`);
          lastErrorLogRef.current = now;
        }
        setError('YOLO service unavailable');
        setStatus('failed');
      };
      
      ws.onclose = (event) => {
        // Only log if it's an unexpected close (not a normal close)
        if (event.code !== 1000 && event.code !== 1001) {
          const now = Date.now();
          if (now - lastErrorLogRef.current > 10000) {
            console.log(`[useYOLOCamera ${cameraId}] WebSocket closed (code: ${event.code})`);
            lastErrorLogRef.current = now;
          }
        }
        
        if (isActiveRef.current && enabled) {
          connectionAttemptsRef.current += 1;
          
          // Stop trying after 3 failed attempts (to avoid spam)
          if (connectionAttemptsRef.current >= 3) {
            setStatus('failed');
            setError('YOLO service unavailable');
            return; // Don't retry anymore
          }
          
          // Unexpected close - mark as unhealthy
          setStatus('unhealthy');
          setError('WebSocket disconnected');
          
          // Attempt reconnect after delay (only if still enabled and under retry limit)
          setTimeout(() => {
            if (isActiveRef.current && enabled && wsRef.current?.readyState !== WebSocket.OPEN && connectionAttemptsRef.current < 3) {
              connectWebSocket();
            }
          }, 5000); // Increased delay to reduce spam
        } else {
          setStatus('failed');
        }
      };
    } catch (err: any) {
      console.error(`[useYOLOCamera ${cameraId}] Failed to create WebSocket:`, err);
      setError(err.message || 'Failed to connect to YOLO backend');
      setStatus('failed');
    }
  }, [cameraId, wsUrl, enabled, feedId]);
  
  
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
    
    // Throttle rendering to avoid overdraw on high FPS streams
    const now = performance.now();
    const minInterval = 1000 / MAX_RENDER_FPS;
    if (now - lastRenderTimeRef.current < minInterval) {
      return;
    }
    lastRenderTimeRef.current = now;

    // Set canvas size to match video pixel dimensions (bbox coordinates are in pixels)
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
      
      // Bbox coordinates are already in pixel space for the video frame
      const x = bbox.x;
      const y = bbox.y;
      const width = bbox.width;
      const height = bbox.height;
      
      // Draw bounding box (red = missing PPE)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);
      
      // Draw label background
      const label = `${className || 'Person'} ${(confidence * 100).toFixed(1)}% • Missing: helmet, vest`;
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
   * Initialize YOLO when enabled
   */
  useEffect(() => {
    if (!enabled) {
      setStatus('failed');
      setError(null);
      connectionAttemptsRef.current = 0; // Reset attempts when disabled
      return;
    }

    if (!wsUrl) {
      setStatus('failed');
      setError('YOLO WebSocket URL is missing');
      return;
    }
    
    isActiveRef.current = true;
    connectionAttemptsRef.current = 0; // Reset attempts when re-enabled
    
    // Connect WebSocket
    connectWebSocket();
    
    // Cleanup
    return () => {
      isActiveRef.current = false;
      
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
      
    };
  }, [enabled, connectWebSocket, wsUrl]);
  
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


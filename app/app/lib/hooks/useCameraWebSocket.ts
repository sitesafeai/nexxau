'use client';

import { useEffect, useRef, useState } from 'react';

export interface CameraStatus {
  id: string;
  status: 'online' | 'offline' | 'active' | 'inactive';
  lastActivity?: string;
  metadata?: any;
}

interface WebSocketMessage {
  type: 'camera_status' | 'connection' | 'error';
  data?: any;
  cameras?: CameraStatus[];
  message?: string;
}

/**
 * Hook to manage WebSocket connection for real-time camera status updates
 * @param worksiteId - The worksite ID to subscribe to camera updates
 * @param onStatusUpdate - Callback when camera status updates are received
 */
export function useCameraWebSocket(
  worksiteId: string | null | undefined,
  onStatusUpdate?: (cameras: CameraStatus[]) => void
) {
  const [isConnected, setIsConnected] = useState(false);
  const [cameraStatuses, setCameraStatuses] = useState<Map<string, CameraStatus>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (!worksiteId) {
      console.log('[WebSocket] No worksiteId provided, skipping connection');
      return;
    }

    const connectWebSocket = () => {
      try {
        // Use ws:// for localhost, wss:// for production
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/cameras?worksite=${worksiteId}`;
        
        console.log('[WebSocket] Connecting to:', wsUrl);
        
        // Note: In development, WebSocket might not work with Next.js dev server
        // Consider using Server-Sent Events (SSE) or polling as fallback
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('[WebSocket] Connected successfully');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            console.log('[WebSocket] Message received:', message.type);

            if (message.type === 'camera_status' && message.cameras) {
              const statusMap = new Map<string, CameraStatus>();
              message.cameras.forEach((camera) => {
                statusMap.set(camera.id, camera);
              });
              setCameraStatuses(statusMap);
              
              if (onStatusUpdate) {
                onStatusUpdate(message.cameras);
              }
            } else if (message.type === 'error') {
              console.error('[WebSocket] Error from server:', message.message);
            }
          } catch (error) {
            console.error('[WebSocket] Error parsing message:', error);
          }
        };

        ws.onerror = (error) => {
          console.error('[WebSocket] Error:', error);
          setIsConnected(false);
        };

        ws.onclose = (event) => {
          console.log('[WebSocket] Connection closed:', event.code, event.reason);
          setIsConnected(false);
          wsRef.current = null;

          // Attempt to reconnect with exponential backoff
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
            console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
            
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connectWebSocket();
            }, delay);
          } else {
            console.warn('[WebSocket] Max reconnect attempts reached');
          }
        };
      } catch (error) {
        console.error('[WebSocket] Error creating connection:', error);
      }
    };

    connectWebSocket();

    // Cleanup function
    return () => {
      console.log('[WebSocket] Cleaning up connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [worksiteId, onStatusUpdate]);

  return {
    isConnected,
    cameraStatuses,
    getCameraStatus: (cameraId: string) => cameraStatuses.get(cameraId),
  };
}

/**
 * Fallback hook using polling for camera status updates
 * Use this when WebSocket is not available (e.g., development with Next.js)
 */
export function useCameraPolling(
  worksiteId: string | null | undefined,
  intervalMs: number = 5000
) {
  const [cameraStatuses, setCameraStatuses] = useState<Map<string, CameraStatus>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!worksiteId) return;

    const fetchCameraStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/worksites/${worksiteId}/cameras`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const statusMap = new Map<string, CameraStatus>();
            data.data.forEach((camera: any) => {
              statusMap.set(camera.id, {
                id: camera.id,
                status: camera.status,
                lastActivity: camera.lastActivity,
                metadata: camera.metadata,
              });
            });
            setCameraStatuses(statusMap);
          }
        }
      } catch (error) {
        console.error('[Camera Polling] Error fetching status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchCameraStatus();

    // Set up polling
    const intervalId = setInterval(fetchCameraStatus, intervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [worksiteId, intervalMs]);

  return {
    cameraStatuses,
    isLoading,
    getCameraStatus: (cameraId: string) => cameraStatuses.get(cameraId),
  };
}


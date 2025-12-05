'use client';

import { useEffect, useRef, useState } from 'react';

export interface CameraStatus {
  id: string;
  name?: string;
  status: 'online' | 'offline' | 'active' | 'inactive';
  lastActivity?: string;
  metadata?: any;
}

interface SSEMessage {
  type: 'camera_status' | 'connection' | 'error';
  timestamp?: string;
  cameras?: CameraStatus[];
  message?: string;
}

/**
 * Hook to manage Server-Sent Events connection for real-time camera status updates
 * @param worksiteId - The worksite ID to subscribe to camera updates
 * @param enabled - Whether to enable the connection (default: true)
 */
export function useCameraStatusSSE(
  worksiteId: string | null | undefined,
  enabled: boolean = true
) {
  const [isConnected, setIsConnected] = useState(false);
  const [cameraStatuses, setCameraStatuses] = useState<Map<string, CameraStatus>>(new Map());
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!worksiteId || !enabled) {
      console.log('[SSE] Connection disabled or no worksiteId');
      return;
    }

    const connectSSE = () => {
      try {
        const sseUrl = `/api/ws/cameras?worksite=${worksiteId}`;
        console.log('[SSE] Connecting to:', sseUrl);

        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[SSE] Connected successfully');
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const message: SSEMessage = JSON.parse(event.data);
            
            if (message.type === 'camera_status' && message.cameras) {
              console.log(`[SSE] Received status for ${message.cameras.length} cameras`);
              const statusMap = new Map<string, CameraStatus>();
              message.cameras.forEach((camera) => {
                statusMap.set(camera.id, camera);
              });
              setCameraStatuses(statusMap);
              setLastUpdate(new Date());
            } else if (message.type === 'connection') {
              console.log('[SSE] Connection acknowledged:', message.message);
            } else if (message.type === 'error') {
              console.error('[SSE] Error from server:', message.message);
            }
          } catch (error) {
            console.error('[SSE] Error parsing message:', error);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[SSE] Connection error:', error);
          setIsConnected(false);
          eventSource.close();
          
          // Attempt to reconnect after 5 seconds
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('[SSE] Attempting to reconnect...');
            connectSSE();
          }, 5000);
        };
      } catch (error) {
        console.error('[SSE] Error creating connection:', error);
      }
    };

    connectSSE();

    // Cleanup function
    return () => {
      console.log('[SSE] Cleaning up connection');
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      setIsConnected(false);
    };
  }, [worksiteId, enabled]);

  return {
    isConnected,
    cameraStatuses,
    lastUpdate,
    getCameraStatus: (cameraId: string) => cameraStatuses.get(cameraId),
  };
}


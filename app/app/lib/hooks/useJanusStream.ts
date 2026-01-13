/**
 * useJanusStream Hook
 * 
 * React hook for managing Janus WebRTC streaming lifecycle.
 * Handles metadata fetching, connection management, and cleanup.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { JanusClient, JanusStreamMetadata, JanusClientCallbacks } from '@/app/lib/services/janusClient';

export type StreamState = 'idle' | 'loading' | 'live' | 'offline' | 'error';

export interface UseJanusStreamOptions {
  cameraId: string;
  autoConnect?: boolean;
  onError?: (error: string) => void;
}

export interface UseJanusStreamReturn {
  streamState: StreamState;
  stream: MediaStream | null;
  error: string | null;
  errorCode: string | null; // FIX 5: Error code for UI state differentiation
  connect: () => Promise<void>;
  disconnect: () => void;
  retry: () => Promise<void>;
}

/**
 * Fetch camera streaming metadata from backend
 */
async function fetchStreamMetadata(cameraId: string): Promise<JanusStreamMetadata> {
  const response = await fetch(`/api/cameras/${cameraId}/stream`);
  
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Camera not found');
    }
    if (response.status === 403) {
      throw new Error('Access denied to camera');
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch stream metadata: ${response.status}`);
  }

  const data = await response.json();

  // FIX 4: Validate required fields with streamType discriminator
  if (!data.streamType) {
    throw new Error('Backend did not return streamType field');
  }
  
  if (data.streamType !== 'webrtc') {
    throw new Error(`Stream type is ${data.streamType}, expected 'webrtc'`);
  }

  if (!data.janusServerUrl) {
    throw new Error('Backend did not return janusServerUrl for WebRTC stream');
  }
  
  if (data.mountpointId === undefined || data.mountpointId === null) {
    throw new Error('Backend did not return mountpointId for WebRTC stream');
  }

  return {
    janusServerUrl: data.janusServerUrl,
    mountpointId: parseInt(data.mountpointId, 10),
    cameraId: data.cameraId || cameraId,
  };
}

/**
 * useJanusStream - Main hook for Janus WebRTC streaming
 */
export function useJanusStream(options: UseJanusStreamOptions): UseJanusStreamReturn {
  const { cameraId, autoConnect = true, onError } = options;

  const [streamState, setStreamState] = useState<StreamState>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null); // FIX 5: Track error code

  const clientRef = useRef<JanusClient | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const isConnectingRef = useRef<boolean>(false);
  const metadataRef = useRef<JanusStreamMetadata | null>(null);

  /**
   * Handle state changes from JanusClient
   */
  const handleStateChange = useCallback((state: 'loading' | 'live' | 'offline' | 'error') => {
    if (!isMountedRef.current) return;

    setStreamState(state);
    
    if (state === 'error' || state === 'offline') {
      setStream(null);
    }
  }, []);

  /**
   * Handle errors from JanusClient (FIX 5: Support error codes)
   */
  const handleError = useCallback((errorMsg: string, errorCode?: string) => {
    if (!isMountedRef.current) return;

    setError(errorMsg);
    setErrorCode(errorCode || null); // FIX 5: Store error code
    setStreamState('error');
    onError?.(errorMsg);
  }, [onError]);

  /**
   * Handle remote stream from JanusClient
   */
  const handleRemoteStream = useCallback((mediaStream: MediaStream) => {
    if (!isMountedRef.current) return;

    setStream(mediaStream);
    setStreamState('live');
    setError(null);
  }, []);

  /**
   * Cleanup callback
   */
  const handleCleanup = useCallback(() => {
    if (!isMountedRef.current) return;

    setStream(null);
    setStreamState('idle');
  }, []);

  /**
   * Connect to Janus stream
   */
  const connect = useCallback(async () => {
    if (!cameraId) {
      setError('Camera ID is required');
      setStreamState('error');
      return;
    }

    // Prevent multiple simultaneous connections
    if (clientRef.current || isConnectingRef.current) {
      console.log('[useJanusStream] Connection already exists or in progress');
      return;
    }

    isConnectingRef.current = true;
    setStreamState('loading');
    setError(null);
    setErrorCode(null);
    setStream(null);

    // Cleanup existing connection
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current = null;
    }

    try {
      // Fetch metadata from backend
      console.log(`[useJanusStream] Starting connection...`, { cameraId });
      const metadata = await fetchStreamMetadata(cameraId);
      metadataRef.current = metadata;

      // Create JanusClient
      const callbacks: JanusClientCallbacks = {
        onStateChange: handleStateChange,
        onError: handleError,
        onRemoteStream: handleRemoteStream,
        onCleanup: handleCleanup,
      };

      const client = new JanusClient(callbacks);
      clientRef.current = client;

      // Connect
      await client.connect(metadata);
      console.log('[useJanusStream] Stream connection established');

      // State will be updated via callbacks
    } catch (err: any) {
      console.error('[useJanusStream] Connection error:', err);
      
      if (!isMountedRef.current) {
        isConnectingRef.current = false;
        return;
      }

      // Better error messages
      let errorMessage = 'Failed to connect to camera stream';
      if (err instanceof Error && err.name === 'JanusLoaderError') {
        errorMessage = 'Failed to load Janus library. Please check your network connection and try again.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Check for Janus library loading errors
      if (err?.message?.includes('Janus') || err?.message?.includes('JanusLoader')) {
        errorMessage = 'Failed to load Janus library. Please contact admin.';
      }
      
      setError(errorMessage);
      setErrorCode(err?.code || null);
      setStreamState('error');
      onError?.(errorMessage);

      // Cleanup on error
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    } finally {
      isConnectingRef.current = false;
    }
  }, [cameraId, handleStateChange, handleError, handleRemoteStream, handleCleanup, onError]);

  /**
   * Disconnect from stream
   */
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.destroy();
      clientRef.current = null;
    }

    setStream(null);
    setStreamState('idle');
    setError(null);
    setErrorCode(null); // FIX 5: Clear error code
  }, []);

  /**
   * Retry connection
   */
  const retry = useCallback(async () => {
    disconnect();
    // Small delay before retry
    await new Promise(resolve => setTimeout(resolve, 500));
    await connect();
  }, [connect, disconnect]);

  /**
   * Auto-connect on mount
   */
  useEffect(() => {
    isMountedRef.current = true;

    if (autoConnect && cameraId) {
      connect();
    }

    return () => {
      isMountedRef.current = false;
      if (clientRef.current) {
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, [autoConnect, cameraId]); // Only depend on autoConnect and cameraId, not connect

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      isConnectingRef.current = false;
      if (clientRef.current) {
        console.log('[useJanusStream] Unmount cleanup');
        clientRef.current.destroy();
        clientRef.current = null;
      }
    };
  }, []);

  return {
    streamState,
    stream,
    error,
    errorCode, // FIX 5: Return error code
    connect,
    disconnect,
    retry,
  };
}

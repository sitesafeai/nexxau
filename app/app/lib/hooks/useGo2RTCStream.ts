/**
 * Hook for MediaMTX HLS streams.
 * Fetches the HLS URL from the API and returns it for use in CameraTile.
 */

import { useState, useEffect, useCallback } from 'react';

interface UseGo2RTCStreamOptions {
  cameraId: string;
  autoPlay?: boolean;
  enabled?: boolean;
}

interface StreamState {
  status: 'connecting' | 'connected' | 'failed' | 'idle';
  error?: string;
  mode?: 'hls';
}

export function useGo2RTCStream({
  cameraId,
  autoPlay = true,
  enabled = true,
}: UseGo2RTCStreamOptions) {
  const [streamState, setStreamState] = useState<StreamState>({ status: 'idle' });
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const forceReconnect = useCallback(() => {
    setHlsUrl(null);
    setStreamState({ status: 'idle' });
    setRetryCount((c) => c + 1);
  }, []);

  useEffect(() => {
    if (!cameraId || !enabled || !autoPlay) {
      setStreamState({ status: 'idle' });
      setHlsUrl(null);
      return;
    }

    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    setStreamState({ status: 'connecting' });

    fetch(`/api/cameras/${cameraId}/stream`)
      .then((res) => {
        if (!res.ok) {
          // 503 is expected while stream gateway/camera is temporarily unavailable.
          // Treat as soft-failure and retry automatically without noisy console errors.
          if (res.status === 503) {
            throw new Error('STREAM_UNAVAILABLE');
          }
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        if (data.hlsUrl) {
          setHlsUrl(data.hlsUrl);
          setStreamState({ status: 'connected', mode: 'hls' });
        } else {
          throw new Error('No HLS URL returned');
        }
      })
      .catch((err) => {
        if (!mounted) return;
        if (err?.message === 'STREAM_UNAVAILABLE') {
          setStreamState({ status: 'failed', error: 'Stream temporarily unavailable' });
          retryTimer = setTimeout(() => {
            if (!mounted) return;
            setRetryCount((c) => c + 1);
          }, 8000);
          return;
        }
        console.error('[useGo2RTCStream] Error:', err.message);
        setStreamState({ status: 'failed', error: err.message });
      });

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [cameraId, autoPlay, retryCount, enabled]);

  // stream is always null now (no WebRTC), kept for CameraTile compatibility
  return { streamState, stream: null, hlsUrl, error: streamState.error, retry: forceReconnect, forceReconnect };
}

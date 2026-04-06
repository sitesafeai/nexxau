/**
 * Hook for go2rtc streams.
 * Tries WebRTC first, falls back to HLS if WebSocket fails.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseGo2RTCStreamOptions {
  cameraId: string;
  autoPlay?: boolean;
  enabled?: boolean;
}

interface StreamState {
  status: 'connecting' | 'connected' | 'failed' | 'idle';
  error?: string;
  mode?: 'webrtc' | 'hls';
}

function webrtcUrlToWs(webrtcUrl: string): string {
  try {
    const u = new URL(webrtcUrl);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/api/ws?src=${u.searchParams.get('src') || ''}`;
  } catch {
    return webrtcUrl.replace(/^http/, 'ws').replace('/api/webrtc', '/api/ws');
  }
}

export function useGo2RTCStream({
  cameraId,
  autoPlay = true,
  enabled = true,
}: UseGo2RTCStreamOptions) {
  const [streamState, setStreamState] = useState<StreamState>({ status: 'idle' });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const forceReconnect = useCallback(() => {
    wsRef.current?.close();
    pcRef.current?.close();
    wsRef.current = null;
    pcRef.current = null;
    setStream(null);
    setHlsUrl(null);
    setStreamState({ status: 'idle' });
    setRetryCount((c) => c + 1);
  }, []);

  const retry = forceReconnect;

  useEffect(() => {
    if (!cameraId || !enabled || !autoPlay) {
      setStreamState({ status: 'idle' });
      setStream(null);
      setHlsUrl(null);
      return;
    }

    let mounted = true;

    async function connect() {
      setStreamState({ status: 'connecting' });

      const response = await fetch(`/api/cameras/${cameraId}/stream`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to get stream info');
      }
      const data = await response.json();

      // Try WebRTC first
      if (data.webrtcUrl) {
        try {
          const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
          });
          pcRef.current = pc;
          pc.ontrack = (event) => {
            if (!mounted) return;
            setStream(event.streams[0]);
            setStreamState({ status: 'connected', mode: 'webrtc' });
          };
          pc.addTransceiver('video', { direction: 'recvonly' });
          pc.addTransceiver('audio', { direction: 'recvonly' });

          const wsUrl = webrtcUrlToWs(data.webrtcUrl);
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error('WebSocket timeout')), 5000);
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;
            ws.onopen = () => {
              pc.addEventListener('icecandidate', (ev) => {
                if (!ev.candidate) return;
                ws.send(JSON.stringify({ type: 'webrtc/candidate', value: ev.candidate.candidate }));
              });
              pc.createOffer()
                .then((offer) => pc.setLocalDescription(offer))
                .then(() => ws.send(JSON.stringify({ type: 'webrtc/offer', value: pc.localDescription!.sdp })));
            };
            ws.onmessage = async (ev) => {
              try {
                const msg = JSON.parse(ev.data);
                if (msg.type === 'webrtc/candidate') {
                  await pc.addIceCandidate({ candidate: msg.value, sdpMid: '0' }).catch(() => {});
                } else if (msg.type === 'webrtc/answer') {
                  if (pc.signalingState !== 'closed') await pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
                  clearTimeout(timeout);
                  resolve();
                }
              } catch (e) { clearTimeout(timeout); reject(e); }
            };
            ws.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket error')); };
            ws.onclose = (ev) => { if (!ev.wasClean) { clearTimeout(timeout); reject(new Error('WebSocket closed')); } };
          });
          return; // WebRTC succeeded
        } catch (e) {
          console.warn('[useGo2RTCStream] WebRTC failed, falling back to HLS', e);
          wsRef.current?.close();
          pcRef.current?.close();
        }
      }

      // HLS fallback
      if (data.hlsUrl && mounted) {
        setHlsUrl(data.hlsUrl);
        setStreamState({ status: 'connected', mode: 'hls' });
        return;
      }

      throw new Error('No stream available');
    }

    connect().catch((err) => {
      if (!mounted) return;
      console.error('[useGo2RTCStream] Error:', err?.message ?? String(err));
      setStreamState({ status: 'failed', error: err.message });
    });

    return () => {
      mounted = false;
      wsRef.current?.close();
      pcRef.current?.close();
      wsRef.current = null;
      pcRef.current = null;
    };
  }, [cameraId, autoPlay, retryCount, enabled]);

  return { streamState, stream, hlsUrl, error: streamState.error, retry, forceReconnect };
}

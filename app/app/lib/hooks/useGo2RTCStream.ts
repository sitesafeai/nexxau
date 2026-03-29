/**
 * Hook for go2rtc WebRTC streams.
 * Uses WebSocket signaling (go2rtc's primary API) for proper ICE candidate exchange.
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface UseGo2RTCStreamOptions {
  cameraId: string;
  autoPlay?: boolean;
  /** When false, no WebRTC connection is opened (e.g. defer until viewport / idle). Default true. */
  enabled?: boolean;
}

interface StreamState {
  status: 'connecting' | 'connected' | 'failed' | 'idle';
  error?: string;
}

/** Derive WebSocket URL from HTTP webrtcUrl: http://host:port/api/webrtc?src=X → ws://host:port/api/ws?src=X */
function webrtcUrlToWs(webrtcUrl: string): string {
  try {
    const u = new URL(webrtcUrl);
    const proto = u.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${u.host}/api/ws?src=${u.searchParams.get('src') || ''}`;
  } catch {
    return webrtcUrl.replace(/^http/, 'ws').replace('/api/webrtc', '/api/ws');
  }
}

const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAY_MS = 3000;

export function useGo2RTCStream({
  cameraId,
  autoPlay = true,
  enabled = true,
}: UseGo2RTCStreamOptions) {
  const [streamState, setStreamState] = useState<StreamState>({ status: 'idle' });
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const forceReconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    wsRef.current?.close();
    pcRef.current?.close();
    wsRef.current = null;
    pcRef.current = null;
    reconnectAttemptsRef.current = 0;
    setStream(null);
    setStreamState({ status: 'idle' });
    setRetryCount((c) => c + 1);
  }, []);

  const retry = forceReconnect;

  useEffect(() => {
    if (!cameraId || !enabled) {
      setStreamState({ status: 'idle' });
      setStream(null);
      return;
    }

    let mounted = true;
    let pc: RTCPeerConnection | null = null;
    let ws: WebSocket | null = null;

    function scheduleReconnect() {
      if (!mounted) return;
      if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
        console.warn('[useGo2RTCStream] Max reconnect attempts reached for', cameraId);
        setStream(null);
        setStreamState({ status: 'failed', error: 'Max reconnection attempts reached' });
        return;
      }
      reconnectAttemptsRef.current += 1;
      console.log(`[useGo2RTCStream] Reconnecting camera ${cameraId} (attempt ${reconnectAttemptsRef.current})`);
      reconnectTimeoutRef.current = setTimeout(() => {
        reconnectTimeoutRef.current = null;
        setRetryCount((c) => c + 1);
      }, RECONNECT_DELAY_MS);
    }

    async function connectToStream() {
      try {
        setStreamState({ status: 'connecting' });

        const response = await fetch(`/api/cameras/${cameraId}/stream`);
        let data: { webrtcUrl?: string; error?: string; hint?: string };
        try {
          data = await response.json();
        } catch {
          data = {};
        }
        if (!response.ok) {
          const msg = data?.error || data?.hint || response.statusText;
          throw new Error(msg);
        }
        const webrtcUrl = data.webrtcUrl;
        if (!webrtcUrl) {
          throw new Error(data?.error || data?.hint || 'No stream URL returned');
        }

        const wsUrl = webrtcUrlToWs(webrtcUrl);
        pc = new RTCPeerConnection({
          iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
        });
        pcRef.current = pc;

        pc.ontrack = (event) => {
          if (!mounted) return;
          const mediaStream = event.streams[0];
          mediaStream.getTracks().forEach((track) => {
            track.onended = () => {
              if (!mounted) return;
              setStream(null);
              setStreamState({ status: 'failed', error: 'Track ended' });
              scheduleReconnect();
            };
          });
          setStream(mediaStream);
          reconnectAttemptsRef.current = 0;
          setStreamState({ status: 'connected' });
        };

        pc.onconnectionstatechange = () => {
          if (!mounted) return;
          const state = pc?.connectionState;
          if (state === 'connected') {
            reconnectAttemptsRef.current = 0;
          }
          if (state === 'failed' || state === 'disconnected') {
            setStream(null);
            setStreamState({ status: 'failed', error: `Connection ${state}` });
            scheduleReconnect();
          }
          if (state === 'closed') {
            setStream(null);
            setStreamState({ status: 'failed', error: 'Connection closed' });
          }
        };

        pc.addTransceiver('video', { direction: 'recvonly' });
        pc.addTransceiver('audio', { direction: 'recvonly' });

        await new Promise<void>((resolve, reject) => {
          ws = new WebSocket(wsUrl);
          wsRef.current = ws;

          ws.onopen = () => {
            pc!.addEventListener('icecandidate', (ev) => {
              if (!ev.candidate) return;
              ws?.send(JSON.stringify({ type: 'webrtc/candidate', value: ev.candidate.candidate }));
            });
            pc!.createOffer().then((offer) => pc!.setLocalDescription(offer)).then(() => {
              ws?.send(JSON.stringify({ type: 'webrtc/offer', value: pc!.localDescription!.sdp }));
            });
          };

          ws.onmessage = async (ev) => {
            try {
              const msg = JSON.parse(ev.data);
              if (msg.type === 'webrtc/candidate') {
                await pc?.addIceCandidate({ candidate: msg.value, sdpMid: '0' }).catch(() => {});
              } else if (msg.type === 'webrtc/answer') {
                if (pc && pc.signalingState !== 'closed') {
                  await pc.setRemoteDescription({ type: 'answer', sdp: msg.value });
                }
                resolve();
              }
            } catch (e) {
              reject(new Error('Invalid WebSocket message'));
            }
          };

          ws.onerror = () => reject(new Error('WebSocket error'));
          ws.onclose = (ev) => {
            if (!ev.wasClean) reject(new Error('WebSocket closed'));
          };
        });
      } catch (error: any) {
        console.error('[useGo2RTCStream] Error:', error?.message ?? String(error));
        if (mounted) {
          setStream(null);
          setStreamState({ status: 'failed', error: error.message });
        }
      }
    }

    if (autoPlay) {
      connectToStream();
    }

    return () => {
      mounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      ws?.close();
      pc?.close();
      wsRef.current = null;
      pcRef.current = null;
    };
  }, [cameraId, autoPlay, retryCount, enabled]);

  return {
    streamState,
    stream,
    error: streamState.error,
    retry,
    forceReconnect,
  };
}

'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Settings, Eye, EyeOff } from 'lucide-react';
import { useGo2RTCStream } from '../../lib/hooks/useGo2RTCStream';
import CameraFullscreenModal from './CameraFullscreenModal';
import CameraSettingsPanel from './CameraSettingsPanel';
import RealtimeDetectionOverlay from '../RealtimeDetectionOverlay';

interface CameraTileProps {
  camera: {
    id: string;
    name: string;
    zone?: string | null;
    status?: string;
    rules?: any[];
    streamUrl?: string | null;
    location?: string | null;
  };
  onDeleted: () => void;
  onUpdated?: (updated: { id: string; name: string; zone?: string | null; location?: string | null }) => void;
}

export default function CameraTile({ camera, onDeleted, onUpdated }: CameraTileProps) {
  const [showFullscreen, setShowFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [overlayOn, setOverlayOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);

  const { stream, hlsUrl, streamState, forceReconnect } = useGo2RTCStream({
    cameraId: camera.id,
    autoPlay: true,
  });

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  useEffect(() => {
    if (!hlsUrl || !videoRef.current) return;
    if (videoRef.current.srcObject) videoRef.current.srcObject = null;

    import('hls.js').then(({ default: Hls }) => {
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 3,
          maxBufferLength: 4,
        });
        hlsRef.current = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(videoRef.current!);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => {});
        });
      } else if (videoRef.current!.canPlayType('application/vnd.apple.mpegurl')) {
        videoRef.current!.src = hlsUrl;
        videoRef.current!.play().catch(() => {});
      }
    });

    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [hlsUrl]);

  // Snap back to live edge when the user returns to the tab
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const video = videoRef.current;
      if (!video) return;
      if (hlsRef.current) {
        // hls.js: seek to live edge
        const hls = hlsRef.current;
        if (hls.liveSyncPosition != null) {
          video.currentTime = hls.liveSyncPosition;
        }
      } else if (video.seekable.length > 0) {
        // Native HLS (Safari): seek to end of seekable range
        video.currentTime = video.seekable.end(video.seekable.length - 1);
      }
      video.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hlsUrl]);

  const status =
    streamState?.status === 'connected' || streamState?.status === 'live'
      ? 'online'
      : streamState?.status === 'failed'
        ? 'error'
        : 'offline';

  const statusColor =
    status === 'online' ? 'bg-green-400' : status === 'error' ? 'bg-red-400' : 'bg-slate-400';

  const rulesCount = camera.rules?.length ?? 0;

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
        <div className="relative aspect-video bg-slate-900">
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
          {overlayOn && (
            <RealtimeDetectionOverlay cameraId={camera.id} videoElement={videoRef.current} isActive={overlayOn} />
          )}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-white text-xs font-medium">{camera.name}</span>
              {(camera.zone || camera.location) && (
                <span className="text-white/60 text-xs">{camera.zone ?? camera.location}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setOverlayOn((v) => !v)} className="p-1.5 rounded-md bg-black/30 text-white hover:bg-black/50 transition-colors" title={overlayOn ? 'Hide overlay' : 'Show overlay'}>
                {overlayOn ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
              <button onClick={() => setShowFullscreen(true)} className="p-1.5 rounded-md bg-black/30 text-white hover:bg-black/50 transition-colors" title="Fullscreen">
                <Maximize2 size={14} />
              </button>
              <button onClick={() => setShowSettings(true)} className="p-1.5 rounded-md bg-black/30 text-white hover:bg-black/50 transition-colors" title="Settings">
                <Settings size={14} />
              </button>
            </div>
          </div>
        </div>
        <div className="px-3 py-2 flex items-center justify-between">
          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">{status}</span>
          <span className="text-xs text-slate-400">{rulesCount} rules</span>
        </div>
      </div>

      {showFullscreen && (
        <CameraFullscreenModal camera={camera} onClose={() => setShowFullscreen(false)} initialStream={stream} />
      )}
      {showSettings && (
        <CameraSettingsPanel camera={camera} onClose={() => setShowSettings(false)} onDeleted={onDeleted} onUpdated={onUpdated} onReconnect={forceReconnect} />
      )}
    </>
  );
}

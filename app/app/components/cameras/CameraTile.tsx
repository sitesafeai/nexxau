'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
    /** Raw DB string. Unreliable — see isOnline. Kept for display/debugging only. */
    status?: string;
    /** Derived by isCameraOnline() server-side in /api/cameras. The trustworthy one. */
    isOnline?: boolean;
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

  const snapToLive = useCallback(() => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (!video) return;
    // Seek to the live edge of the seekable range
    if (video.seekable.length > 0) {
      video.currentTime = video.seekable.end(video.seekable.length - 1);
    } else if (hls && (hls as any).liveSyncPosition) {
      video.currentTime = (hls as any).liveSyncPosition;
    }
    if (video.paused) video.play().catch(() => {});
  }, []);

  const startHls = useCallback((url: string) => {
    const video = videoRef.current;
    if (!video) return;
    if (video.srcObject) video.srcObject = null;

    import('hls.js').then(({ default: Hls }) => {
      if (!videoRef.current) return;
      if (Hls.isSupported()) {
        if (hlsRef.current) hlsRef.current.destroy();
        const hls = new Hls({
          // Low-latency tuning: stay 1 segment behind live, catch up aggressively
          lowLatencyMode: true,
          liveSyncDurationCount: 1,
          liveMaxLatencyDurationCount: 2,
          maxBufferLength: 4,
          maxMaxBufferLength: 6,
          backBufferLength: 0,       // don't keep back buffer — we only need live
          liveDurationInfinity: true,
        });
        hlsRef.current = hls;
        hls.loadSource(url);
        hls.attachMedia(videoRef.current);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => {});
        });
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS — seek to live edge on load
        videoRef.current.src = url;
        videoRef.current.addEventListener('loadedmetadata', () => {
          const v = videoRef.current;
          if (v && v.seekable.length > 0) v.currentTime = v.seekable.end(v.seekable.length - 1);
          v?.play().catch(() => {});
        }, { once: true });
      }
    });
  }, []);

  useEffect(() => {
    if (!hlsUrl) return;
    startHls(hlsUrl);
    return () => { hlsRef.current?.destroy(); hlsRef.current = null; };
  }, [hlsUrl, startHls]);

  // On tab return: snap to live edge instead of restarting from scratch.
  // Only do a full restart if the HLS instance died while the tab was hidden.
  useEffect(() => {
    if (!hlsUrl) return;
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      if (hlsRef.current) {
        snapToLive();
      } else {
        startHls(hlsUrl);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [hlsUrl, startHls, snapToLive]);

  // Two different questions, previously conflated into one green dot:
  //
  //   streamState — can THIS BROWSER play the HLS stream right now?
  //   camera.isOnline — has the YOLO detector seen frames recently?
  //
  // The dot showed the first and was labelled "Online", so a camera whose stream
  // still served while the detector hadn't ingested for 10 days read as online here
  // and 0/1 on the dashboard. The dot now reflects the camera (what a safety manager
  // means by online); stream playback is reported separately underneath.
  const cameraOnline = camera.isOnline === true;
  // useGo2RTCStream only ever emits 'connecting' | 'connected' | 'failed' | 'idle'.
  // The old code also tested for 'live', which the hook never produces — a dead
  // comparison tsc had been flagging.
  const streamLive = streamState?.status === 'connected';
  const streamFailed = streamState?.status === 'failed';

  const status = cameraOnline ? 'online' : 'offline';
  const statusColor = cameraOnline
    ? 'bg-green-400'
    : streamFailed
      ? 'bg-red-400'
      : 'bg-slate-400';

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
          <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
            {status}
            {/* Called out separately because they genuinely differ: the relay can keep
                serving video after the detector has stopped ingesting, and that gap is
                exactly what made this tile disagree with the dashboard. */}
            {!cameraOnline && streamLive && (
              <span className="ml-1.5 text-amber-500">· stream live, not detecting</span>
            )}
            {cameraOnline && streamFailed && (
              <span className="ml-1.5 text-amber-500">· detecting, stream won&apos;t play</span>
            )}
          </span>
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

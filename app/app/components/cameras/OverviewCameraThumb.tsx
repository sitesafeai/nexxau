'use client';

import { useEffect, useRef, useState } from 'react';
import { useGo2RTCStream } from '@/app/lib/hooks/useGo2RTCStream';

type OverviewCameraThumbProps = {
  camera: { id: string; name: string };
};

/**
 * Small live preview for dashboard overview — same WebRTC path as CameraTile.
 * WebRTC starts after the tile is near the viewport (or idle fallback) so metrics/API work is not contended.
 */
export default function OverviewCameraThumb({ camera }: OverviewCameraThumbProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [streamEnabled, setStreamEnabled] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setStreamEnabled(true);
      },
      { rootMargin: '180px 0px', threshold: 0.01 }
    );
    obs.observe(el);

    let idleId: number | undefined;
    if (typeof requestIdleCallback !== 'undefined') {
      idleId = requestIdleCallback(() => setStreamEnabled(true), { timeout: 4500 });
    }

    const fallbackTimer = window.setTimeout(() => setStreamEnabled(true), 5000);

    return () => {
      obs.disconnect();
      if (idleId !== undefined && typeof cancelIdleCallback !== 'undefined') {
        cancelIdleCallback(idleId);
      }
      clearTimeout(fallbackTimer);
    };
  }, []);

  const { stream, streamState } = useGo2RTCStream({
    cameraId: camera.id,
    autoPlay: true,
    enabled: streamEnabled,
  });

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [stream]);

  const status = streamState?.status;
  const showOverlay =
    status === 'connecting' || status === 'failed' || status === 'idle';

  return (
    <div
      ref={containerRef}
      className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video group cursor-pointer border border-slate-700/50"
      onClick={() => {
        window.dispatchEvent(new CustomEvent('switchTab', { detail: 'cameras' }));
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('switchTab', { detail: 'cameras' }));
        }
      }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full h-full object-cover"
      />

      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90">
          {status === 'connecting' ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="text-center px-2">
              <div className="w-2 h-2 rounded-full bg-red-500 mx-auto mb-1" />
              <p className="text-gray-500 text-xs capitalize">
                {status === 'failed' ? 'offline' : status}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              status === 'connected' ? 'bg-green-400' : 'bg-gray-400'
            }`}
          />
          <span className="text-white text-xs font-medium truncate">{camera.name}</span>
        </div>
      </div>

      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center pointer-events-none">
        <span className="text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity font-medium">
          View Cameras
        </span>
      </div>
    </div>
  );
}

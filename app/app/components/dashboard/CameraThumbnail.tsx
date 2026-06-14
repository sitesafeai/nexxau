"use client";
import { useState, useEffect, useRef } from 'react';

interface CameraThumbnailProps {
  cameraId: string;
  cameraName: string;
  isOnline: boolean;
  /** How often to refresh the thumbnail in ms. Default 15000 (15s). */
  refreshInterval?: number;
}

/**
 * Shows a static JPEG thumbnail from MediaMTX via /api/hls/{id}/thumbnail.
 * Refreshes every `refreshInterval` ms while the camera is online.
 * Falls back to the camera-icon placeholder on load failure or offline status.
 */
export default function CameraThumbnail({
  cameraId,
  cameraName,
  isOnline,
  refreshInterval = 15000,
}: CameraThumbnailProps) {
  const [tick, setTick] = useState(0);
  const [failed, setFailed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Refresh periodically only when online
  useEffect(() => {
    if (!isOnline) return;
    setFailed(false); // retry when camera comes back online
    timerRef.current = setInterval(() => setTick((t) => t + 1), refreshInterval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isOnline, refreshInterval]);

  const thumbnailSrc = `/api/hls/${cameraId}/thumbnail?t=${tick}`;

  if (!isOnline || failed) {
    return (
      <div className="w-full h-full bg-slate-800 flex flex-col items-center justify-center gap-1">
        <svg
          className="w-8 h-8 text-slate-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {!isOnline && (
          <span className="text-[9px] text-slate-500 font-medium uppercase tracking-wide">
            Offline
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      key={tick} // force re-mount on tick so browser re-fetches
      src={thumbnailSrc}
      alt={`${cameraName} thumbnail`}
      className="w-full h-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

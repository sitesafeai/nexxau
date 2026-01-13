/**
 * JanusCameraPlayer Component
 * 
 * Production-ready React component for displaying Janus WebRTC camera streams.
 * 
 * Features:
 * - Fetches camera metadata from backend
 * - Manages Janus WebRTC connection lifecycle
 * - Handles errors, retries, and cleanup
 * - Displays appropriate UI states (loading, live, offline, error)
 * 
 * Usage:
 * <JanusCameraPlayer cameraId="camera-123" />
 */

'use client';

import { useEffect, useRef } from 'react';
import { useJanusStream } from '@/app/lib/hooks/useJanusStream';

export interface JanusCameraPlayerProps {
  cameraId: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  className?: string;
  onError?: (error: string) => void;
  onStateChange?: (state: 'loading' | 'live' | 'offline' | 'error') => void;
}

/**
 * JanusCameraPlayer - Main component
 */
export default function JanusCameraPlayer({
  cameraId,
  autoPlay = true,
  muted = true,
  controls = false,
  className = '',
  onError,
  onStateChange,
}: JanusCameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const {
    streamState,
    stream,
    error,
    errorCode, // FIX 5: Get error code for UI state differentiation
    disconnect,
    retry,
  } = useJanusStream({
    cameraId,
    autoConnect: true,
    onError,
  });

  /**
   * Attach MediaStream to video element
   */
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) return;

    // Stop existing tracks before attaching new stream
    if (video.srcObject) {
      const oldStream = video.srcObject as MediaStream;
      oldStream.getTracks().forEach(track => track.stop());
    }

    // Attach new stream
    video.srcObject = stream;

    // Handle autoplay
    if (autoPlay) {
      video.play().catch((err) => {
        // Autoplay may be blocked by browser policy
        if (err.name !== 'NotAllowedError') {
          console.error('[JanusCameraPlayer] Play error:', err);
        }
      });
    }

    // Cleanup on unmount
    return () => {
      if (video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    };
  }, [stream, autoPlay]);

  /**
   * Notify parent of state changes
   */
  useEffect(() => {
    onStateChange?.(streamState);
  }, [streamState, onStateChange]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      disconnect();
      const video = videoRef.current;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
      }
    };
  }, [disconnect]);

  /**
   * Render state overlay
   */
  const renderOverlay = () => {
    if (streamState === 'live' && stream) {
      return null; // Hide overlay when stream is live
    }

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm rounded-lg z-10">
        <div className="text-center p-4">
          {streamState === 'loading' && (
            <>
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
              <p className="text-white text-sm">Connecting to stream...</p>
            </>
          )}
          
          {streamState === 'offline' && (
            <>
              <svg
                className="w-12 h-12 text-yellow-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-yellow-400 font-semibold mb-2">Stream Offline</p>
              <p className="text-yellow-300 text-sm mb-4">The camera stream is currently unavailable</p>
              <button
                onClick={retry}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Retry Connection
              </button>
            </>
          )}
          
          {streamState === 'error' && (
            <>
              <svg
                className="w-12 h-12 text-red-400 mx-auto mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {/* FIX 5: Show specific UI states for multi-viewer errors */}
              {errorCode === 'TOO_MANY_VIEWERS' ? (
                <>
                  <p className="text-orange-400 font-semibold mb-2">Too Many Viewers</p>
                  <p className="text-orange-300 text-sm mb-4">Stream busy - too many viewers. Please try again later.</p>
                  <button
                    onClick={retry}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
                </>
              ) : errorCode === 'STREAM_BUSY' ? (
                <>
                  <p className="text-orange-400 font-semibold mb-2">Stream Busy</p>
                  <p className="text-orange-300 text-sm mb-4">Stream is currently busy. Please try again in a moment.</p>
                  <button
                    onClick={retry}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
                </>
              ) : (
                <>
                  <p className="text-red-400 font-semibold mb-2">Connection Error</p>
                  <p className="text-red-300 text-sm mb-4">{error || 'Failed to connect to stream'}</p>
                  <button
                    onClick={retry}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    Retry Connection
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full object-contain bg-slate-900 rounded-lg"
        autoPlay={autoPlay}
        playsInline
        muted={muted}
        controls={controls}
        style={{ minHeight: '200px' }}
      />
      {renderOverlay()}
    </div>
  );
}

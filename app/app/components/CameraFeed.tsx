'use client';

import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, PauseIcon, ArrowsPointingOutIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface CameraFeedProps {
  streamUrl?: string;
  fallbackVideo?: string;
  title?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  className?: string;
}

export default function CameraFeed({
  streamUrl = 'http://localhost:5001/video_feed',
  fallbackVideo = '/demo-third-aprty-sitesafe.mov',
  title = 'Live Camera Feed',
  showControls = true,
  autoPlay = true,
  className = ''
}: CameraFeedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamMode, setStreamMode] = useState<'stream' | 'fallback'>('stream');
  const videoRef = useRef<HTMLVideoElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Handle stream image load
  const handleStreamLoad = () => {
    setLoading(false);
    setError(false);
    setStreamMode('stream');
  };

  // Handle stream image error
  const handleStreamError = () => {
    console.log('Stream failed, falling back to video');
    setStreamMode('fallback');
    setError(false);
    setLoading(false);
  };

  // Handle video load
  const handleVideoLoad = () => {
    setLoading(false);
    setError(false);
  };

  // Handle video error
  const handleVideoError = () => {
    setError(true);
    setLoading(false);
  };

  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          videoRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  // Retry connection
  const retryConnection = () => {
    setLoading(true);
    setError(false);
    setStreamMode('stream');
    setReloadKey(prev => prev + 1);
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className={`relative bg-gray-900 rounded-lg overflow-hidden border border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 bg-gray-800 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className="flex items-center space-x-2">
          {showControls && streamMode === 'fallback' && (
            <>
              <button
                onClick={togglePlay}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="h-5 w-5" />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-400 hover:text-white transition-colors"
                title="Fullscreen"
              >
                <ArrowsPointingOutIcon className="h-5 w-5" />
              </button>
            </>
          )}
          <button
            onClick={retryConnection}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Retry Connection"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Video Container */}
      <div className="relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">
                {streamMode === 'stream' ? 'Connecting to camera stream...' : 'Loading video...'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center">
              <div className="text-red-400 text-6xl mb-4">📹</div>
              <p className="text-red-400 font-semibold mb-2">Camera Unavailable</p>
              <p className="text-gray-400 mb-4">Unable to connect to camera feed</p>
              <button
                onClick={retryConnection}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Stream Mode (Image-based) */}
        {streamMode === 'stream' && !error && (
          <img
            key={reloadKey}
            ref={imgRef}
            src={`${streamUrl}?t=${reloadKey}`}
            alt="Live Camera Stream"
            className="w-full h-auto max-h-96 object-cover"
            onLoad={handleStreamLoad}
            onError={handleStreamError}
            crossOrigin="anonymous"
            style={{ display: loading ? 'none' : 'block' }}
          />
        )}

        {/* Fallback Mode (Video-based) */}
        {streamMode === 'fallback' && !error && (
          <video
            ref={videoRef}
            className="w-full h-auto max-h-96 object-cover"
            autoPlay={autoPlay}
            loop
            muted
            playsInline
            onLoadStart={() => setLoading(true)}
            onCanPlay={() => handleVideoLoad()}
            onError={handleVideoError}
          >
            <source src={fallbackVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>

      {/* Status Bar */}
      <div className="px-4 py-2 bg-gray-800 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              error ? 'bg-red-500' : 
              loading ? 'bg-yellow-500' : 
              'bg-green-500'
            }`}></div>
            <span className="text-gray-400">
              {error ? 'Offline' : 
               loading ? 'Connecting...' : 
               streamMode === 'stream' ? 'Live Stream' : 'Demo Video'}
            </span>
          </div>
          {streamMode === 'fallback' && !error && (
            <span className="text-gray-500 text-xs">
              Demo Mode - {isPlaying ? 'Playing' : 'Paused'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Multi-camera grid component
interface CameraGridProps {
  cameras: Array<{
    id: string;
    name: string;
    streamUrl?: string;
    status: 'active' | 'inactive' | 'error';
  }>;
  columns?: number;
}

export function CameraGrid({ cameras, columns = 2 }: CameraGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-${columns} lg:grid-cols-${columns} gap-4`}>
      {cameras.map((camera) => (
        <CameraFeed
          key={camera.id}
          title={camera.name}
          streamUrl={camera.streamUrl}
          showControls={true}
          autoPlay={camera.status === 'active'}
        />
      ))}
    </div>
  );
} 
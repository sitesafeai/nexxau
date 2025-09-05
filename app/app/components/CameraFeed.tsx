'use client';

import React, { useState, useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { PlayIcon, PauseIcon, ArrowsPointingOutIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface CameraFeedProps {
  streamUrl?: string;
  fallbackVideo?: string;
  title?: string;
  showControls?: boolean;
  autoPlay?: boolean;
  className?: string;
  cameraId?: string;
}

export default function CameraFeed({
  streamUrl = '',
  fallbackVideo = 'https://test-streams.mux.dev/bbb-360p.m3u8',
  title = 'Live Camera Feed',
  showControls = true,
  autoPlay = true,
  className = '',
  cameraId,
}: CameraFeedProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [streamMode, setStreamMode] = useState<'stream' | 'fallback'>('stream');
  const [showSettings, setShowSettings] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isHls = !!streamUrl && streamUrl.endsWith('.m3u8');
  const isDirectVideo = !!streamUrl && (streamUrl.endsWith('.mp4') || streamUrl.endsWith('.webm'));
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const [detections, setDetections] = useState<any[]>([]);

  // Initialize HLS playback when streamUrl is HLS (.m3u8)
  useEffect(() => {
    if (!videoRef.current) return;
    if (!isHls) return;

    const video = videoRef.current;
    console.log('Initializing HLS for:', streamUrl);

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      console.log('Using HLS.js');
      try {
        hls = new Hls({ 
          enableWorker: true,
          debug: true
        });
        hlsRef.current = hls;
        
        hls.loadSource(streamUrl);
        hls.attachMedia(video);
        
        // HLS.js event (manifest parsed) - only log, don't change UI state
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log("✅ HLS manifest parsed");
        });
        
        // Handle HLS.js errors
        hls.on(Hls.Events.ERROR, (event: any, data: any) => {
          console.error("❌ HLS error:", event, data);
          setError(true);
          setLoading(false);
        });
        
      } catch (error) {
        console.error('Failed to initialize HLS.js:', error);
        setError(true);
        setLoading(false);
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari, iOS)
      console.log('Using native HLS support');
      video.src = streamUrl;
    }

    // Video element readiness events - this is where we control the UI state
    const onCanPlay = () => {
      console.log("🎥 Video can play");
      setLoading(false);
      setError(false);
      setStreamMode('stream');
      setIsRetrying(false);
      if (autoPlay) {
        video.play().catch(() => undefined);
      }
    };

    const onError = () => {
      console.error("❌ Video element error");
      setError(true);
      setLoading(false);
      setIsRetrying(false);
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("loadedmetadata", onCanPlay);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("loadedmetadata", onCanPlay);
      video.removeEventListener("error", onError);
      if (hls) {
        hls.destroy();
      }
    };
  }, [streamUrl, autoPlay, reloadKey, isHls]);

  // Handle non-HLS direct video source
  useEffect(() => {
    if (!videoRef.current) return;
    if (!isDirectVideo) return;
    const video = videoRef.current;
    setLoading(true);
    const onCanPlay = () => {
      setLoading(false);
      setError(false);
      setStreamMode('stream');
      if (autoPlay) {
        video.play().catch(() => undefined);
      }
    };
    const onErr = () => {
      setError(true);
      setLoading(false);
    };
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('error', onErr);
    return () => {
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('error', onErr);
    };
  }, [isDirectVideo, autoPlay, reloadKey]);

  // Video element readiness events - this is where we control the UI state
  const onVideoReady = () => {
    console.log("🎥 Video ready to play");
    setLoading(false);
    setError(false);
    setStreamMode('stream');
    setIsRetrying(false);
  };

  const onVideoError = () => {
    console.error("❌ Video element error");
    setError(true);
    setLoading(false);
    setIsRetrying(false);
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

  // Retry connection (more subtle)
  const retryConnection = () => {
    setIsRetrying(true);
    setError(false);
    setReloadKey(prev => prev + 1);
    
    // Add a small delay to make the retry more visible but not jarring
    setTimeout(() => {
      setLoading(true);
    }, 100);
  };

  // Subscribe to detection SSE and draw overlay
  useEffect(() => {
    if (!cameraId) return;
    const url = `/api/detections/stream?cameraId=${encodeURIComponent(cameraId)}`;
    const es = new EventSource(url);
    es.onmessage = (ev) => {
      try {
        const payload = JSON.parse(ev.data);
        setDetections(payload.detections || []);
      } catch {}
    };
    es.onerror = () => {
      // auto-reconnect is built-in; optionally can close
    };
    return () => es.close();
  }, [cameraId]);

  // Draw boxes on canvas overlay according to video size
  useEffect(() => {
    const video = videoRef.current;
    const canvas = overlayRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = video.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      detections.forEach((d) => {
        const { x, y, w, h } = d.box || {};
        if (typeof x !== 'number') return;
        ctx.strokeStyle = 'rgba(59,130,246,0.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * canvas.width, y * canvas.height, w * canvas.width, h * canvas.height);
        if (d.label) {
          ctx.fillStyle = 'rgba(59,130,246,0.9)';
          ctx.font = '12px sans-serif';
          const text = `${d.label} ${(d.score ?? 0).toFixed?.(2)}`;
          const tx = x * canvas.width;
          const ty = Math.max(12, y * canvas.height - 4);
          ctx.fillRect(tx, ty - 12, ctx.measureText(text).width + 6, 14);
          ctx.fillStyle = '#111827';
          ctx.fillText(text, tx + 3, ty);
        }
      });
      requestAnimationFrame(draw);
    };

    const raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [detections]);

  // Toggle settings
  const toggleSettings = () => {
    setShowSettings(!showSettings);
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
            onClick={toggleSettings}
            className="p-2 text-gray-400 hover:text-white transition-colors"
            title="Camera Settings"
          >
            <Cog6ToothIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-white">Camera Settings</h4>
            <button
              onClick={toggleSettings}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Connection Status</span>
              <span className={`text-sm px-2 py-1 rounded ${
                error ? 'bg-red-900 text-red-300' : 
                loading ? 'bg-yellow-900 text-yellow-300' : 
                'bg-green-900 text-green-300'
              }`}>
                {error ? 'Offline' : loading ? 'Connecting...' : 'Connected'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Stream Mode</span>
              <span className="text-sm text-gray-400">
                {streamMode === 'stream' ? 'Live Stream' : 'Demo Video'}
              </span>
            </div>
            <div className="space-y-2">
              <button
                onClick={retryConnection}
                disabled={isRetrying}
                className={`w-full px-3 py-2 text-sm rounded transition-colors ${
                  isRetrying 
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {isRetrying ? 'Retrying...' : 'Retry Connection'}
              </button>
              <button
                onClick={() => {
                  console.log('Force fallback video');
                  setStreamMode('fallback');
                  setError(false);
                  setLoading(true);
                  setReloadKey(prev => prev + 1);
                }}
                className="w-full px-3 py-2 text-sm rounded bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                Force Demo Video
              </button>
            </div>
          </div>
        </div>
      )}

              {/* Video Container */}
        <div className="relative">
          {/* Debug info */}
          <div className="absolute top-2 left-2 z-20 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
            <div>Stream: {streamUrl || 'none'}</div>
            <div>Fallback: {fallbackVideo}</div>
            <div>Mode: {streamMode}</div>
            <div>Loading: {loading.toString()}</div>
            <div>Error: {error.toString()}</div>
          </div>

          {loading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                <p className="text-gray-400">
                  {isRetrying ? 'Retrying connection...' : 'Connecting to camera stream...'}
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
                <div className="space-y-2">
                  <button
                    onClick={retryConnection}
                    disabled={isRetrying}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      isRetrying 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {isRetrying ? 'Retrying...' : 'Retry Connection'}
                  </button>
                  <button
                    onClick={() => {
                      console.log('Force fallback video');
                      setStreamMode('fallback');
                      setError(false);
                      setLoading(true);
                      setReloadKey(prev => prev + 1);
                    }}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
                  >
                    Force Demo Video
                  </button>
                </div>
              </div>
            </div>
          )}

        {/* Playback selection */}
        {isHls || isDirectVideo ? (
          <video
            key={reloadKey}
            ref={videoRef}
            className="w-full h-auto max-h-96 object-cover"
            autoPlay={autoPlay}
            muted
            playsInline
            controls={showControls}
            onLoadStart={() => {
              console.log('Video load started');
              setLoading(true);
            }}
            onCanPlay={() => {
              console.log('Video can play');
              onVideoReady();
            }}
            onError={(e) => {
              console.log('Video error event:', e);
              onVideoError();
            }}
            onLoadedData={() => {
              console.log('Video loaded data');
            }}
            onLoadedMetadata={() => {
              console.log('Video loaded metadata');
              onVideoReady();
            }}
          >
            {isHls && streamUrl && (
              <source src={streamUrl} type="application/vnd.apple.mpegurl" />
            )}
            {isDirectVideo && streamUrl && (
              <source src={streamUrl} />
            )}
            {/* Always include fallback as backup */}
            <source src={fallbackVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : streamUrl ? (
          // Assume MJPEG or snapshot refresh endpoint
          <img
            key={reloadKey}
            src={`${streamUrl}${streamUrl.includes('?') ? '&' : '?'}t=${reloadKey}`}
            alt="Live Camera Stream"
            className="w-full h-auto max-h-96 object-cover"
            crossOrigin="anonymous"
            onLoad={() => {
              setLoading(false);
              setError(false);
              setStreamMode('stream');
              setIsRetrying(false);
            }}
            onError={() => {
              setError(true);
              setLoading(false);
              setIsRetrying(false);
            }}
            style={{ display: loading ? 'none' : 'block' }}
          />
        ) : (
          <video
            ref={videoRef}
            className="w-full h-auto max-h-96 object-cover"
            autoPlay={autoPlay}
            loop
            muted
            playsInline
            controls={showControls}
            onLoadStart={() => setLoading(true)}
            onCanPlay={() => onVideoReady()}
            onError={() => onVideoError()}
          >
            <source src={fallbackVideo} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        )}

        {/* Detection overlay */}
        <canvas ref={overlayRef} className="pointer-events-none absolute inset-0" />
        
        {/* Simple test video for debugging */}
        <div className="mt-4 p-4 bg-gray-800 rounded">
          <h4 className="text-white text-sm mb-2">Debug: Simple Video Test</h4>
          <video 
            className="w-full h-32 bg-gray-700"
            controls
            muted
            playsInline
            onLoadStart={() => console.log('Test video load start')}
            onCanPlay={() => console.log('Test video can play')}
            onError={(e) => console.log('Test video error:', e)}
            onLoadedMetadata={() => console.log('Test video loaded metadata')}
          >
            <source src="https://test-streams.mux.dev/bbb-360p.m3u8" type="application/vnd.apple.mpegurl" />
            <source src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>
          
          {/* HLS.js test */}
          <div className="mt-2">
            <button
              onClick={() => {
                const testVideo = document.createElement('video');
                testVideo.controls = true;
                testVideo.muted = true;
                testVideo.style.width = '100%';
                testVideo.style.height = '100px';
                
                if (Hls.isSupported()) {
                  console.log('HLS.js is supported, testing...');
                  const hls = new Hls({ debug: true });
                  hls.loadSource('https://test-streams.mux.dev/bbb-360p.m3u8');
                  hls.attachMedia(testVideo);
                  hls.on(Hls.Events.MANIFEST_PARSED, () => {
                    console.log('Test HLS manifest parsed');
                    testVideo.play();
                  });
                  hls.on(Hls.Events.ERROR, (event: any, data: any) => {
                    console.error('Test HLS error:', event, data);
                  });
                } else {
                  console.log('HLS.js not supported');
                  testVideo.src = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
                }
                
                // Replace the test video
                const container = document.querySelector('.mt-4.p-4.bg-gray-800.rounded video');
                if (container && container.parentNode) {
                  container.parentNode.replaceChild(testVideo, container);
                }
              }}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              Test HLS.js
            </button>
          </div>
        </div>
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
               loading ? (isRetrying ? 'Retrying...' : 'Connecting...') : 
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
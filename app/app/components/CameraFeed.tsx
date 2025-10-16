import React, { useRef, useEffect, useCallback, useState } from 'react';
import Hls from 'hls.js';
import RealtimeDetectionOverlay from './RealtimeDetectionOverlay';

interface CameraFeedProps {
  streamUrl: string;
  className?: string;
  autoPlay?: boolean;
  cameraId?: string;
  enableDetection?: boolean;
}

const CameraFeed: React.FC<CameraFeedProps> = ({ 
  streamUrl, 
  className = '',
  autoPlay = false,
  cameraId,
  enableDetection = false
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      console.log('Cleaning up HLS instance');
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  }, []);

  // Initialize HLS
  const initializeHLS = useCallback(() => {
    if (!videoRef.current || !streamUrl) {
      console.log('Video ref or stream URL not available');
      return;
    }

    console.log('Initializing HLS for:', streamUrl);
    
    // Check if it's an RTSP stream - use WebRTC conversion
    if (streamUrl.startsWith('rtsp://')) {
      console.log('RTSP stream detected - using direct embedding');
      // For RTSP, we'll show it in an iframe using a converter service
      setIsLoading(false);
      setError(null);
      return;
    }
    
    // Clean up existing instance
    cleanup();
    
    setIsLoading(true);
    setError(null);

    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true, // Enable low latency for live streams
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 600,
        maxBufferSize: 60 * 1000 * 1000,
        maxBufferHole: 0.5,
        highBufferWatchdogPeriod: 3,
        nudgeOffset: 0.1,
        nudgeMaxRetry: 10, // Increased retries
        maxFragLookUpTolerance: 0.25,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: Infinity,
        liveDurationInfinity: true, // Keep playing indefinitely
        enableSoftwareAES: true,
        manifestLoadingTimeOut: 10000,
        manifestLoadingMaxRetry: Infinity, // Never stop trying to load
        manifestLoadingRetryDelay: 1000,
        manifestLoadingMaxRetryTimeout: 64000,
        startLevel: -1,
        capLevelToPlayerSize: false,
        testBandwidth: true,
        progressive: false,
      });

      hlsRef.current = hls;

      // Event listeners
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log('HLS media attached');
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('HLS manifest parsed', data);
        setIsLoading(false);
        
        if (autoPlay && videoRef.current) {
          videoRef.current.play()
            .then(() => {
              console.log('Video playback started');
              setIsPlaying(true);
            })
            .catch(err => {
              console.log('Autoplay prevented, user interaction required:', err);
              setError('Click to play video (autoplay blocked)');
            });
        }
      });

      hls.on(Hls.Events.LEVEL_LOADED, (event, data) => {
        console.log('Level loaded:', data.level);
      });

      hls.on(Hls.Events.FRAG_LOADED, (event, data) => {
        console.log('Fragment loaded:', data.frag.url);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS Error:', data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log('Fatal network error encountered, trying to recover...');
              setError('Network error occurred');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error encountered, trying to recover...');
              setError('Media error occurred');
              hls.recoverMediaError();
              break;
            default:
              console.log('Fatal error, cannot recover');
              setError('Fatal error occurred');
              cleanup();
              break;
          }
        } else {
          console.warn('Non-fatal HLS error:', data);
        }
      });

      // Load the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      console.log('Using native HLS support');
      videoRef.current.src = streamUrl;
      setIsLoading(false);
      
      if (autoPlay) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => {
            console.log('Native autoplay prevented:', err);
            setError('Click to play video (autoplay blocked)');
          });
      }
    } else {
      console.error('HLS is not supported in this browser');
      setError('HLS streaming not supported in this browser');
      setIsLoading(false);
    }
  }, [streamUrl, autoPlay]); // Removed cleanup dependency

  // Effect to initialize HLS when component mounts or streamUrl changes
  useEffect(() => {
    if (streamUrl) {
      // Small delay to ensure video element is ready
      const timer = setTimeout(initializeHLS, 100);
      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup if no streamUrl
  }, [streamUrl, initializeHLS]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Keep video playing 24/7 - handle page visibility changes
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Force video to keep playing when page becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('Page became visible - ensuring video continues');
        if (video.paused && autoPlay) {
          video.play().catch(err => console.log('Resume play failed:', err));
        }
      }
    };

    // Prevent pausing when tab is hidden
    const handlePause = () => {
      // Auto-resume if it was supposed to be playing
      if (autoPlay && !video.ended) {
        console.log('Video paused, auto-resuming for 24/7 operation');
        setTimeout(() => {
          video.play().catch(err => console.log('Auto-resume failed:', err));
        }, 100);
      }
    };

    // Handle playback stalls
    const handleStalled = () => {
      console.log('Playback stalled, attempting recovery...');
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
    };

    // Handle waiting (buffering)
    const handleWaiting = () => {
      console.log('Video buffering...');
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    video.addEventListener('pause', handlePause);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('waiting', handleWaiting);

    // Periodic health check - ensure video is playing every 5 seconds
    const healthCheckInterval = setInterval(() => {
      if (autoPlay && video.paused && !video.ended && document.visibilityState === 'visible') {
        console.log('Health check: Video paused, restarting...');
        video.play().catch(err => console.log('Health check play failed:', err));
      }
    }, 5000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('waiting', handleWaiting);
      clearInterval(healthCheckInterval);
    };
  }, [autoPlay]);

  // Video event handlers
  const handleVideoPlay = () => {
    console.log('Video play event');
    setIsPlaying(true);
    setError(null);
  };

  const handleVideoPause = () => {
    console.log('Video pause event');
    setIsPlaying(false);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    console.error('Video element error:', e);
    setError('Video playback error');
    setIsLoading(false);
  };

  const handleVideoLoadStart = () => {
    console.log('Video load start');
    setIsLoading(true);
  };

  const handleVideoLoadedData = () => {
    console.log('Video data loaded');
    setIsLoading(false);
  };

  const handleVideoCanPlay = () => {
    console.log('Video can play');
    setIsLoading(false);
  };

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(err => console.error('Play failed:', err));
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className={`camera-feed-container ${className}`}>
      <div className="relative">
        <video
          ref={videoRef}
          className="w-full h-auto"
          controls
          muted
          playsInline
          loop
          preload="auto"
          disablePictureInPicture={false}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onError={handleVideoError}
          onLoadStart={handleVideoLoadStart}
          onLoadedData={handleVideoLoadedData}
          onCanPlay={handleVideoCanPlay}
          style={{
            backgroundColor: '#000',
            maxWidth: '100%',
            height: 'auto'
          }}
        />
        
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
            <div className="text-white">Loading video stream...</div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500 bg-opacity-75">
            <div className="text-white text-center p-4">
              <div className="mb-2">{error}</div>
              {error.includes('autoplay') && (
              <button
                  onClick={handlePlayClick}
                  className="bg-white text-black px-4 py-2 rounded"
                >
                  Play Video
              </button>
              )}
            </div>
          </div>
        )}

          {/* Real-time YOLO Detection Overlay */}
          {enableDetection && cameraId && !error && (
            <RealtimeDetectionOverlay
              cameraId={cameraId}
              videoElement={videoRef.current}
              isActive={isPlaying && !isLoading}
            />
          )}
      </div>

      {/* Debug info (remove in production) - Client-side only to prevent hydration errors */}
      {typeof window !== 'undefined' && (
        <div className="mt-2 text-sm text-gray-600">
          <div>Stream: {streamUrl}</div>
          <div>HLS Supported: {Hls.isSupported() ? 'Yes' : 'No'}</div>
          <div>Status: {isLoading ? 'Loading' : isPlaying ? 'Playing' : 'Paused'}</div>
          {error && <div className="text-red-500">Error: {error}</div>}
          
          {/* Stream URL tester */}
          <div className="mt-2 p-2 bg-gray-100 rounded">
            <div className="font-semibold mb-2">Test with working streams:</div>
            <div className="space-y-1 text-xs">
              <div>✅ Apple: https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_4x3/bipbop_4x3_variant.m3u8</div>
              <div>✅ Cloudflare: https://customer-m033z5x00ks6nunl.cloudflarestream.com/b236bde30eb07b9d01318940e5fc3eda/manifest/video.m3u8</div>
              <div>❌ Current: {streamUrl}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(CameraFeed);
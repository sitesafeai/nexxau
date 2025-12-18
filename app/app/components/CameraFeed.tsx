import React, { useRef, useEffect, useCallback, useState, forwardRef, useImperativeHandle } from 'react';
import Hls from 'hls.js';
import RealtimeDetectionOverlay from './RealtimeDetectionOverlay';

interface CameraFeedProps {
  streamUrl: string;
  className?: string;
  autoPlay?: boolean;
  cameraId?: string;
  enableDetection?: boolean;
}

const CameraFeed = forwardRef<HTMLVideoElement, CameraFeedProps>(({ 
  streamUrl, 
  className = '',
  autoPlay = false,
  cameraId,
  enableDetection = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Expose the video element to parent components
  useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);
  const hlsRef = useRef<Hls | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 3; // Maximum retry attempts (increased for better reliability)
  const [isRetrying, setIsRetrying] = useState(false); // Track if we're silently retrying

  // Keep tab active using Web Audio API (prevents browser throttling)
  useEffect(() => {
    if (autoPlay && typeof window !== 'undefined') {
      try {
        // Create silent audio context to keep tab active
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContext && !audioContextRef.current) {
          audioContextRef.current = new AudioContext();
          const oscillator = audioContextRef.current.createOscillator();
          const gainNode = audioContextRef.current.createGain();
          gainNode.gain.value = 0.001; // Nearly silent
          oscillator.connect(gainNode);
          gainNode.connect(audioContextRef.current.destination);
          oscillator.start();
        }
      } catch (err) {
        // Audio context creation failed - silently continue
      }
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, [autoPlay]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  }, []);

  // Initialize HLS
  const initializeHLS = useCallback(() => {
    if (!videoRef.current || !streamUrl) {
      return;
    }

    // Initialize HLS silently
    
    // Check if it's an RTSP stream - RTSP cannot be played directly in browsers
    if (streamUrl.startsWith('rtsp://')) {
      // RTSP streams must be converted to HLS via MediaMTX or similar service
      // If we receive an RTSP URL here, it means the conversion failed
      setIsLoading(false);
      setError('RTSP streams must be converted to HLS. Please configure MediaMTX path or provide an HLS URL.');
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
        // Media attached successfully
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        // Reset retry state on successful manifest parse
        setIsRetrying(false);
        retryCountRef.current = 0;
        setIsLoading(false);
        
        if (autoPlay && videoRef.current) {
          videoRef.current.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              // Autoplay prevented - user will need to click
            });
        }
      });


      hls.on(Hls.Events.ERROR, (event, data) => {
        // Only log non-fatal errors in development
        if (!data.fatal) {
          return; // Silently ignore non-fatal errors
        }
        
        // For fatal errors, handle silently with retries
        retryCountRef.current += 1;
        
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (retryCountRef.current <= maxRetries) {
              // Silent retry - keep loading state, don't show error
              setIsRetrying(true);
              setIsLoading(true); // Keep loading state during retries
              setTimeout(() => {
                if (hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }, 2000 * retryCountRef.current); // Exponential backoff
            } else {
              // Only show error after all retries are exhausted
              setIsRetrying(false);
              setError('Stream unavailable. The media server may not be running or the stream URL is incorrect.');
              setIsLoading(false);
              cleanup();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            if (retryCountRef.current <= maxRetries) {
              // Silent recovery attempt
              setIsRetrying(true);
              setIsLoading(true);
              hls.recoverMediaError();
            } else {
              setIsRetrying(false);
              setError('Stream format error. The video stream may be corrupted or incompatible.');
              setIsLoading(false);
              cleanup();
            }
            break;
          default:
            setIsRetrying(false);
            setError('Unable to load stream.');
            setIsLoading(false);
            cleanup();
            break;
        }
      });

      // Set loading timeout (8 seconds - reduced for faster feedback)
      loadingTimeoutRef.current = setTimeout(() => {
        if (retryCountRef.current < maxRetries) {
          // Don't show timeout error if we're still retrying
          return;
        }
        setIsRetrying(false);
        setError('Stream unavailable. The media server may not be running.');
        setIsLoading(false);
        cleanup();
      }, 8000);

      // Load the stream
      hls.loadSource(streamUrl);
      hls.attachMedia(videoRef.current);

    } else if (videoRef.current?.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoRef.current.src = streamUrl;
      
      // Set loading timeout for native HLS (8 seconds)
      loadingTimeoutRef.current = setTimeout(() => {
        if (retryCountRef.current < maxRetries) {
          return;
        }
        setIsRetrying(false);
        setError('Stream unavailable. The media server may not be running.');
        setIsLoading(false);
      }, 8000);

      // Handle when video can play
      const handleCanPlay = () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        setIsRetrying(false);
        retryCountRef.current = 0;
        setIsLoading(false);
      };

      // Handle errors
      const handleError = () => {
        if (loadingTimeoutRef.current) {
          clearTimeout(loadingTimeoutRef.current);
          loadingTimeoutRef.current = null;
        }
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current += 1;
          // Retry silently - keep loading state
          setIsRetrying(true);
          setIsLoading(true);
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.load();
            }
          }, 2000 * retryCountRef.current); // Exponential backoff
        } else {
          setIsRetrying(false);
          setError('Stream unavailable. The media server may not be running.');
          setIsLoading(false);
        }
      };

      videoRef.current.addEventListener('canplay', handleCanPlay);
      videoRef.current.addEventListener('error', handleError);
      
      if (autoPlay) {
        videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Autoplay prevented - user will need to click
          });
      }

      // Cleanup listeners
      return () => {
        if (videoRef.current) {
          videoRef.current.removeEventListener('canplay', handleCanPlay);
          videoRef.current.removeEventListener('error', handleError);
        }
      };
    } else {
      console.error('HLS is not supported in this browser');
      setError('HLS streaming not supported in this browser');
      setIsLoading(false);
    }
  }, [streamUrl, autoPlay]); // Removed cleanup dependency

  // Effect to initialize HLS when component mounts or streamUrl changes
  useEffect(() => {
    // Reset retry count and retry state when stream URL changes
    retryCountRef.current = 0;
    setIsRetrying(false);
    setIsLoading(true);
    setError(null);
    
    if (streamUrl) {
      // Small delay to ensure video element is ready
      const timer = setTimeout(initializeHLS, 100);
      return () => {
        clearTimeout(timer);
        cleanup();
      };
    }
    return () => {
      cleanup();
    };
  }, [streamUrl, initializeHLS, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Keep video playing continuously - even when tab is hidden
  useEffect(() => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    // Handle visibility change - resume if needed when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Only resume if it was paused and should be playing
        if (video.paused && autoPlay && !video.ended) {
          video.play().catch(() => {
            // Resume failed - user may need to interact
          });
        }
      }
    };

    // Handle playback stalls
    const handleStalled = () => {
      if (hlsRef.current) {
        hlsRef.current.startLoad();
      }
    };

    // Handle network errors - auto-retry silently
    const handleError = () => {
      if (hlsRef.current && autoPlay) {
        setTimeout(() => {
          hlsRef.current?.startLoad();
          video.play().catch(() => {
            // Error recovery failed
          });
        }, 2000);
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    video.addEventListener('stalled', handleStalled);
    video.addEventListener('error', handleError);

    // Periodic health check - ensure video is playing
    const healthCheckInterval = setInterval(() => {
      // Only check when page is visible
      if (document.visibilityState === 'visible' && autoPlay && video.paused && !video.ended) {
        video.play().catch(() => {
          // Health check play failed
        });
      }
    }, 10000); // Check every 10 seconds

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      video.removeEventListener('stalled', handleStalled);
      video.removeEventListener('error', handleError);
      clearInterval(healthCheckInterval);
    };
  }, [autoPlay]);

  // Video event handlers
  const handleVideoPlay = () => {
    setIsPlaying(true);
    setError(null);
  };

  const handleVideoPause = () => {
    setIsPlaying(false);
  };

  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    if (retryCountRef.current < maxRetries) {
      retryCountRef.current += 1;
      // Retry silently - keep loading state
      setIsRetrying(true);
      setIsLoading(true);
      setTimeout(() => {
        if (videoRef.current && hlsRef.current) {
          hlsRef.current.startLoad();
        }
      }, 2000 * retryCountRef.current); // Exponential backoff
    } else {
      setIsRetrying(false);
      setError('Stream unavailable. The media server may not be running.');
      setIsLoading(false);
    }
  };

  const handleVideoLoadStart = () => {
    setIsLoading(true);
  };

  const handleVideoLoadedData = () => {
    setIsLoading(false);
  };

  const handleVideoCanPlay = () => {
    setIsLoading(false);
  };

  const handlePlayClick = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
          videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            // Play failed
          });
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  return (
    <div className={`camera-feed-container ${className}`}>
      <div className="relative w-full h-full">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
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
            backgroundColor: '#000'
          }}
        />
        
        {/* Loading overlay - show immediately but with smooth transition */}
        {isLoading && !error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-3"></div>
              <div className="text-white text-sm">Connecting to stream...</div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/95 backdrop-blur-sm">
            <div className="text-white text-center p-6 max-w-md">
              <svg className="w-12 h-12 mx-auto mb-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div className="mb-2 text-lg font-medium text-white">{error}</div>
              <p className="text-sm text-slate-400 mb-4">Please check if the media server is running.</p>
              {error.includes('autoplay') && (
                <button
                  onClick={handlePlayClick}
                  className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Play Video
                </button>
              )}
              {!error.includes('autoplay') && (
                <button
                  onClick={() => {
                    setError(null);
                    setIsLoading(true);
                    setIsRetrying(false);
                    retryCountRef.current = 0;
                    if (streamUrl) {
                      setTimeout(initializeHLS, 100);
                    }
                  }}
                  className="bg-white text-black px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors mt-2"
                >
                  Retry
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
    </div>
  );
});

CameraFeed.displayName = 'CameraFeed';

export default React.memo(CameraFeed);
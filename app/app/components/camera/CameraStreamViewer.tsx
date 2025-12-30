/**
 * CameraStreamViewer - Deterministic HLS Player
 * 
 * Uses streamHealthManager as SINGLE SOURCE OF TRUTH for stream health.
 * Implements hard failure thresholds and explicit state management.
 * 
 * State Machine:
 * initializing → ready → degraded → retrying → offline
 * 
 * Hard Thresholds:
 * - 5 consecutive fragment failures → offline
 * - 10 total fragment failures → offline
 * - 3 playback stalls → degraded
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Hls from 'hls.js';
import { Brain, Power } from 'lucide-react';
import { streamHealthManager, StreamHealthState } from '@/app/lib/streaming/streamHealthManager';
import { fetchWithExplicitTimeout, isTimeoutError, isUserAbortError, isNetworkError } from '@/app/lib/streaming/timeoutUtils';

// Dynamic import for TensorFlow.js to avoid SSR issues
let cocoSsd: any = null;
let tf: any = null;

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

interface CameraStreamViewerProps {
  hlsUrl: string;
  cameraId?: string;
  autoPlay?: boolean;
  controls?: boolean;
  className?: string;
  checkStatus?: boolean;
  backgroundMode?: boolean;
}

export default function CameraStreamViewer({
  hlsUrl,
  cameraId,
  autoPlay = true,
  controls = true,
  className = '',
  checkStatus = true,
  backgroundMode = false,
}: CameraStreamViewerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<StreamHealthState>('initializing');
  const [isVideoActuallyPlaying, setIsVideoActuallyPlaying] = useState(false);
  const hlsRef = useRef<Hls | null>(null);
  const recoveryAttemptsRef = useRef<number>(0);
  
  // Refs for cleanup and state management
  const statusCheckAbortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const frozenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const stallHandlersRef = useRef<{ [key: string]: () => void }>({});
  const lastCurrentTimeRef = useRef<number>(0);
  const frozenCountRef = useRef<number>(0);
  const isMountedRef = useRef<boolean>(true);
  
  // AI detection state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const modelRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Validate HLS URL format
  useEffect(() => {
    if (!hlsUrl) {
      setError('HLS URL is required');
      setStreamStatus('offline');
      return;
    }

    if (!hlsUrl.endsWith('.m3u8')) {
      const errorMsg = `Invalid HLS URL. Must end with .m3u8. Got: ${hlsUrl}`;
      setError(errorMsg);
      setStreamStatus('offline');
      console.error('[CameraStreamViewer]', errorMsg);
      return;
    }

    if (hlsUrl.startsWith('rtsp://')) {
      const errorMsg = 'RTSP URLs are not allowed in frontend. Use HLS URL from /api/streams endpoint.';
      setError(errorMsg);
      setStreamStatus('offline');
      console.error('[CameraStreamViewer]', errorMsg);
      return;
    }

    setError(null);
  }, [hlsUrl]);

  // Initialize health tracking when cameraId is available
  // Start status check in parallel, but don't block HLS loading
  useEffect(() => {
    if (cameraId && hlsUrl) {
      streamHealthManager.initialize(cameraId, hlsUrl);
      // Mark as initializing immediately so HLS can start loading
      // Status check will update this in parallel
    }
  }, [cameraId, hlsUrl]);

  // Sync UI state with health manager (SINGLE SOURCE OF TRUTH)
  useEffect(() => {
    if (!cameraId) {
      setStreamStatus('ready'); // No health tracking without cameraId
      return;
    }

    const health = streamHealthManager.getHealth(cameraId);
    if (health) {
      setStreamStatus(health.state);
      if (health.lastError && health.state === 'offline') {
        setError(health.lastError);
      }
    }

    // Poll health state every 2 seconds
    const healthPollInterval = setInterval(() => {
      if (!isMountedRef.current || !cameraId) return;
      
      const currentHealth = streamHealthManager.getHealth(cameraId);
      if (currentHealth) {
        setStreamStatus(currentHealth.state);
        if (currentHealth.lastError && currentHealth.state === 'offline') {
          setError(currentHealth.lastError);
        }
      }
    }, 2000);

    return () => {
      clearInterval(healthPollInterval);
    };
  }, [cameraId]);

  // Check stream status before loading (if enabled and cameraId provided)
  useEffect(() => {
    if (!checkStatus || !cameraId || !hlsUrl || error) {
      if (!error && hlsUrl && !cameraId) {
        setStreamStatus('ready'); // Skip status check if no cameraId
      }
      return;
    }

    const MAX_RETRIES = 3;
    const INITIAL_RETRY_DELAY = 1000;
    const MAX_RETRY_DELAY = 8000;

    let isMounted = true;

    const checkStreamStatus = async (attempt: number = 0): Promise<void> => {
      // Cancel any existing retry timeout
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }

      // Abort any existing request
      if (statusCheckAbortControllerRef.current) {
        statusCheckAbortControllerRef.current.abort();
      }

      // Create new AbortController for this attempt
      const abortController = new AbortController();
      statusCheckAbortControllerRef.current = abortController;

      try {
        streamHealthManager.markRetrying(cameraId!);
        setStreamStatus('retrying');
        
        const retryDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
        
        if (attempt > 0) {
          console.log(`[CameraStreamViewer] Retrying stream status check (attempt ${attempt + 1}/${MAX_RETRIES + 1}, delay: ${retryDelay}ms)`);
        }

        // Use explicit timeout utility (increased timeout for slow endpoints)
        const response = await fetchWithExplicitTimeout(
          `/api/cameras/${cameraId}/stream-status`,
          {
            timeoutMs: 8000, // Increased from 5s to 8s to handle slow endpoints
            signal: abortController.signal,
          }
        );

        if (!isMounted) return;

        if (response.ok) {
          const data = await response.json();
          if (data.status === 'ready') {
            streamHealthManager.markReady(cameraId!);
            setStreamStatus('ready');
            console.log(`[CameraStreamViewer] ✅ Stream status: ready (attempt ${attempt + 1})`);
            return;
          } else if (data.status === 'initializing') {
            streamHealthManager.initialize(cameraId!);
            setStreamStatus('initializing');
            if (attempt < MAX_RETRIES) {
              retryTimeoutRef.current = setTimeout(() => {
                if (isMounted) checkStreamStatus(attempt + 1);
              }, retryDelay);
            } else {
              // Initialization timeout after max retries - expected failure
              streamHealthManager.markOffline(cameraId!, 'Stream initialization timeout', false);
              setStreamStatus('offline');
              setError('Stream is taking too long to initialize');
            }
            return;
          } else {
            // Stream status check returned offline - this is expected, not an error
            streamHealthManager.markOffline(cameraId!, `Stream status: ${data.status}`, false);
            setStreamStatus('offline');
            setError('Stream is offline');
            return;
          }
        } else {
          // Fallback to HEAD request
          const headResponse = await fetchWithExplicitTimeout(hlsUrl, {
            method: 'HEAD',
            timeoutMs: 3000,
            signal: abortController.signal,
          });

          if (!isMounted) return;

          if (headResponse.ok) {
            streamHealthManager.markReady(cameraId!);
            setStreamStatus('ready');
            console.log(`[CameraStreamViewer] ✅ Stream HEAD check: ready (attempt ${attempt + 1})`);
            return;
          } else {
            throw new Error(`HEAD request failed: ${headResponse.status}`);
          }
        }
      } catch (fetchError: any) {
        if (!isMounted) return;

        // Explicit timeout detection
        if (isTimeoutError(fetchError)) {
          console.log(`[CameraStreamViewer] ⏱️ Stream status check timeout (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
          streamHealthManager.recordHealthCheckFailure(cameraId!, 'Health check timeout');
          
          if (attempt < MAX_RETRIES) {
            const retryDelay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, attempt), MAX_RETRY_DELAY);
            setStreamStatus('retrying');
            
            retryTimeoutRef.current = setTimeout(() => {
              if (isMounted) {
                checkStreamStatus(attempt + 1);
              }
            }, retryDelay);
          } else {
            // Max retries reached - this is an expected failure after retries
            streamHealthManager.markOffline(cameraId!, 'Health check timeout after max retries', false);
            setStreamStatus('offline');
            setError('Stream server is unavailable or timing out');
          }
        } else if (isUserAbortError(fetchError)) {
          // User abort - don't retry, don't mark as error
          console.log('[CameraStreamViewer] Stream status check aborted by user');
          return;
        } else {
          // Network or other error
          console.error(`[CameraStreamViewer] ❌ Stream status check error (attempt ${attempt + 1}):`, fetchError.message || fetchError);
          streamHealthManager.recordHealthCheckFailure(cameraId!, fetchError.message || 'Health check failed');
          
          if (isNetworkError(fetchError)) {
            // Network error is unexpected - log as error
            streamHealthManager.markOffline(cameraId!, 'Network error: Stream server unreachable', true);
            setStreamStatus('offline');
            setError('Stream server is unreachable');
          } else {
            // Other errors are unexpected
            streamHealthManager.markOffline(cameraId!, 'Stream check failed', true);
            setStreamStatus('offline');
            setError('Stream check failed');
          }
        }
      }
    };

    // Reset health and start check
    if (cameraId) {
      streamHealthManager.initialize(cameraId, hlsUrl);
    }
    checkStreamStatus(0);

    return () => {
      isMounted = false;
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      
      if (statusCheckAbortControllerRef.current) {
        statusCheckAbortControllerRef.current.abort();
        statusCheckAbortControllerRef.current = null;
      }
    };
  }, [cameraId, hlsUrl, checkStatus]); // Removed 'error' to prevent loops

  /**
   * Clean HLS teardown - deterministic cleanup
   */
  const tearDownHls = useCallback(() => {
    if (hlsRef.current) {
      try {
        console.log('[CameraStreamViewer] Tearing down HLS instance...');
        // CRITICAL: Stop loading first to prevent new fragments
        hlsRef.current.stopLoad();
        // Remove all event listeners
        hlsRef.current.off(Hls.Events.ALL);
        // Detach from media element
        hlsRef.current.detachMedia();
      } catch (cleanupError) {
        console.warn('[CameraStreamViewer] Error during HLS cleanup:', cleanupError);
      }
      // Destroy HLS instance completely
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const video = videoRef.current;
    if (video) {
      // CRITICAL: Properly reset video element
      video.pause();
      video.src = '';
      video.removeAttribute('src');
      // Clear all sources
      while (video.firstChild) {
        video.removeChild(video.firstChild);
      }
      // Reset video element state
      video.load();
      // Clear any buffered data
      if (video.buffered && video.buffered.length > 0) {
        try {
          video.removeAttribute('src');
          video.load();
        } catch (e) {
          console.warn('[CameraStreamViewer] Error clearing video buffer:', e);
        }
      }
    }
  }, []);

  /**
   * Full stream reset - tear down and reinitialize
   */
  const resetStream = useCallback(() => {
    console.log('[CameraStreamViewer] Performing full stream reset...');
    
    // Tear down existing HLS
    tearDownHls();
    
    // Reset health tracking
    if (cameraId) {
      streamHealthManager.reset(cameraId);
    }
    
    // Reset state
    setError(null);
    recoveryAttemptsRef.current = 0;
    frozenCountRef.current = 0;
    lastCurrentTimeRef.current = 0;
    
    // Small delay before reattach to ensure cleanup completes
    setTimeout(() => {
      if (isMountedRef.current && cameraId) {
        const health = streamHealthManager.getHealth(cameraId);
        if (health && health.state !== 'offline') {
          // Trigger reattach by updating status
          setStreamStatus('initializing');
        }
      }
    }, 500);
  }, [cameraId, tearDownHls]);

  // Main HLS loading effect - only when status is 'ready'
  useEffect(() => {
    const video = videoRef.current;
    
    if (!video || !hlsUrl) return;
    
    // CRITICAL: Load HLS immediately - don't wait for status check
    // Status check runs in parallel and will update health, but HLS should load right away
    // Only block if we're CERTAIN the stream is offline (not just checking)
    const health = cameraId ? streamHealthManager.getHealth(cameraId) : null;
    
    // Only block if status is explicitly offline/error AND we've confirmed it for a while
    if (checkStatus && cameraId && health) {
      const state = health.state;
      const lastCheck = health.lastCheck || 0;
      const timeSinceCheck = Date.now() - lastCheck;
      
      // Only block if offline/error AND confirmed for > 3 seconds
      if ((state === 'offline' || state === 'error') && timeSinceCheck > 3000) {
        if (hlsRef.current) {
          console.log(`[CameraStreamViewer] Not loading HLS - stream confirmed ${state} for ${timeSinceCheck}ms`);
          tearDownHls();
        }
        return;
      }
      // For all other cases (ready, initializing, retrying, degraded, or recent offline), proceed
      console.log(`[CameraStreamViewer] Proceeding with HLS load (status: ${state}, checkStatus: ${checkStatus})`);
    } else {
      // No health tracking or checkStatus disabled - load immediately
      console.log(`[CameraStreamViewer] Loading HLS immediately (no blocking)`);
    }

    // Only block on error if status is confirmed offline (not just checking)
    if (error && streamStatus === 'offline' && health && (Date.now() - (health.lastCheck || 0)) > 3000) {
      return;
    }

    // Reset error state and recovery attempts when starting fresh
    setError(null);
    recoveryAttemptsRef.current = 0;
    frozenCountRef.current = 0;
    lastCurrentTimeRef.current = 0;

    // Check for native HLS support (Safari, iOS)
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      if (autoPlay) {
        // Use requestAnimationFrame to ensure video element is ready and not being paused
        requestAnimationFrame(() => {
          if (video && !video.paused && video.readyState >= 2) {
            video.play().catch((err) => {
              // Only log if it's not an abort error (which is expected during cleanup)
              if (err.name !== 'AbortError') {
                console.warn('[CameraStreamViewer] Autoplay prevented:', err);
              }
            });
          }
        });
      }
    } else if (Hls.isSupported()) {
      // Use HLS.js for browsers without native HLS support
      // CRITICAL: Live stream configuration to prevent freezing
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        // Buffer management - prevent excessive buffering that causes freezes
        maxBufferLength: 20, // Reduced from 30 to prevent buffering too far ahead
        maxMaxBufferLength: 30, // Reduced from 60
        maxBufferSize: 30 * 1000 * 1000, // 30MB max buffer (reduced from 60MB)
        // Live sync - CRITICAL for live streams
        liveSyncDurationCount: 3, // Sync to 3 segments behind live edge
        liveMaxLatencyDurationCount: 5, // Max 5 segments behind
        liveSyncDuration: 6, // Sync to 6 seconds behind live edge (3 segments × 2s)
        maxLiveSyncPlaybackRate: 1.5, // Prevent seeking beyond live edge
        liveDurationInfinity: false, // Don't buffer indefinitely
        liveBackBufferLength: 0, // Don't keep old segments in buffer (prevents freeze)
        // Manifest refresh - CRITICAL for live streams
        manifestLoadingTimeOut: 20000, // Increased from 10s to 20s to prevent premature failures
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 1000,
        // Fragment loading
        fragLoadingTimeOut: 15000, // Reduced from 20000 for faster failure detection
        fragLoadingMaxRetry: 2, // Reduced from 3 to fail faster
        fragLoadingRetryDelay: 500, // Faster retry
        // Level selection
        startLevel: -1, // Auto-select best quality
        capLevelToPlayerSize: true, // Cap quality to player size
        // Back buffer - minimal to prevent freeze
        backBufferLength: 0, // Don't keep back buffer (prevents freeze on live streams)
        // Playlist refresh - ensure playlist updates regularly
        maxBufferHole: 0.5, // Max gap in buffer before seeking
        highBufferWatchdogPeriod: 2, // Check buffer every 2 seconds
        nudgeOffset: 0.1, // Small nudge to keep playback smooth
        nudgeMaxRetry: 3, // Retry nudges
        maxFragLoadingTimeOut: 20000, // Max time to load a fragment
        maxMaxBufferLength: 30, // Hard limit
      });

      hlsRef.current = hls;

      // Track fragment failures with hard thresholds
      let consecutiveFragmentFailures = 0;
      
      hls.on(Hls.Events.FRAG_LOADING, () => {
        // Reset consecutive failures on successful fragment start
        consecutiveFragmentFailures = 0;
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Fragment loaded successfully - reset failure count
        if (cameraId) {
          const health = streamHealthManager.getHealth(cameraId);
          if (health && health.consecutiveFailures > 0) {
            // Reset on successful fragment load
            streamHealthManager.markReady(cameraId);
          }
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (!data || typeof data !== 'object') {
          console.warn('[CameraStreamViewer] Invalid error data:', data);
          return;
        }

        // Track fragment load errors
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.fatal === false) {
          // Non-fatal network error (likely fragment load failure)
          consecutiveFragmentFailures += 1;
          
          if (cameraId) {
            const shouldTearDown = streamHealthManager.recordFragmentFailure(
              cameraId,
              `Fragment load error: ${data.details || 'unknown'}`
            );
            
            if (shouldTearDown) {
              console.error(`[CameraStreamViewer] ❌ Hard threshold reached - tearing down stream`);
              tearDownHls();
              setStreamStatus('offline');
              setError('Stream failed: too many fragment errors');
              return;
            }
          }
        }

        if (data.fatal) {
          let errorMsg = 'Failed to load HLS stream';
          let shouldRecover = false;
          
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              errorMsg = 'Network error loading HLS stream';
              shouldRecover = true;
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              errorMsg = 'Media error in HLS stream';
              shouldRecover = true;
              break;
            default:
              errorMsg = `HLS error: ${data.type || 'unknown'}`;
              break;
          }

          console.warn('[CameraStreamViewer] Fatal HLS error:', {
            type: data.type || 'unknown',
            details: data.details || 'No details',
            url: data.url,
          });

          // Attempt recovery for recoverable errors (max 3 attempts)
          if (shouldRecover && hlsRef.current && recoveryAttemptsRef.current < 3) {
            try {
              recoveryAttemptsRef.current += 1;
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
                console.log(`[CameraStreamViewer] Attempting to recover from network error (attempt ${recoveryAttemptsRef.current}/3)`);
                hlsRef.current.startLoad();
                return;
              } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
                console.log(`[CameraStreamViewer] Attempting to recover from media error (attempt ${recoveryAttemptsRef.current}/3)`);
                hlsRef.current.recoverMediaError();
                return;
              }
            } catch (recoverError) {
              console.warn('[CameraStreamViewer] Recovery failed:', recoverError);
              recoveryAttemptsRef.current = 0;
            }
          }

          // Recovery failed or non-recoverable - full reset
          if (recoveryAttemptsRef.current >= 3 || !shouldRecover) {
            console.error('[CameraStreamViewer] ❌ Recovery failed or non-recoverable error - performing full reset');
            if (cameraId) {
              streamHealthManager.markOffline(cameraId, errorMsg);
            }
            resetStream();
            setError(errorMsg);
          }
        } else {
          // Non-fatal errors - log as debug
          console.debug('[CameraStreamViewer] Non-fatal HLS error:', {
            type: data.type || 'unknown',
            details: data.details || 'No details',
          });
        }
      });

      // CRITICAL: Attach media BEFORE loading source for proper initialization
      hls.attachMedia(video);
      hls.loadSource(hlsUrl);

      hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
        console.log('[CameraStreamViewer] ✅ Manifest parsed:', {
          levels: data.levels?.length || 0,
          firstLevel: data.firstLevel,
          stats: data.stats,
        });
        
        // CRITICAL: Check if playlist has #EXT-X-ENDLIST (VOD marker)
        // Live streams should NOT have this tag
        if (data.levels && data.levels.length > 0) {
          const level = data.levels[0];
          if (level.details && level.details.live === false) {
            console.warn('[CameraStreamViewer] ⚠️ Playlist marked as VOD (has #EXT-X-ENDLIST) - this may cause freezing');
          }
        }
        
        if (cameraId) {
          streamHealthManager.markReady(cameraId);
        }
        
        // CRITICAL: Start playback at live edge, not beginning
        if (autoPlay) {
          // Use requestAnimationFrame to ensure video element is ready and not being paused
          requestAnimationFrame(() => {
            if (video && hlsRef.current && !video.paused) {
              // CRITICAL: Seek to live edge before playing to prevent buffering old segments
              const liveSyncPosition = hlsRef.current.liveSyncPosition;
              if (liveSyncPosition !== null && liveSyncPosition !== undefined) {
                console.log('[CameraStreamViewer] Seeking to live edge before play:', liveSyncPosition);
                video.currentTime = liveSyncPosition;
              }
              
              // Only play if video is not paused (not being cleaned up)
              if (!video.paused) {
                video.play().catch((err) => {
                  // Only log if it's not an abort error (which is expected during cleanup)
                  if (err.name !== 'AbortError') {
                    console.warn('[CameraStreamViewer] Autoplay prevented:', err);
                  }
                });
              }
            }
          });
        }
      });

      // Monitor level switches (quality changes)
      hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
        console.log('[CameraStreamViewer] Level switched:', {
          level: data.level,
          details: data.details,
        });
      });

      // Monitor fragment loading to detect stalls
      hls.on(Hls.Events.FRAG_LOADING, (event, data) => {
        console.debug('[CameraStreamViewer] Fragment loading:', {
          frag: data.frag?.url,
          level: data.frag?.level,
        });
      });

      // Monitor buffer appending to detect stalls
      hls.on(Hls.Events.BUFFER_APPENDING, (event, data) => {
        // Reset frozen count when buffer is appending
        frozenCountRef.current = 0;
      });

      // CRITICAL: Monitor for playlist updates to ensure live stream is refreshing
      hls.on(Hls.Events.MANIFEST_LOADED, (event, data) => {
        console.log('[CameraStreamViewer] Manifest loaded/updated:', {
          levels: data.levels?.length || 0,
          networkDetails: data.networkDetails,
        });
      });

      // Setup stall detection
      const handleStalled = () => {
        if (!cameraId) return;
        console.warn('[CameraStreamViewer] ⚠️ Video stalled');
        streamHealthManager.recordStall(cameraId);
        
        // Attempt recovery
        if (hlsRef.current) {
          try {
            hlsRef.current.recoverMediaError();
          } catch (recoverError) {
            console.error('[CameraStreamViewer] Stall recovery failed:', recoverError);
            resetStream();
          }
        }
      };

      const handleWaiting = () => {
        if (!cameraId) return;
        console.warn('[CameraStreamViewer] ⚠️ Video waiting for data');
        streamHealthManager.recordStall(cameraId);
      };

      const handleError = () => {
        if (!cameraId) return;
        console.error('[CameraStreamViewer] ❌ Video element error');
        streamHealthManager.markOffline(cameraId, 'Video element error');
        resetStream();
      };

      const handleTimeUpdate = () => {
        if (video.currentTime > 0) {
          lastCurrentTimeRef.current = video.currentTime;
          frozenCountRef.current = 0;
          if (cameraId) {
            streamHealthManager.resetStallCount(cameraId);
          }
          // Update playing state
          setIsVideoActuallyPlaying(!video.paused && !video.ended && video.readyState >= 2);
        }
      };
      
      const handlePlay = () => {
        setIsVideoActuallyPlaying(true);
      };
      
      const handlePause = () => {
        setIsVideoActuallyPlaying(false);
      };
      
      const handleEnded = () => {
        setIsVideoActuallyPlaying(false);
      };

      // Attach event listeners
      video.addEventListener('stalled', handleStalled);
      video.addEventListener('waiting', handleWaiting);
      video.addEventListener('error', handleError);
      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('play', handlePlay);
      video.addEventListener('playing', handlePlay);
      video.addEventListener('pause', handlePause);
      video.addEventListener('ended', handleEnded);

      // Store handlers for cleanup
      stallHandlersRef.current = {
        stalled: handleStalled,
        waiting: handleWaiting,
        error: handleError,
        timeupdate: handleTimeUpdate,
        play: handlePlay,
        playing: handlePlay,
        pause: handlePause,
        ended: handleEnded,
      };

      // Monitor for frozen playback (AGGRESSIVE DETECTION)
      // Check every 1 second (not 2) for faster detection
      frozenCheckIntervalRef.current = setInterval(() => {
        if (!video || video.paused || video.ended) return;
        
        const currentTime = video.currentTime;
        const readyState = video.readyState;
        const networkState = video.networkState;
        const timeDiff = Math.abs(currentTime - lastCurrentTimeRef.current);
        
        // CRITICAL: Detect frozen playback when:
        // 1. currentTime hasn't advanced (timeDiff < 0.1s)
        // 2. Video has data (readyState >= 2 = HAVE_CURRENT_DATA)
        // 3. Network is not in error state (networkState !== 3 = NETWORK_NO_SOURCE)
        const isFrozen = timeDiff < 0.1 && 
                        lastCurrentTimeRef.current > 0 && 
                        readyState >= 2 && 
                        networkState !== 3;
        
        if (isFrozen) {
          frozenCountRef.current += 1;
          
          // More aggressive: detect after 3 seconds (3 checks × 1s interval)
          if (frozenCountRef.current >= 3) {
            console.warn('[CameraStreamViewer] ⚠️ Playback frozen detected:', {
              currentTime,
              lastTime: lastCurrentTimeRef.current,
              timeDiff,
              readyState,
              networkState,
              frozenCount: frozenCountRef.current,
            });
            
            if (cameraId) {
              streamHealthManager.recordStall(cameraId);
              const health = streamHealthManager.getHealth(cameraId);
              
              // If health is degraded or offline, perform full reset immediately
              if (health && (health.state === 'degraded' || health.state === 'offline')) {
                console.error('[CameraStreamViewer] ❌ Stream health is degraded/offline - performing full reset');
                resetStream();
                return;
              }
            }
            
            // Attempt recovery
            if (hlsRef.current) {
              try {
                console.log('[CameraStreamViewer] Attempting to recover from frozen playback...');
                // Try both recovery methods
                hlsRef.current.recoverMediaError();
                hlsRef.current.startLoad();
                frozenCountRef.current = 0;
                
                // If still frozen after recovery attempt, reset
                setTimeout(() => {
                  if (video && Math.abs(video.currentTime - currentTime) < 0.1) {
                    console.error('[CameraStreamViewer] ❌ Recovery failed - still frozen after recovery attempt');
                    resetStream();
                  }
                }, 2000);
              } catch (recoverError) {
                console.error('[CameraStreamViewer] Frozen playback recovery failed:', recoverError);
                resetStream();
              }
            } else {
              // No HLS instance - full reset
              console.error('[CameraStreamViewer] ❌ No HLS instance - performing full reset');
              resetStream();
            }
          }
        } else {
          // Time is advancing - reset frozen count
          frozenCountRef.current = 0;
          lastCurrentTimeRef.current = currentTime;
        }
      }, 1000); // Check every 1 second for faster detection

    } else {
      const errorMsg = 'HLS is not supported in this browser';
      setError(errorMsg);
      console.error('[CameraStreamViewer]', errorMsg);
      if (cameraId) {
        streamHealthManager.markOffline(cameraId, errorMsg);
      }
    }

    // Cleanup
    return () => {
      if (frozenCheckIntervalRef.current) {
        clearInterval(frozenCheckIntervalRef.current);
        frozenCheckIntervalRef.current = null;
      }
      
      // Remove event listeners
      const handlers = stallHandlersRef.current;
      if (video && handlers.stalled) {
        video.removeEventListener('stalled', handlers.stalled);
        video.removeEventListener('waiting', handlers.waiting);
        video.removeEventListener('error', handlers.error);
        video.removeEventListener('timeupdate', handlers.timeupdate);
        if (handlers.play) video.removeEventListener('play', handlers.play);
        if (handlers.playing) video.removeEventListener('playing', handlers.playing);
        if (handlers.pause) video.removeEventListener('pause', handlers.pause);
        if (handlers.ended) video.removeEventListener('ended', handlers.ended);
      }
      setIsVideoActuallyPlaying(false);
      
      tearDownHls();
      frozenCountRef.current = 0;
      lastCurrentTimeRef.current = 0;
    };
  }, [hlsUrl, autoPlay, checkStatus, streamStatus, cameraId, error, tearDownHls, resetStream]);

  // Component unmount cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      tearDownHls();
    };
  }, [tearDownHls]);

  // AI detection code (unchanged)
  useEffect(() => {
    if (!aiEnabled || !videoRef.current) return;

    const loadModel = async () => {
      try {
        console.log('[CameraStreamViewer] Loading AI model...');
        
        if (!tf) {
          tf = await import('@tensorflow/tfjs');
          await tf.ready();
        }
        
        if (!cocoSsd) {
          cocoSsd = await import('@tensorflow-models/coco-ssd');
        }
        
        if (!modelRef.current) {
          modelRef.current = await cocoSsd.load({
            base: 'lite_mobilenet_v2'
          });
          console.log('[CameraStreamViewer] ✅ AI model loaded');
          setIsModelLoaded(true);
        }
      } catch (err: any) {
        console.error('[CameraStreamViewer] Error loading AI model:', err);
        setError('Failed to load AI model');
      }
    };

    const checkVideoReady = () => {
      if (videoRef.current && videoRef.current.readyState >= 2) {
        loadModel();
      } else {
        setTimeout(checkVideoReady, 500);
      }
    };

    checkVideoReady();
  }, [aiEnabled]);

  const runDetection = useCallback(async () => {
    const video = videoRef.current;
    const model = modelRef.current;
    
    if (!video || !model || !aiEnabled || !isModelLoaded || isDetecting) return;
    if (video.readyState < 2) return;
    
    try {
      setIsDetecting(true);
      const predictions = await model.detect(video);
      
      const formattedDetections: Detection[] = predictions.map((pred: any) => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox
      }));
      
      setDetections(formattedDetections);
    } catch (err) {
      console.error('[CameraStreamViewer] Detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  }, [aiEnabled, isModelLoaded, isDetecting]);

  useEffect(() => {
    if (!aiEnabled || !isModelLoaded) {
      setDetections([]);
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;

    const startDetection = () => {
      runDetection();
      intervalId = setInterval(() => {
        runDetection();
      }, 500);
    };

    startDetection();

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [aiEnabled, isModelLoaded, runDetection]);

  // Draw detections on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      if (!aiEnabled || !video) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      const rect = video.getBoundingClientRect();
      if (rect.width !== canvas.width || rect.height !== canvas.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (detections.length === 0 || !video.videoWidth || !video.videoHeight) {
        return;
      }

      const scaleX = canvas.width / video.videoWidth;
      const scaleY = canvas.height / video.videoHeight;

      detections.forEach((detection) => {
        const [x, y, width, height] = detection.bbox;
        const scaledX = x * scaleX;
        const scaledY = y * scaleY;
        const scaledWidth = width * scaleX;
        const scaledHeight = height * scaleY;

        const colors: { [key: string]: string } = {
          person: '#00ff41',
          car: '#ff0080',
          truck: '#ff3d00',
          bus: '#ffa000',
          motorcycle: '#e040fb',
          bicycle: '#00e5ff',
        };
        const color = colors[detection.class] || '#76ff03';

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

        const label = `${detection.class} ${(detection.score * 100).toFixed(1)}%`;
        ctx.font = '14px Arial';
        const textMetrics = ctx.measureText(label);
        const labelWidth = textMetrics.width + 8;
        const labelHeight = 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(scaledX, scaledY - labelHeight, labelWidth, labelHeight);

        ctx.fillStyle = color;
        ctx.fillText(label, scaledX + 4, scaledY - 6);
      });
    };

    draw();

    const handleResize = () => draw();
    window.addEventListener('resize', handleResize);
    video.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      video.removeEventListener('resize', handleResize);
    };
  }, [detections, aiEnabled]);

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className={backgroundMode ? '' : "w-full h-full object-contain bg-slate-900 rounded-lg"}
        controls={backgroundMode ? false : controls}
        autoPlay={autoPlay}
        playsInline
        muted={backgroundMode ? true : autoPlay}
        style={backgroundMode ? {
          position: 'absolute',
          visibility: 'hidden',
          width: '1px',
          height: '1px',
          top: '0',
          left: '0',
          pointerEvents: 'none',
        } : undefined}
      />
      
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 10 }}
      />

      <button
        onClick={() => setAiEnabled(!aiEnabled)}
        className={`absolute top-4 right-4 z-20 px-3 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
          aiEnabled
            ? 'bg-blue-600 hover:bg-blue-700 text-white'
            : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
        }`}
        title={aiEnabled ? 'Disable AI Detection' : 'Enable AI Detection'}
      >
        {aiEnabled ? (
          <>
            <Brain className="w-4 h-4" />
            AI On
          </>
        ) : (
          <>
            <Power className="w-4 h-4" />
            AI Off
          </>
        )}
      </button>

      {aiEnabled && !isModelLoaded && (
        <div className="absolute top-16 right-4 z-20 px-3 py-2 bg-slate-800/90 rounded-lg text-xs text-slate-300">
          Loading AI model...
        </div>
      )}

      {/* Stream Status Overlay - Only show if video is NOT actually playing */}
      {(() => {
        // Use state to track if video is actually playing (more reliable than checking ref)
        // Only show overlay if video is NOT playing AND status indicates problem
        // Don't show overlay if video is actually playing (even if status says offline)
        if (isVideoActuallyPlaying) {
          return null; // Video is playing - don't show overlay
        }
        
        // Video is not playing - show appropriate overlay
        if (streamStatus === 'checking' || streamStatus === 'retrying' || streamStatus === 'initializing' || streamStatus === 'offline' || streamStatus === 'degraded' || error) {
          return (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm rounded-lg z-30">
              <div className="text-center p-4">
                {streamStatus === 'checking' && (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-2"></div>
                    <p className="text-white text-sm">Checking stream status...</p>
                  </>
                )}
                {streamStatus === 'retrying' && (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-2"></div>
                    <p className="text-white text-sm">Retrying connection...</p>
                  </>
                )}
                {streamStatus === 'initializing' && (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-yellow-500 mb-2"></div>
                    <p className="text-white text-sm">Stream initializing...</p>
                  </>
                )}
                {streamStatus === 'degraded' && (
                  <>
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mb-2"></div>
                    <p className="text-white text-sm">Stream degraded - attempting recovery...</p>
                  </>
                )}
                {(streamStatus === 'offline' || error) && (
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
                    <p className="text-red-400 font-semibold mb-2">Stream Unavailable</p>
                    <p className="text-red-300 text-sm">{error || 'Stream is offline or unavailable'}</p>
                  </>
                )}
              </div>
            </div>
          );
        }
        
        return null;
      })()}
    </div>
  );
}

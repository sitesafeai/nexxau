/**
 * JanusSessionManager - Production-Grade Multi-Camera Janus Session Management
 * 
 * SINGLETON PATTERN: Exactly one Janus session per page load
 * 
 * Responsibilities:
 * - Create and manage exactly one Janus session
 * - Track subscriber handles by cameraId
 * - Bind remote streams to video elements
 * - Handle failures in isolation
 * - Clean up all resources on destruction
 * 
 * Architecture:
 * - Pure TypeScript class (NO React state)
 * - Singleton pattern prevents duplicate sessions
 * - Map-based subscriber handle tracking
 * - Event-driven error handling
 * 
 * Usage:
 *   const manager = JanusSessionManager.getInstance();
 *   await manager.initSession(janusServerUrl, roomId);
 *   await manager.attachSubscriber(cameraId, janusFeedId, videoElement);
 *   manager.detachSubscriber(cameraId);
 *   manager.destroySession();
 */

import { JanusLoader } from '@/app/lib/services/janusLoader';

/**
 * Camera subscription configuration
 */
export interface CameraSubscriptionConfig {
  cameraId: string;
  janusFeedId: number;
  videoElement: HTMLVideoElement;
  roomId: number;
}

/**
 * Subscriber handle state
 */
interface SubscriberHandleState {
  pluginHandle: any; // JanusPluginHandle
  cameraId: string;
  janusFeedId: number;
  videoElement: HTMLVideoElement;
  mediaStream: MediaStream | null;
  isAttached: boolean;
  errorEvents: number[]; // Timestamps (ms) of errors in last 10 seconds
  lastFrameTimestamp: number; // Last video frame timestamp (ms)
  frameWatchdogHandle: number | null; // requestVideoFrameCallback handle or interval ID
  isUnhealthy: boolean; // Marked as unhealthy due to frozen video
  reattachAttempted: boolean; // Has a re-attach been attempted?
  watchdogActive: boolean; // Is frame watchdog active?
}

/**
 * Session state
 */
type SessionState = 'uninitialized' | 'initializing' | 'active' | 'destroying' | 'destroyed';

/**
 * JanusSessionManager - Singleton session manager
 * 
 * GUARANTEES:
 * - Exactly one Janus session per page
 * - No duplicate subscribers
 * - Clean resource cleanup
 * - Failure isolation
 */
export class JanusSessionManager {
  private static instance: JanusSessionManager | null = null;
  
  // Session state
  private session: any = null; // Janus session object
  private sessionState: SessionState = 'uninitialized';
  private janusServerUrl: string = '';
  private roomId: number = 0;
  
  // Subscriber handles: cameraId -> handle state
  private subscribers: Map<string, SubscriberHandleState> = new Map();
  
  // Initialization promise to prevent duplicate initialization
  private initPromise: Promise<void> | null = null;
  
  // Destruction flag
  private isDestroying: boolean = false;
  
  // Logging prefix
  private readonly LOG_PREFIX = '[JanusSessionManager]';
  
  // Constants
  private readonly FRAME_TIMEOUT_MS = 5000; // 5 seconds without frames = unhealthy
  private readonly ERROR_WINDOW_MS = 10000; // 10 seconds error window
  private readonly ERROR_THRESHOLD = 3; // 3 errors in window = failure
  private readonly REATTACH_DELAY_MS = 2500; // 2.5 seconds before re-attach attempt
  
  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {
    // Cleanup on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.destroySession();
      });
    }
  }
  
  /**
   * Get singleton instance
   */
  public static getInstance(): JanusSessionManager {
    if (!JanusSessionManager.instance) {
      JanusSessionManager.instance = new JanusSessionManager();
    }
    return JanusSessionManager.instance;
  }
  
  /**
   * Initialize Janus session
   * 
   * GUARANTEE: Only one session is created, even if called multiple times
   * 
   * @param janusServerUrl - Janus server WebSocket URL (e.g., "ws://localhost:8088/janus")
   * @param roomId - VideoRoom room ID
   */
  public async initSession(janusServerUrl: string, roomId: number): Promise<void> {
    // GUARD: Prevent duplicate initialization
    if (this.sessionState === 'active') {
      console.log(`${this.LOG_PREFIX} Session already active, skipping initialization`);
      return;
    }
    
    if (this.sessionState === 'initializing' && this.initPromise) {
      console.log(`${this.LOG_PREFIX} Session initialization in progress, returning existing promise`);
      return this.initPromise;
    }
    
    if (this.sessionState === 'destroying' || this.sessionState === 'destroyed') {
      throw new Error('Cannot initialize session: session is being destroyed or already destroyed');
    }
    
    this.sessionState = 'initializing';
    this.janusServerUrl = janusServerUrl;
    this.roomId = roomId;
    
    console.log(`${this.LOG_PREFIX} Initializing session (server: ${janusServerUrl}, room: ${roomId})`);
    
    this.initPromise = this._initSessionInternal();
    
    try {
      await this.initPromise;
      console.log(`${this.LOG_PREFIX} ✅ Session initialized successfully`);
    } catch (error: any) {
      this.sessionState = 'uninitialized';
      this.initPromise = null;
      console.error(`${this.LOG_PREFIX} ❌ Session initialization failed:`, error.message);
      throw error;
    }
  }
  
  /**
   * Internal session initialization
   */
  private async _initSessionInternal(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Load Janus library
      JanusLoader.load()
        .then((Janus) => {
          // Verify WebRTC support
          if (!Janus.isWebrtcSupported()) {
            reject(new Error('WebRTC is not supported in this browser'));
            return;
          }
          
          console.log(`${this.LOG_PREFIX} Janus library loaded, creating session...`);
          
          // Create Janus session using legacy API
          const session = new (window as any).Janus({
            server: this.janusServerUrl,
            success: (createdSession: any) => {
              console.log(`${this.LOG_PREFIX} ✅ Janus session created successfully`);
              this.session = createdSession || session;
              this.sessionState = 'active';
              this.initPromise = null;
              resolve();
            },
            error: (error: any) => {
              console.error(`${this.LOG_PREFIX} ❌ Janus session creation failed:`, error);
              this.sessionState = 'uninitialized';
              this.initPromise = null;
              reject(new Error(`Failed to create Janus session: ${error.message || error}`));
            },
            destroyed: () => {
              console.log(`${this.LOG_PREFIX} Session destroyed callback fired`);
              if (this.sessionState !== 'destroying') {
                // Session was destroyed unexpectedly
                console.warn(`${this.LOG_PREFIX} ⚠️ Session destroyed unexpectedly`);
                this._handleUnexpectedSessionDestroy();
              }
            },
            transportClosed: () => {
              console.warn(`${this.LOG_PREFIX} ⚠️ Transport closed`);
              // Transport closed doesn't mean session is dead, but log it
            }
          });
        })
        .catch((error) => {
          this.sessionState = 'uninitialized';
          this.initPromise = null;
          reject(error);
        });
    });
  }
  
  /**
   * Attach subscriber for a camera
   * 
   * GUARANTEES:
   * - No duplicate subscribers for same cameraId
   * - Stream bound to provided video element
   * - Failure isolated to this subscriber
   * 
   * @param config - Camera subscription configuration
   */
  public async attachSubscriber(config: CameraSubscriptionConfig): Promise<void> {
    const { cameraId, janusFeedId, videoElement, roomId } = config;
    
    // GUARD: Session must be active
    if (this.sessionState !== 'active' || !this.session) {
      throw new Error('Cannot attach subscriber: session is not active');
    }
    
    // GUARD: No duplicate subscribers
    if (this.subscribers.has(cameraId)) {
      console.warn(`${this.LOG_PREFIX} ⚠️ Subscriber already exists for camera ${cameraId}, skipping`);
      return;
    }
    
    // GUARD: Valid feed ID
    if (!janusFeedId || typeof janusFeedId !== 'number' || janusFeedId <= 0) {
      throw new Error(`Invalid janusFeedId: ${janusFeedId}`);
    }
    
    // GUARD: Valid video element
    if (!videoElement || !(videoElement instanceof HTMLVideoElement)) {
      throw new Error('Invalid video element: must be HTMLVideoElement instance');
    }
    
    console.log(`${this.LOG_PREFIX} Attaching subscriber for camera ${cameraId} (feed: ${janusFeedId})`);
    
    // Create subscriber handle state
    const handleState: SubscriberHandleState = {
      pluginHandle: null,
      cameraId,
      janusFeedId,
      videoElement,
      mediaStream: null,
      isAttached: false,
      errorEvents: [],
      lastFrameTimestamp: Date.now(),
      frameWatchdogHandle: null,
      isUnhealthy: false,
      reattachAttempted: false,
      watchdogActive: false
    };
    
    try {
      await this._attachSubscriberInternal(handleState, roomId);
      this.subscribers.set(cameraId, handleState);
      console.log(`${this.LOG_PREFIX} ✅ Subscriber attached successfully for camera ${cameraId}`);
    } catch (error: any) {
      // Cleanup on failure
      this._cleanupSubscriberHandle(handleState);
      console.error(`${this.LOG_PREFIX} ❌ Failed to attach subscriber for camera ${cameraId}:`, error.message);
      throw error;
    }
  }
  
  /**
   * Internal subscriber attachment logic
   */
  private _attachSubscriberInternal(handleState: SubscriberHandleState, roomId: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const { cameraId, janusFeedId } = handleState;
      
      // CRITICAL: Callbacks (iceState, webrtcState, onremotetrack) must be set in attach() options
      // onmessage is set on the pluginHandle after creation (in success callback)
      // Use closure to capture handleState
      this.session.attach({
        plugin: 'janus.plugin.videoroom',
        success: (pluginHandle: any) => {
          console.log(`${this.LOG_PREFIX} Plugin handle attached for camera ${cameraId} (handleId: ${pluginHandle.getId()})`);
          handleState.pluginHandle = pluginHandle;
          
          // Setup onmessage callback on the pluginHandle
          pluginHandle.onmessage = (msg: any, jsep: any) => {
            this._handleSubscriberMessage(handleState, msg, jsep, roomId);
          };
          
          // Send join request
          pluginHandle.send({
            message: {
              request: 'join',
              room: roomId,
              ptype: 'subscriber',
              feed: janusFeedId
            },
            success: (result: any) => {
              console.log(`${this.LOG_PREFIX} Join request sent for camera ${cameraId}`);
              // JSEP offer will arrive in onmessage callback
              resolve();
            },
            error: (error: any) => {
              console.error(`${this.LOG_PREFIX} ❌ Join request failed for camera ${cameraId}:`, error);
              this._cleanupSubscriberHandle(handleState);
              reject(new Error(`Join request failed: ${error.message || error}`));
            }
          });
        },
        error: (error: any) => {
          console.error(`${this.LOG_PREFIX} ❌ Plugin attach failed for camera ${cameraId}:`, error);
          reject(new Error(`Plugin attach failed: ${error.message || error}`));
        },
        // CRITICAL: These callbacks must be in attach() options (not on pluginHandle)
        iceState: (state: string) => {
          console.log(`${this.LOG_PREFIX} ICE state for camera ${cameraId}: ${state}`);
          if (state === 'failed') {
            this._recordError(handleState, 'ICE_FAILED');
            console.error(`${this.LOG_PREFIX} ❌ ICE failed for camera ${cameraId}`);
          }
        },
        webrtcState: (on: boolean) => {
          console.log(`${this.LOG_PREFIX} WebRTC state for camera ${cameraId}: ${on ? 'UP' : 'DOWN'}`);
          if (!on && handleState.isAttached) {
            this._recordError(handleState, 'WEBRTC_DOWN');
            console.warn(`${this.LOG_PREFIX} ⚠️ WebRTC went down for camera ${cameraId}`);
          }
        },
        onremotetrack: (track: MediaStreamTrack, mid: string, on: boolean) => {
          // Closure captures handleState
          this._handleRemoteTrack(handleState, track, mid, on);
        }
      });
    });
  }
  
  /**
   * Handle subscriber plugin messages
   */
  private _handleSubscriberMessage(
    handleState: SubscriberHandleState,
    msg: any,
    jsep: any,
    roomId: number
  ): void {
    const { cameraId, pluginHandle } = handleState;
    
    // Handle errors
    if (msg && msg.error) {
      this._recordError(handleState, 'PLUGIN_ERROR', msg.error);
      console.error(`${this.LOG_PREFIX} ❌ Plugin error for camera ${cameraId}:`, msg.error);
      
      // Check if error threshold exceeded
      if (this._shouldDetachDueToErrors(handleState)) {
        console.error(`${this.LOG_PREFIX} ❌ Error threshold exceeded for camera ${cameraId}, detaching`);
        this._handleUnhealthySubscriber(cameraId, 'ERROR_THRESHOLD_EXCEEDED');
      }
      return;
    }
    
    // Handle JSEP offer
    if (jsep && jsep.type === 'offer') {
      console.log(`${this.LOG_PREFIX} JSEP offer received for camera ${cameraId}`);
      
      pluginHandle.createAnswer({
        jsep: jsep,
        media: { audioSend: false, videoSend: false },
        success: (answerJsep: any) => {
          console.log(`${this.LOG_PREFIX} Answer created for camera ${cameraId}`);
          
          pluginHandle.send({
            message: { request: 'start', room: roomId },
            jsep: answerJsep,
            success: () => {
              console.log(`${this.LOG_PREFIX} Start request sent for camera ${cameraId}`);
            },
            error: (error: any) => {
              this._recordError(handleState, 'START_FAILED', error);
              console.error(`${this.LOG_PREFIX} ❌ Start request failed for camera ${cameraId}:`, error);
              
              if (this._shouldDetachDueToErrors(handleState)) {
                this._handleUnhealthySubscriber(cameraId, 'ERROR_THRESHOLD_EXCEEDED');
              }
            }
          });
        },
        error: (error: any) => {
          this._recordError(handleState, 'CREATE_ANSWER_FAILED', error);
          console.error(`${this.LOG_PREFIX} ❌ CreateAnswer failed for camera ${cameraId}:`, error);
          
          if (this._shouldDetachDueToErrors(handleState)) {
            this._handleUnhealthySubscriber(cameraId, 'ERROR_THRESHOLD_EXCEEDED');
          }
        }
      });
    }
    
    // Handle attached confirmation
    if (msg.videoroom === 'attached') {
      console.log(`${this.LOG_PREFIX} Camera ${cameraId} attached to room`);
    }
  }
  
  /**
   * Handle remote track (called by plugin's onremotetrack callback)
   * 
   * This is invoked by Janus when media tracks are received
   */
  private _handleRemoteTrack(handleState: SubscriberHandleState, track: MediaStreamTrack, mid: string, on: boolean): void {
    const { cameraId, videoElement } = handleState;
    
    if (!handleState.mediaStream) {
      handleState.mediaStream = new MediaStream();
    }
    
    if (on) {
      // Add track to stream
      handleState.mediaStream.addTrack(track);
      console.log(`${this.LOG_PREFIX} Track added for camera ${cameraId} (kind: ${track.kind}, mid: ${mid})`);
      
      if (track.kind === 'video') {
        // Bind stream to video element (only once, or when stream changes)
        if (videoElement.srcObject !== handleState.mediaStream) {
          // Configure video element BEFORE setting srcObject
          videoElement.muted = true;
          videoElement.autoplay = true;
          videoElement.playsInline = true;
          videoElement.srcObject = handleState.mediaStream;
          console.log(`${this.LOG_PREFIX} Stream assigned to video element for camera ${cameraId}`);
        }
        
        // Start frame watchdog when video starts
        if (!handleState.watchdogActive) {
          this._startFrameWatchdog(handleState);
        }
        
        // Start playback when metadata is loaded
        if (videoElement.readyState === 0) {
          videoElement.onloadedmetadata = () => {
            console.log(`${this.LOG_PREFIX} Video metadata loaded for camera ${cameraId} (${videoElement.videoWidth}x${videoElement.videoHeight})`);
            videoElement.play()
              .then(() => {
                handleState.isAttached = true;
                console.log(`${this.LOG_PREFIX} ✅ Video playing for camera ${cameraId}`);
              })
              .catch((error) => {
                this._recordError(handleState, 'VIDEO_PLAY_FAILED', error);
                console.error(`${this.LOG_PREFIX} ❌ Video play failed for camera ${cameraId}:`, error);
              });
          };
        } else if (!handleState.isAttached) {
          // Metadata already loaded, play immediately
          videoElement.play()
            .then(() => {
              handleState.isAttached = true;
              console.log(`${this.LOG_PREFIX} ✅ Video playing for camera ${cameraId} (metadata already loaded)`);
            })
            .catch((error) => {
              this._recordError(handleState, 'VIDEO_PLAY_FAILED', error);
              console.error(`${this.LOG_PREFIX} ❌ Video play failed for camera ${cameraId}:`, error);
            });
        }
      }
    } else {
      // Remove track from stream
      handleState.mediaStream.removeTrack(track);
      track.stop();
      console.log(`${this.LOG_PREFIX} Track removed and stopped for camera ${cameraId} (kind: ${track.kind})`);
      
      // If no tracks remain, stream is dead
      if (handleState.mediaStream.getTracks().length === 0) {
        console.warn(`${this.LOG_PREFIX} ⚠️ All tracks removed for camera ${cameraId}`);
        handleState.isAttached = false;
        this._stopFrameWatchdog(handleState);
      }
    }
  }
  
  /**
   * Detach subscriber for a camera
   * 
   * GUARANTEES:
   * - All resources cleaned up
   * - Stream stopped
   * - Handle removed from map
   * 
   * @param cameraId - Camera ID to detach
   */
  public detachSubscriber(cameraId: string): void {
    const handleState = this.subscribers.get(cameraId);
    
    if (!handleState) {
      console.warn(`${this.LOG_PREFIX} ⚠️ No subscriber found for camera ${cameraId}`);
      return;
    }
    
    console.log(`${this.LOG_PREFIX} Detaching subscriber for camera ${cameraId}`);
    
    // Cleanup handle
    this._cleanupSubscriberHandle(handleState);
    
    // Remove from map
    this.subscribers.delete(cameraId);
    
    console.log(`${this.LOG_PREFIX} ✅ Subscriber detached for camera ${cameraId}`);
  }
  
  /**
   * Cleanup subscriber handle resources
   */
  private _cleanupSubscriberHandle(handleState: SubscriberHandleState): void {
    const { pluginHandle, videoElement, mediaStream, cameraId } = handleState;
    
    // Stop media stream
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => {
        track.stop();
        console.log(`${this.LOG_PREFIX} Track stopped for camera ${cameraId} (kind: ${track.kind})`);
      });
      handleState.mediaStream = null;
    }
    
    // Clear video element
    if (videoElement) {
      videoElement.srcObject = null;
      videoElement.load(); // Reset video element
    }
    
    // Detach plugin handle
    if (pluginHandle) {
      try {
        pluginHandle.detach();
        console.log(`${this.LOG_PREFIX} Plugin handle detached for camera ${cameraId}`);
      } catch (error: any) {
        console.error(`${this.LOG_PREFIX} ⚠️ Error detaching plugin handle for camera ${cameraId}:`, error.message);
      }
      handleState.pluginHandle = null;
    }
    
    handleState.isAttached = false;
  }
  
  /**
   * Destroy session and cleanup all resources
   * 
   * GUARANTEES:
   * - All subscribers detached
   * - Session destroyed
   * - No memory leaks
   */
  public destroySession(): void {
    if (this.isDestroying || this.sessionState === 'destroyed') {
      return;
    }
    
    this.isDestroying = true;
    this.sessionState = 'destroying';
    
    console.log(`${this.LOG_PREFIX} Destroying session (${this.subscribers.size} active subscribers)`);
    
    // Detach all subscribers
    const cameraIds = Array.from(this.subscribers.keys());
    cameraIds.forEach(cameraId => {
      this.detachSubscriber(cameraId);
    });
    
    // Destroy session
    if (this.session) {
      try {
        this.session.destroy();
        console.log(`${this.LOG_PREFIX} ✅ Session destroyed`);
      } catch (error: any) {
        console.error(`${this.LOG_PREFIX} ⚠️ Error destroying session:`, error.message);
      }
      this.session = null;
    }
    
    this.sessionState = 'destroyed';
    this.isDestroying = false;
    this.janusServerUrl = '';
    this.roomId = 0;
    
    console.log(`${this.LOG_PREFIX} ✅ Session cleanup complete`);
  }
  
  /**
   * Handle unexpected session destruction
   * 
   * FIX 4: Session resurrection - clean state but allow re-initialization
   */
  private _handleUnexpectedSessionDestroy(): void {
    const timestamp = Date.now();
    console.error(`${this.LOG_PREFIX} ❌ Session destroyed unexpectedly`, {
      cameraId: 'SESSION',
      reason: 'UNEXPECTED_DESTROY',
      timestamp,
      subscriberCount: this.subscribers.size
    });
    
    // Cleanup all subscribers
    const cameraIds = Array.from(this.subscribers.keys());
    cameraIds.forEach(cameraId => {
      const handleState = this.subscribers.get(cameraId);
      if (handleState) {
        this._cleanupSubscriberHandle(handleState);
      }
    });
    this.subscribers.clear();
    
    // Reset session state to allow re-initialization
    this.session = null;
    this.sessionState = 'uninitialized'; // Allow initSession() to be called again
    this.janusServerUrl = '';
    this.roomId = 0;
    this.isDestroying = false;
    
    console.log(`${this.LOG_PREFIX} Session state reset - ready for re-initialization`, {
      cameraId: 'SESSION',
      reason: 'RESURRECTION_READY',
      timestamp
    });
  }
  
  /**
   * FIX 1: Start frame watchdog for video element
   */
  private _startFrameWatchdog(handleState: SubscriberHandleState): void {
    const { cameraId, videoElement } = handleState;
    
    if (handleState.watchdogActive) {
      return; // Already active
    }
    
    handleState.watchdogActive = true;
    handleState.lastFrameTimestamp = Date.now();
    
    // Use requestVideoFrameCallback if available (modern browsers)
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      const checkFrame = (now: number, metadata: any) => {
        if (!handleState.watchdogActive || !this.subscribers.has(cameraId)) {
          return; // Watchdog stopped or camera detached
        }
        
        handleState.lastFrameTimestamp = now;
        handleState.isUnhealthy = false; // Reset unhealthy flag if frames are coming
        
        // Schedule next check
        try {
          handleState.frameWatchdogHandle = (videoElement as any).requestVideoFrameCallback(checkFrame);
        } catch (error) {
          // Fallback to timeupdate
          this._startFrameWatchdogFallback(handleState);
        }
      };
      
      try {
        handleState.frameWatchdogHandle = (videoElement as any).requestVideoFrameCallback(checkFrame);
        console.log(`${this.LOG_PREFIX} Frame watchdog started (requestVideoFrameCallback) for camera ${cameraId}`);
      } catch (error) {
        this._startFrameWatchdogFallback(handleState);
      }
    } else {
      // Fallback to timeupdate event
      this._startFrameWatchdogFallback(handleState);
    }
    
    // Start timeout checker
    this._checkFrameTimeout(handleState);
  }
  
  /**
   * Fallback frame watchdog using timeupdate event
   */
  private _startFrameWatchdogFallback(handleState: SubscriberHandleState): void {
    const { cameraId, videoElement } = handleState;
    
    const onTimeUpdate = () => {
      if (!handleState.watchdogActive || !this.subscribers.has(cameraId)) {
        videoElement.removeEventListener('timeupdate', onTimeUpdate);
        return;
      }
      handleState.lastFrameTimestamp = Date.now();
      handleState.isUnhealthy = false;
    };
    
    videoElement.addEventListener('timeupdate', onTimeUpdate);
    handleState.lastFrameTimestamp = Date.now();
    console.log(`${this.LOG_PREFIX} Frame watchdog started (timeupdate fallback) for camera ${cameraId}`);
  }
  
  /**
   * Check for frame timeout
   */
  private _checkFrameTimeout(handleState: SubscriberHandleState): void {
    const { cameraId } = handleState;
    
    const checkInterval = setInterval(() => {
      if (!handleState.watchdogActive || !this.subscribers.has(cameraId)) {
        clearInterval(checkInterval);
        return;
      }
      
      const timeSinceLastFrame = Date.now() - handleState.lastFrameTimestamp;
      
      if (timeSinceLastFrame > this.FRAME_TIMEOUT_MS && !handleState.isUnhealthy) {
        // Mark as unhealthy
        handleState.isUnhealthy = true;
        const timestamp = Date.now();
        console.warn(`${this.LOG_PREFIX} ⚠️ Video frame stall detected for camera ${cameraId}`, {
          cameraId,
          reason: 'FRAME_STALL',
          timestamp,
          timeSinceLastFrameMs: timeSinceLastFrame
        });
        
        // Trigger recovery
        this._handleUnhealthySubscriber(cameraId, 'FRAME_STALL');
        clearInterval(checkInterval);
      }
    }, 1000); // Check every second
  }
  
  /**
   * Stop frame watchdog
   */
  private _stopFrameWatchdog(handleState: SubscriberHandleState): void {
    const { cameraId, videoElement } = handleState;
    
    if (!handleState.watchdogActive) {
      return;
    }
    
    handleState.watchdogActive = false;
    
    // Cancel requestVideoFrameCallback if used
    if (handleState.frameWatchdogHandle !== null) {
      if ('cancelVideoFrameCallback' in HTMLVideoElement.prototype) {
        try {
          (videoElement as any).cancelVideoFrameCallback(handleState.frameWatchdogHandle);
        } catch (error) {
          // Ignore cancellation errors
        }
      }
      handleState.frameWatchdogHandle = null;
    }
    
    console.log(`${this.LOG_PREFIX} Frame watchdog stopped for camera ${cameraId}`);
  }
  
  /**
   * FIX 2: Record error with timestamp
   */
  private _recordError(handleState: SubscriberHandleState, errorType: string, details?: any): void {
    const now = Date.now();
    handleState.errorEvents.push(now);
    
    // Clean old errors (outside 10-second window)
    const cutoff = now - this.ERROR_WINDOW_MS;
    handleState.errorEvents = handleState.errorEvents.filter(timestamp => timestamp > cutoff);
    
    console.log(`${this.LOG_PREFIX} Error recorded for camera ${handleState.cameraId}`, {
      cameraId: handleState.cameraId,
      reason: errorType,
      timestamp: now,
      errorCount: handleState.errorEvents.length,
      details
    });
  }
  
  /**
   * FIX 2: Check if subscriber should be detached due to errors
   */
  private _shouldDetachDueToErrors(handleState: SubscriberHandleState): boolean {
    return handleState.errorEvents.length >= this.ERROR_THRESHOLD;
  }
  
  /**
   * FIX 3: Handle unhealthy subscriber (frozen video or error threshold)
   */
  private _handleUnhealthySubscriber(cameraId: string, reason: string): void {
    const handleState = this.subscribers.get(cameraId);
    if (!handleState) {
      return;
    }
    
    // Don't attempt re-attach if already attempted
    if (handleState.reattachAttempted) {
      const timestamp = Date.now();
      console.error(`${this.LOG_PREFIX} ❌ Camera ${cameraId} permanently failed - re-attach already attempted`, {
        cameraId,
        reason: 'PERMANENT_FAILURE',
        timestamp,
        originalReason: reason
      });
      this.detachSubscriber(cameraId);
      return;
    }
    
    const timestamp = Date.now();
    console.warn(`${this.LOG_PREFIX} ⚠️ Camera ${cameraId} marked unhealthy - attempting recovery`, {
      cameraId,
      reason,
      timestamp,
      willReattach: !handleState.reattachAttempted
    });
    
    // Mark re-attach as attempted
    handleState.reattachAttempted = true;
    
    // Store config for re-attach
    const { janusFeedId, videoElement } = handleState;
    const roomId = this.roomId;
    
    // Detach cleanly
    this._cleanupSubscriberHandle(handleState);
    this.subscribers.delete(cameraId);
    
    // Wait before re-attach attempt
    setTimeout(() => {
      // Check session is still active
      if (this.sessionState !== 'active' || !this.session) {
        console.error(`${this.LOG_PREFIX} ❌ Cannot re-attach camera ${cameraId} - session not active`, {
          cameraId,
          reason: 'SESSION_NOT_ACTIVE',
          timestamp: Date.now()
        });
        return;
      }
      
      // Attempt ONE re-attach
      console.log(`${this.LOG_PREFIX} Attempting re-attach for camera ${cameraId}`, {
        cameraId,
        reason: 'RECOVERY_ATTEMPT',
        timestamp: Date.now()
      });
      
      this.attachSubscriber({
        cameraId,
        janusFeedId,
        videoElement,
        roomId
      }).then(() => {
        console.log(`${this.LOG_PREFIX} ✅ Re-attach successful for camera ${cameraId}`, {
          cameraId,
          reason: 'RECOVERY_SUCCESS',
          timestamp: Date.now()
        });
        // Reset reattachAttempted on success
        const newHandleState = this.subscribers.get(cameraId);
        if (newHandleState) {
          newHandleState.reattachAttempted = false;
        }
      }).catch((error) => {
        console.error(`${this.LOG_PREFIX} ❌ Re-attach failed for camera ${cameraId} - giving up`, {
          cameraId,
          reason: 'RECOVERY_FAILED',
          timestamp: Date.now(),
          error: error.message
        });
        // Camera will remain detached
      });
    }, this.REATTACH_DELAY_MS);
  }
  
  /**
   * Get session state (for debugging)
   */
  public getSessionState(): SessionState {
    return this.sessionState;
  }
  
  /**
   * Get active subscriber count (for debugging)
   */
  public getActiveSubscriberCount(): number {
    return this.subscribers.size;
  }
  
  /**
   * Check if camera is attached (for debugging)
   */
  public isCameraAttached(cameraId: string): boolean {
    return this.subscribers.has(cameraId) && this.subscribers.get(cameraId)?.isAttached === true;
  }
}


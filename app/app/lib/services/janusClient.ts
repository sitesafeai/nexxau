/**
 * Janus WebRTC Client Service (Production-Hardened)
 * 
 * CRITICAL API INFORMATION:
 * =========================
 * This code uses the LEGACY Janus API:
 *   - Janus.init({ debug: false, callback: () => { ... } })
 *   - new Janus({ server: url, success: (session) => { ... }, error: (error) => { ... } })
 * 
 * There is NO Janus.create() method. Any code using Janus.create is WRONG and will fail.
 * 
 * The Janus library constructor pattern:
 *   const session = new Janus({
 *     server: 'wss://janus.example.com/janus',
 *     success: (session) => {
 *       // session is ready
 *     },
 *     error: (error) => {
 *       // connection failed
 *     },
 *     destroyed: () => {
 *       // session destroyed
 *     },
 *     transportClosed: () => {
 *       // transport closed
 *     }
 *   });
 * 
 * The constructor returns the session object immediately, but the success callback
 * is called when the session is actually connected to the server.
 * 
 * Production-hardened features:
 * - Explicit Janus library loading with API validation
 * - Bounded retry strategy
 * - Session disconnect/restart handling
 * - Structured logging
 * - Multi-viewer failure detection
 * - Runtime guards preventing API misuse
 * 
 * This is NOT demo code - built for production use in Nexxau dashboard.
 */

import { JanusLoader, JanusLoaderError } from './janusLoader';
import { JanusLogger, LogContext } from './janusLogger';

// Janus types are defined in app/types/janus.d.ts

/**
 * REGRESSION PREVENTION:
 * =====================
 * The janusLoader.ts validates the API contract at load time.
 * If Janus.create is detected, it will fail with API_MISMATCH error.
 * 
 * All session creation MUST use: new Janus({...})
 * Never use: Janus.create() - it does not exist
 */

export interface JanusStreamMetadata {
  janusServerUrl: string;
  mountpointId: number;
  cameraId: string;
}

export interface JanusClientCallbacks {
  onStateChange?: (state: 'loading' | 'live' | 'offline' | 'error') => void;
  onError?: (error: string, code?: string) => void;
  onRemoteStream?: (stream: MediaStream) => void;
  onCleanup?: () => void;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

/**
 * JanusClient - Manages Janus session and streaming plugin
 * 
 * Lifecycle:
 * 1. Initialize Janus library
 * 2. Create Janus session
 * 3. Attach to streaming plugin
 * 4. Watch mountpoint
 * 5. Handle SDP offer/answer
 * 6. Start stream
 * 7. Attach remote tracks
 */
export class JanusClient {
  private session: any = null;
  private pluginHandle: any = null;
  private pc: RTCPeerConnection | null = null;
  private metadata: JanusStreamMetadata | null = null;
  private callbacks: JanusClientCallbacks;
  private isDestroyed = false;
  private remoteStream: MediaStream | null = null;
  
  // FIX 2: Retry state
  private watchRetryCount = 0;
  private readonly retryConfig: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 8000,
    backoffMultiplier: 2,
  };

  // FIX 3: Session tracking
  private sessionDestroyed = false;
  private transportClosed = false;

  constructor(callbacks: JanusClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Normalize Janus server URL.
   * - Ensures /janus path for HTTP(S) REST API
   * - Leaves WebSocket URLs untouched (e.g., ws://192.168.64.4:8188)
   */
  private normalizeJanusServerUrl(rawUrl: string): string {
    if (!rawUrl) {
      return rawUrl;
    }

    let normalized = rawUrl.trim();

    const isHttp = normalized.startsWith('http://') || normalized.startsWith('https://');
    const isWs = normalized.startsWith('ws://') || normalized.startsWith('wss://');

    // Ensure /janus path for HTTP(S) REST API only
    if (isHttp && !normalized.endsWith('/janus')) {
      normalized = normalized.replace(/\/+$/, '') + '/janus';
    }

    // Leave WebSocket URLs unchanged (port 8188 usually has no /janus path)
    if (isWs) {
      return normalized;
    }

    return normalized;
  }

  /**
   * Connect to Janus server and start streaming
   */
  async connect(metadata: JanusStreamMetadata): Promise<void> {
    if (this.isDestroyed) {
      throw new Error('JanusClient has been destroyed');
    }

    const normalizedServerUrl = this.normalizeJanusServerUrl(metadata.janusServerUrl);
    this.metadata = {
      ...metadata,
      janusServerUrl: normalizedServerUrl,
    };
    this.watchRetryCount = 0; // Reset retry count
    this.sessionDestroyed = false;
    this.transportClosed = false;

    const logContext: LogContext = {
      cameraId: metadata.cameraId,
      mountpointId: metadata.mountpointId,
      janusServerUrl: normalizedServerUrl,
    };

    JanusLogger.info('Connecting to Janus', logContext);
    this.callbacks.onStateChange?.('loading');

    try {
      // Load and verify Janus library first
      console.log('[JanusClient] Loading Janus library...');
      const Janus = await JanusLoader.load();
      JanusLogger.info('Janus library loaded', logContext);
      
      // CRITICAL: Verify legacy API (Janus.init + new Janus constructor)
      // There is NO Janus.create method - that was a bug
      if (!Janus || typeof Janus.init !== 'function') {
        throw new JanusLoaderError('Janus library verification failed: missing init method', 'INVALID');
      }
      
      // Verify Janus constructor exists (legacy API uses new Janus())
      if (typeof Janus !== 'function' && typeof (window as any).Janus !== 'function') {
        throw new JanusLoaderError('Janus constructor not available (expected legacy API)', 'API_MISMATCH');
      }
      
      console.log('[JanusClient] Janus library verified:', {
        hasInit: typeof Janus.init === 'function',
        apiVersion: JanusLoader.getApiVersion(),
        availableMethods: Object.keys(Janus).slice(0, 10).join(', '),
      });

      // Create Janus session
      await this.createSession();

      // Attach to streaming plugin
      await this.attachPlugin();

      // Watch mountpoint (with retries)
      await this.watchMountpoint();

      // Stream will start after SDP negotiation (handled in plugin callbacks)
    } catch (error: any) {
      JanusLogger.error('Connection failed', logContext, error);
      
      let errorMessage = error.message || 'Failed to connect to Janus';
      let errorCode = 'CONNECTION_FAILED';

      // FIX 1: Handle JanusLoader errors specifically
      if (error instanceof JanusLoaderError) {
        errorMessage = `Janus library error: ${error.message}`;
        errorCode = error.code;
      }

      if (errorMessage.includes('API call failed')) {
        errorMessage = `${errorMessage} (Check CORS on Janus REST API or use ws:// URL)`;
      }

      this.callbacks.onError?.(errorMessage, errorCode);
      this.callbacks.onStateChange?.('error');
      throw error;
    }
  }

  /**
   * Create Janus session (FIX 3: Add disconnect handlers)
   */
  private createSession(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.metadata) {
        reject(new Error('Metadata not set'));
        return;
      }

      const serverUrl = this.metadata.janusServerUrl;
      const logContext: LogContext = {
        cameraId: this.metadata.cameraId,
        mountpointId: this.metadata.mountpointId,
      };

      JanusLogger.info('Creating Janus session', { ...logContext, serverUrl });

      // CRITICAL: Use legacy API - new Janus() constructor, NOT Janus.create()
      // The Janus library uses the legacy API pattern:
      //   const session = new Janus({ 
      //     server: url, 
      //     success: (session) => {...},  // Called when session is ready
      //     error: (error) => {...},
      //     destroyed: () => {...},
      //     transportClosed: () => {...}
      //   })
      // The constructor returns the session object immediately, but success callback
      // is called when the session is actually connected.
      // There is NO Janus.create method - that was a bug in the previous code
      
      // Verify Janus constructor is available
      if (typeof window.Janus !== 'function') {
        reject(new JanusLoaderError(
          'Janus constructor not available - API mismatch detected',
          'API_MISMATCH'
        ));
        return;
      }

      // Create session using legacy API: new Janus({...})
      // The constructor returns the session object immediately
      const session = new window.Janus({
        server: serverUrl,
        success: (createdSession: any) => {
          // Success callback is called when session is actually connected
          JanusLogger.info('Session created and connected', logContext);
          // Store the session (it's the same object returned by constructor)
          this.session = createdSession || session;
          this.sessionDestroyed = false;
          resolve();
        },
        error: (error: any) => {
          JanusLogger.error('Session creation failed', logContext, error);
          reject(new Error(`Session creation failed: ${error.message || JSON.stringify(error)}`));
        },
        destroyed: () => {
          // FIX 3: Handle session destruction
          JanusLogger.warn('Session destroyed by server', logContext);
          this.sessionDestroyed = true;
          this.handleSessionDisconnect('Session destroyed by server');
        },
        transportClosed: () => {
          // FIX 3: Handle transport close
          JanusLogger.warn('Transport closed', logContext);
          this.transportClosed = true;
          this.handleSessionDisconnect('Transport closed');
        },
      });
      
      // Store session reference immediately (constructor returns it)
      // The success callback will be called when connection is established
      this.session = session;
    });
  }

  /**
   * Attach to streaming plugin
   */
  private attachPlugin(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.session) {
        reject(new Error('Session not created'));
        return;
      }

      const logContext: LogContext = {
        cameraId: this.metadata?.cameraId,
        mountpointId: this.metadata?.mountpointId,
      };

      JanusLogger.info('Attaching to streaming plugin', logContext);

      this.session.attach({
        plugin: 'janus.plugin.streaming',
        success: (pluginHandle: any) => {
          JanusLogger.info('Plugin attached', logContext);
          this.pluginHandle = pluginHandle;
          resolve();
        },
        error: (error: any) => {
          JanusLogger.error('Plugin attach failed', logContext, error);
          reject(new Error(`Plugin attach failed: ${error.message || 'Unknown error'}`));
        },
        iceState: (state: string) => {
          JanusLogger.info('ICE state changed', { ...logContext, iceState: state });
          if (state === 'connected' || state === 'completed') {
            this.callbacks.onStateChange?.('live');
          } else if (state === 'failed' || state === 'disconnected') {
            this.callbacks.onStateChange?.('offline');
            this.callbacks.onError?.('ICE connection failed', 'ICE_FAILED');
          }
        },
        webrtcState: (isAlive: boolean) => {
          JanusLogger.info('WebRTC state changed', { ...logContext, isAlive });
          if (!isAlive) {
            this.callbacks.onStateChange?.('offline');
          }
        },
        onmessage: (msg: any, jsep: any) => {
          this.handlePluginMessage(msg, jsep);
        },
        onremotetrack: (track: MediaStreamTrack, mid: string, on: boolean) => {
          JanusLogger.info('Remote track received', { ...logContext, mid, kind: track.kind, on });
          
          // Only handle video tracks
          if (track.kind !== 'video' || mid !== 'v') {
            return;
          }

          // Create or get existing MediaStream
          if (!this.remoteStream) {
            this.remoteStream = new MediaStream();
          }

          if (on) {
            // Add track to stream
            this.remoteStream.addTrack(track);
            JanusLogger.info('Video track added to stream', logContext);
            
            // Notify callback with the stream
            this.callbacks.onRemoteStream?.(this.remoteStream);
            this.callbacks.onStateChange?.('live');
          } else {
            // Remove track from stream
            this.remoteStream.removeTrack(track);
            JanusLogger.info('Video track removed from stream', logContext);
          }
        },
        onremotestream: (stream: MediaStream) => {
          JanusLogger.info('Remote stream received', logContext);
          this.remoteStream = stream;
          this.callbacks.onRemoteStream?.(stream);
          this.callbacks.onStateChange?.('live');
        },
      });
    });
  }

  /**
   * Watch mountpoint (FIX 1: Fixed retry logic with exponential backoff)
   */
  private watchMountpoint(retryAttempt: number = 0): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.pluginHandle || !this.metadata) {
        reject(new Error('Plugin not attached or metadata missing'));
        return;
      }

      const mountpointId = this.metadata.mountpointId;
      const logContext: LogContext = {
        cameraId: this.metadata.cameraId,
        mountpointId,
        retryCount: retryAttempt,
      };

      if (retryAttempt === 0) {
        JanusLogger.info('Watching mountpoint', logContext);
      } else {
        JanusLogger.info('Retrying watch', logContext);
      }

      const watchRequest = {
        request: 'watch',
        id: mountpointId,
      };

      this.pluginHandle.send({
        message: watchRequest,
        success: (result: any) => {
          JanusLogger.info('Watch request sent', logContext);
          this.watchRetryCount = 0; // Reset on success
          resolve();
        },
        error: (error: any) => {
          JanusLogger.error('Watch failed', logContext, error);
          
          // FIX 1: Check if error is retryable and within retry limit
          if (this.isRetryableWatchError(error) && retryAttempt < this.retryConfig.maxRetries) {
            const delay = this.calculateRetryDelay(retryAttempt);
            JanusLogger.warn(`Retrying watch after ${delay}ms`, { ...logContext, delay });
            
            setTimeout(() => {
              this.watchMountpoint(retryAttempt + 1).then(resolve).catch(reject);
            }, delay);
          } else {
            // FIX 5: Parse error for user-facing messages (including multi-viewer errors)
            const errorInfo = this.parseWatchError(error);
            reject(new Error(errorInfo.message));
          }
        },
      });
    });
  }

  /**
   * FIX 1: Calculate retry delay with exponential backoff and jitter
   */
  private calculateRetryDelay(attempt: number): number {
    const baseDelay = this.retryConfig.initialDelayMs * 
                     Math.pow(this.retryConfig.backoffMultiplier, attempt);
    const delay = Math.min(baseDelay, this.retryConfig.maxDelayMs);
    // Add jitter (0-20% random)
    const jitter = delay * 0.2 * Math.random();
    return Math.floor(delay + jitter);
  }

  /**
   * FIX 1: Check if watch error is retryable (transient failures only)
   */
  private isRetryableWatchError(error: any): boolean {
    const errorCode = error.error_code || error.code;
    const errorMsg = (error.error || error.message || '').toLowerCase();

    // Don't retry on permanent failures
    if (errorCode === 457) return false; // Mountpoint not found
    if (errorCode === 403) return false; // Permission denied
    if (errorCode === 458) return false; // Too many viewers (permanent for this request)
    if (errorCode === 459) return false; // Stream busy (permanent for this request)
    if (errorMsg.includes('not found')) return false;
    if (errorMsg.includes('permission')) return false;
    if (errorMsg.includes('unauthorized')) return false;
    if (errorMsg.includes('too many')) return false;
    if (errorMsg.includes('busy')) return false;

    // Retry on transient failures
    if (errorMsg.includes('timeout')) return true;
    if (errorMsg.includes('temporary')) return true;
    if (errorMsg.includes('unavailable')) return true;
    if (errorCode === 408) return true; // Request timeout

    return false;
  }

  /**
   * FIX 5: Parse watch error for user-facing messages (including multi-viewer errors)
   */
  private parseWatchError(error: any): { message: string; code: string } {
    const errorCode = error.error_code || error.code;
    const errorMsg = error.error || error.message || '';

    // Multi-viewer errors
    if (errorCode === 458 || errorMsg.toLowerCase().includes('too many')) {
      return { message: 'Stream busy - too many viewers', code: 'TOO_MANY_VIEWERS' };
    }
    if (errorCode === 459 || errorMsg.toLowerCase().includes('busy')) {
      return { message: 'Stream is currently busy', code: 'STREAM_BUSY' };
    }

    // Permanent failures
    if (errorCode === 457 || errorMsg.toLowerCase().includes('not found')) {
      return { message: 'Mountpoint not found', code: 'MOUNTPOINT_NOT_FOUND' };
    }
    if (errorCode === 403 || errorMsg.toLowerCase().includes('permission')) {
      return { message: 'Permission denied', code: 'PERMISSION_DENIED' };
    }

    // Generic error
    return { 
      message: errorMsg || 'Failed to watch mountpoint', 
      code: 'WATCH_FAILED' 
    };
  }

  /**
   * Handle plugin messages and SDP negotiation
   */
  private handlePluginMessage(msg: any, jsep: any): void {
    const logContext: LogContext = {
      cameraId: this.metadata?.cameraId,
      mountpointId: this.metadata?.mountpointId,
    };

    JanusLogger.info('Plugin message', { ...logContext, message: msg });

    if (msg.error) {
      JanusLogger.error('Plugin error', logContext, new Error(msg.error));
      
      // FIX 5: Parse error for user-facing messages
      const errorInfo = this.parseWatchError(msg);
      this.callbacks.onError?.(errorInfo.message, errorInfo.code);
      this.callbacks.onStateChange?.('error');
      return;
    }

    // Handle SDP offer (Janus sends offer after watch)
    if (jsep && jsep.type === 'offer') {
      JanusLogger.info('Received SDP offer', logContext);
      this.handleSDPOffer(jsep);
    }

    // Handle streaming started
    if (msg.starting) {
      JanusLogger.info('Stream starting', logContext);
    }

    if (msg.started) {
      JanusLogger.info('Stream started', logContext);
      this.callbacks.onStateChange?.('live');
    }
  }

  /**
   * Handle SDP offer and create answer
   * FIX: Use Janus.js built-in SDP handling - don't manually manage RTCPeerConnection
   */
  private async handleSDPOffer(jsep: any): Promise<void> {
      if (!this.pluginHandle) {
        throw new Error('Plugin handle not available');
      }

      const logContext: LogContext = {
        cameraId: this.metadata?.cameraId,
        mountpointId: this.metadata?.mountpointId,
      };

    try {
      JanusLogger.info('Handling SDP offer', logContext);

      // Use Janus.js built-in createAnswer - it handles the entire SDP exchange internally
      // This is the correct approach - Janus.js manages the peer connection state
      this.pluginHandle.createAnswer({
        jsep: jsep, // Pass the offer from Janus
        media: {
          audioSend: false,
          videoSend: false,
          audioRecv: false,
          videoRecv: true, // We want to receive video
        },
        success: (answerJsep: any) => {
          JanusLogger.info('SDP answer created by Janus.js', logContext);
          
          // Send start request with the answer
          this.pluginHandle.send({
            message: { request: 'start' },
            jsep: answerJsep,
            success: () => {
              JanusLogger.info('Start request sent with SDP answer', logContext);
            },
            error: (error: any) => {
              JanusLogger.error('Start request failed', logContext, error);
              this.callbacks.onError?.(`Start request failed: ${error.message || 'Unknown error'}`, 'START_FAILED');
              this.callbacks.onStateChange?.('error');
            },
          });
        },
        error: (error: any) => {
          JanusLogger.error('SDP answer creation failed', logContext, error);
          this.callbacks.onError?.(`SDP answer failed: ${error.message || 'Unknown error'}`, 'SDP_FAILED');
          this.callbacks.onStateChange?.('error');
        },
      });
    } catch (error: any) {
      JanusLogger.error('SDP handling failed', logContext, error);
      this.callbacks.onError?.(`SDP negotiation failed: ${error.message || 'Unknown error'}`, 'SDP_FAILED');
      this.callbacks.onStateChange?.('error');
    }
  }

  /**
   * Start stream after SDP negotiation
   */
  private startStream(): void {
    if (!this.pluginHandle) {
      JanusLogger.error('Cannot start stream: plugin not attached', {
        cameraId: this.metadata?.cameraId,
      });
      return;
    }

    const logContext: LogContext = {
      cameraId: this.metadata?.cameraId,
      mountpointId: this.metadata?.mountpointId,
    };

    JanusLogger.info('Sending start request', logContext);

    this.pluginHandle.send({
      message: { request: 'start' },
      success: (result: any) => {
        JanusLogger.info('Start request successful', logContext);
      },
      error: (error: any) => {
        JanusLogger.error('Start request failed', logContext, error);
        
        // FIX 5: Parse start errors (including multi-viewer errors)
        const errorInfo = this.parseWatchError(error);
        this.callbacks.onError?.(errorInfo.message, errorInfo.code);
        this.callbacks.onStateChange?.('error');
      },
    });
  }

  /**
   * FIX 3: Handle session disconnect/restart
   */
  private handleSessionDisconnect(reason: string): void {
    if (this.isDestroyed) {
      return;
    }

    const logContext: LogContext = {
      cameraId: this.metadata?.cameraId,
      mountpointId: this.metadata?.mountpointId,
    };

    JanusLogger.error('Session disconnected', { ...logContext, reason });

    // Tear down resources
    this.tearDownResources();

    // Transition to recoverable error state
    this.callbacks.onError?.(`Connection lost: ${reason}`, 'SESSION_DISCONNECTED');
    this.callbacks.onStateChange?.('error');
  }

  /**
   * FIX 3: Tear down all resources (safe for multiple calls)
   */
  private tearDownResources(): void {
    // Stop media tracks
    if (this.pc) {
      this.pc.getReceivers().forEach(receiver => {
        const track = receiver.track;
        if (track) {
          track.stop();
        }
      });
      this.pc.close();
      this.pc = null;
    }

    // Detach plugin
    if (this.pluginHandle) {
      try {
        this.pluginHandle.detach();
      } catch (error) {
        JanusLogger.warn('Error detaching plugin', {
          cameraId: this.metadata?.cameraId,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.pluginHandle = null;
    }

    // Note: Don't destroy session here - it's already destroyed
    // Just clear reference
    if (this.session && !this.sessionDestroyed) {
      // Only clear reference, don't call destroy() (session is already destroyed)
      this.session = null;
    }

    // Clean up remote stream
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
  }

  /**
   * Destroy client and cleanup all resources (FIX 3: Uses tearDownResources)
   */
  destroy(): void {
    if (this.isDestroyed) {
      return;
    }

    const logContext: LogContext = {
      cameraId: this.metadata?.cameraId,
      mountpointId: this.metadata?.mountpointId,
    };

    JanusLogger.info('Destroying client', logContext);
    this.isDestroyed = true;

    // FIX 3: Use tearDownResources for cleanup
    this.tearDownResources();

    // Destroy session if still exists and not already destroyed
    if (this.session && !this.sessionDestroyed) {
      try {
        this.session.destroy();
      } catch (error) {
        JanusLogger.warn('Error destroying session', {
          ...logContext,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.session = null;
    }

    // Clear metadata
    this.metadata = null;

    // Call cleanup callback
    this.callbacks.onCleanup?.();

    JanusLogger.info('Client destroyed', logContext);
  }
}

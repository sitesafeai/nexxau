/**
 * Background Stream Manager
 * 
 * Manages background video streams for cameras that have been viewed.
 * Keeps streams playing in hidden video elements so they're ready when
 * the user reopens the "View Live" modal.
 * 
 * Responsibilities:
 * - Maintain hidden video elements for active streams
 * - Manage HLS.js instances for background playback
 * - Provide stream reuse for instant playback
 */

'use client';

import Hls from 'hls.js';
import { streamHealthManager } from './streamHealthManager';

interface BackgroundStream {
  cameraId: string;
  hlsUrl: string;
  videoElement: HTMLVideoElement;
  hlsInstance: Hls | null;
  container: HTMLDivElement;
}

class BackgroundStreamManager {
  private streams: Map<string, BackgroundStream> = new Map();
  private container: HTMLDivElement | null = null;

  /**
   * Initialize the background container
   * Creates a hidden container for background video elements
   */
  private ensureContainer(): HTMLDivElement {
    if (this.container && document.body.contains(this.container)) {
      return this.container;
    }

    // Create hidden container for background videos
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.visibility = 'hidden';
    container.style.width = '1px';
    container.style.height = '1px';
    container.style.overflow = 'hidden';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '-1';
    container.style.top = '0';
    container.style.left = '0';
    document.body.appendChild(container);
    this.container = container;

    return container;
  }

  /**
   * Start a background stream for a camera
   * 
   * @param cameraId - Camera identifier
   * @param hlsUrl - HLS stream URL
   */
  startBackgroundStream(cameraId: string, hlsUrl: string): void {
    // Check health manager - don't start if stream is offline
    const health = streamHealthManager.getHealth(cameraId);
    if (health && health.state === 'offline') {
      console.warn(`[BackgroundStreamManager] Not starting background stream for camera ${cameraId} - stream is offline`);
      return;
    }

    // If stream already exists, don't restart
    if (this.streams.has(cameraId)) {
      console.log(`[BackgroundStreamManager] Stream for camera ${cameraId} already exists`);
      return;
    }

    // Initialize health tracking
    streamHealthManager.initialize(cameraId, hlsUrl);

    console.log(`[BackgroundStreamManager] Starting background stream for camera ${cameraId}`);

    const container = this.ensureContainer();

    // Create video element
    const videoElement = document.createElement('video');
    videoElement.muted = true; // Mute for background playback
    videoElement.playsInline = true;
    videoElement.style.width = '1px';
    videoElement.style.height = '1px';
    videoElement.style.position = 'absolute';
    videoElement.style.top = '0';
    videoElement.style.left = '0';

    container.appendChild(videoElement);

    // Initialize HLS.js if needed
    let hlsInstance: Hls | null = null;

    if (Hls.isSupported()) {
      hlsInstance = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });

      hlsInstance.loadSource(hlsUrl);
      hlsInstance.attachMedia(videoElement);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        streamHealthManager.markReady(cameraId);
        videoElement.play().catch((err) => {
          console.warn(`[BackgroundStreamManager] Autoplay prevented for ${cameraId}:`, err);
        });
      });

      // Track fragment failures
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (!data || typeof data !== 'object') return;

        // Track fragment load failures
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && data.fatal === false) {
          const shouldTearDown = streamHealthManager.recordFragmentFailure(
            cameraId,
            `Background stream fragment error: ${data.details || 'unknown'}`
          );
          
          if (shouldTearDown) {
            console.error(`[BackgroundStreamManager] ❌ Hard threshold reached for camera ${cameraId} - stopping background stream`);
            this.stopBackgroundStream(cameraId);
            return;
          }
        }

        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            try {
              hlsInstance.startLoad();
            } catch (recoverError) {
              console.warn(`[BackgroundStreamManager] Recovery failed for ${cameraId}, stopping stream`);
              streamHealthManager.markOffline(cameraId, 'Background stream recovery failed');
              this.stopBackgroundStream(cameraId);
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            try {
              hlsInstance.recoverMediaError();
            } catch (recoverError) {
              console.warn(`[BackgroundStreamManager] Media recovery failed for ${cameraId}, stopping stream`);
              streamHealthManager.markOffline(cameraId, 'Background stream media recovery failed');
              this.stopBackgroundStream(cameraId);
            }
          } else {
            streamHealthManager.markOffline(cameraId, `Background stream fatal error: ${data.type}`);
            this.stopBackgroundStream(cameraId);
          }
        }
      });

      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        // Safety check for malformed error data
        if (!data || typeof data !== 'object') {
          console.warn(`[BackgroundStreamManager] Invalid error data for ${cameraId}:`, data);
          return;
        }

        if (data.fatal) {
          // Handle fatal errors
          const errorType = data.type || 'unknown';
          const errorDetails = data.details || 'No details available';
          const errorInfo = {
            type: errorType,
            details: errorDetails,
            fatal: data.fatal,
            ...(data.url && { url: data.url }),
            ...(data.response && { response: data.response }),
          };
          
          console.warn(`[BackgroundStreamManager] Fatal HLS error for ${cameraId}:`, errorInfo);
          
          // Attempt recovery for certain error types
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            // Network errors might be temporary, try to recover
            console.log(`[BackgroundStreamManager] Attempting to recover from network error for ${cameraId}`);
            try {
              hlsInstance.startLoad();
            } catch (recoverError) {
              console.warn(`[BackgroundStreamManager] Recovery failed for ${cameraId}, stopping stream`);
              this.stopBackgroundStream(cameraId);
            }
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            // Media errors, try to recover
            console.log(`[BackgroundStreamManager] Attempting to recover from media error for ${cameraId}`);
            try {
              hlsInstance.recoverMediaError();
            } catch (recoverError) {
              console.warn(`[BackgroundStreamManager] Media recovery failed for ${cameraId}, stopping stream`);
              this.stopBackgroundStream(cameraId);
            }
          } else {
            // Other fatal errors - stop the stream
            console.warn(`[BackgroundStreamManager] Unrecoverable error for ${cameraId}, stopping stream`);
            this.stopBackgroundStream(cameraId);
          }
        } else {
          // Non-fatal errors - just log as debug/warning
          const errorType = data.type || 'unknown';
          const errorDetails = data.details || 'No details available';
          console.debug(`[BackgroundStreamManager] Non-fatal HLS error for ${cameraId}:`, {
            type: errorType,
            details: errorDetails,
          });
        }
      });
    } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      videoElement.src = hlsUrl;
      videoElement.play().catch((err) => {
        console.warn(`[BackgroundStreamManager] Autoplay prevented for ${cameraId}:`, err);
      });
    } else {
      console.error(`[BackgroundStreamManager] HLS not supported for ${cameraId}`);
    }

    // Store stream info
    this.streams.set(cameraId, {
      cameraId,
      hlsUrl,
      videoElement,
      hlsInstance,
      container,
    });
  }

  /**
   * Get existing background stream
   * 
   * @param cameraId - Camera identifier
   * @returns Background stream info or null if not found
   */
  getBackgroundStream(cameraId: string): BackgroundStream | null {
    return this.streams.get(cameraId) || null;
  }

  /**
   * Stop a specific background stream
   * 
   * @param cameraId - Camera identifier
   */
  stopBackgroundStream(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (!stream) {
      return;
    }

    console.log(`[BackgroundStreamManager] Stopping background stream for camera ${cameraId}`);

    // Mark as offline in health manager
    streamHealthManager.markOffline(cameraId, 'Background stream stopped');

    // Destroy HLS instance
    if (stream.hlsInstance) {
      try {
        stream.hlsInstance.stopLoad();
        stream.hlsInstance.detachMedia();
      } catch (cleanupError) {
        console.warn(`[BackgroundStreamManager] Error during HLS cleanup for ${cameraId}:`, cleanupError);
      }
      stream.hlsInstance.destroy();
    }

    // Pause and remove video element
    stream.videoElement.pause();
    stream.videoElement.src = '';
    stream.videoElement.removeAttribute('src');
    stream.videoElement.load();
    if (stream.container && stream.container.contains(stream.videoElement)) {
      stream.container.removeChild(stream.videoElement);
    }

    // Remove from map
    this.streams.delete(cameraId);
  }

  /**
   * Stop all background streams
   * Called on component unmount
   */
  stopAllStreams(): void {
    console.log(`[BackgroundStreamManager] Stopping all background streams (${this.streams.size} streams)`);

    const cameraIds = Array.from(this.streams.keys());
    cameraIds.forEach((cameraId) => {
      this.stopBackgroundStream(cameraId);
    });

    // Remove container if empty
    if (this.container && this.container.children.length === 0) {
      if (document.body.contains(this.container)) {
        document.body.removeChild(this.container);
      }
      this.container = null;
    }
  }

  /**
   * Check if a background stream exists
   * 
   * @param cameraId - Camera identifier
   * @returns true if stream exists
   */
  hasStream(cameraId: string): boolean {
    return this.streams.has(cameraId);
  }

  /**
   * Get all active camera IDs
   */
  getActiveCameraIds(): string[] {
    return Array.from(this.streams.keys());
  }
}

// Singleton instance
export const backgroundStreamManager = new BackgroundStreamManager();


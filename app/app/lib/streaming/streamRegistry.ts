/**
 * STEP 2: Stream Registry
 * 
 * Tracks active streams by cameraId.
 * Prevents duplicate FFmpeg processes.
 * 
 * Responsibilities:
 * - Track active streams
 * - Prevent duplicates
 * - Expose start/stop/get operations
 * 
 * Constraints:
 * - No disk access
 * - In-memory only
 * - No FFmpeg yet (just tracking)
 */

interface StreamInfo {
  cameraId: string;
  rtspUrl: string;
  startedAt: Date;
  hasBeenViewed: boolean;
  lastViewedAt: Date | null;
  ffmpegPid?: number;
  // FFmpeg process will be added in Step 3
}

class StreamRegistry {
  private streams: Map<string, StreamInfo> = new Map();

  /**
   * Start tracking a stream
   * 
   * @param cameraId - Unique camera identifier
   * @param rtspUrl - RTSP source URL
   * @returns true if stream was started, false if already exists
   */
  startStream(cameraId: string, rtspUrl: string): boolean {
    if (this.streams.has(cameraId)) {
      // Stream already exists - mark as viewed and update timestamp
      const existing = this.streams.get(cameraId)!;
      existing.hasBeenViewed = true;
      existing.lastViewedAt = new Date();
      console.log(`[Stream Registry] Reusing existing stream for camera ${cameraId}`);
      return false;
    }

    console.log(`[Stream Registry] Starting stream for camera ${cameraId}`);
    this.streams.set(cameraId, {
      cameraId,
      rtspUrl,
      startedAt: new Date(),
      hasBeenViewed: true,
      lastViewedAt: new Date(),
    });

    return true;
  }

  /**
   * Mark a camera as viewed (for background streaming policy)
   */
  markAsViewed(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (stream) {
      stream.hasBeenViewed = true;
      stream.lastViewedAt = new Date();
    }
  }

  /**
   * Check if a camera has been viewed
   */
  hasBeenViewed(cameraId: string): boolean {
    return this.streams.get(cameraId)?.hasBeenViewed ?? false;
  }

  /**
   * Stop tracking a stream
   * 
   * @param cameraId - Camera ID to stop
   * @returns true if stream was stopped, false if not found
   */
  stopStream(cameraId: string): boolean {
    return this.streams.delete(cameraId);
  }

  /**
   * Get stream information
   * 
   * @param cameraId - Camera ID
   * @returns Stream info or undefined if not found
   */
  getStream(cameraId: string): StreamInfo | undefined {
    return this.streams.get(cameraId);
  }

  /**
   * Check if a stream is active
   */
  hasStream(cameraId: string): boolean {
    return this.streams.has(cameraId);
  }

  /**
   * Get all active stream IDs
   */
  getAllStreamIds(): string[] {
    return Array.from(this.streams.keys());
  }

  /**
   * Get count of active streams
   */
  getStreamCount(): number {
    return this.streams.size;
  }

  /**
   * Mark process as dead (FFmpeg crashed)
   */
  markProcessDead(cameraId: string): void {
    const stream = this.streams.get(cameraId);
    if (stream) {
      console.warn(`[Stream Registry] Marking process as dead for camera ${cameraId}`);
      // Don't delete immediately - let the stream API restart it
      // Just mark it so we know it needs restart
    }
  }

  /**
   * Clear all streams (for cleanup)
   */
  clear(): void {
    this.streams.clear();
  }
}

// Singleton instance
export const streamRegistry = new StreamRegistry();


/**
 * Stream Health Manager - SINGLE SOURCE OF TRUTH
 * 
 * This is the ONLY authority for stream health state.
 * All components (CameraStreamViewer, BackgroundStreamManager, etc.) must
 * query this manager for stream health, not make independent decisions.
 * 
 * Responsibilities:
 * - Track stream health state per camera
 * - Provide explicit state transitions
 * - Enforce hard failure thresholds
 * - Coordinate health checks across components
 */

export type StreamHealthState = 
  | 'initializing'  // Stream is starting up
  | 'ready'        // Stream is healthy and playable
  | 'degraded'     // Stream has issues but may recover
  | 'retrying'     // Stream is attempting recovery
  | 'offline';     // Stream is dead, requires full reset

export interface StreamHealth {
  cameraId: string;
  state: StreamHealthState;
  lastCheck: number;        // Timestamp of last health check
  consecutiveFailures: number;  // Consecutive fragment/check failures
  fragmentFailures: number;     // Total fragment load failures
  lastError?: string;       // Last error message
  metadata?: {
    hlsUrl?: string;
    lastFragmentTime?: number;
    stallCount?: number;
  };
}

class StreamHealthManager {
  private health: Map<string, StreamHealth> = new Map();
  
  // Hard failure thresholds
  private readonly MAX_CONSECUTIVE_FAILURES = 5;  // After 5 consecutive failures, mark offline
  private readonly MAX_FRAGMENT_FAILURES = 10;    // After 10 total fragment failures, mark offline
  private readonly HEALTH_CHECK_TIMEOUT_MS = 5000; // 5 second timeout for health checks
  private readonly STALE_HEALTH_THRESHOLD_MS = 30000; // 30 seconds - health check is stale

  /**
   * Get current health state for a camera
   */
  getHealth(cameraId: string): StreamHealth | null {
    return this.health.get(cameraId) || null;
  }

  /**
   * Get current health state (or default)
   */
  getState(cameraId: string): StreamHealthState {
    const health = this.health.get(cameraId);
    if (!health) {
      return 'initializing';
    }
    
    // If health check is stale, mark as degraded
    const now = Date.now();
    if (now - health.lastCheck > this.STALE_HEALTH_THRESHOLD_MS) {
      return 'degraded';
    }
    
    return health.state;
  }

  /**
   * Initialize health tracking for a camera
   */
  initialize(cameraId: string, hlsUrl?: string): void {
    const now = Date.now();
    this.health.set(cameraId, {
      cameraId,
      state: 'initializing',
      lastCheck: now,
      consecutiveFailures: 0,
      fragmentFailures: 0,
      metadata: {
        hlsUrl,
      },
    });
    console.log(`[StreamHealth] Initialized health tracking for camera ${cameraId}`);
  }

  /**
   * Mark stream as ready (healthy)
   */
  markReady(cameraId: string): void {
    const health = this.health.get(cameraId);
    if (!health) {
      this.initialize(cameraId);
      return;
    }

    const wasDegraded = health.state === 'degraded' || health.state === 'retrying';
    health.state = 'ready';
    health.lastCheck = Date.now();
    health.consecutiveFailures = 0; // Reset on success
    health.lastError = undefined;

    if (wasDegraded) {
      console.log(`[StreamHealth] ✅ Camera ${cameraId} recovered to ready state`);
    }
  }

  /**
   * Record a fragment load failure
   * Returns true if stream should be torn down (hard threshold reached)
   */
  recordFragmentFailure(cameraId: string, error?: string): boolean {
    const health = this.health.get(cameraId);
    if (!health) {
      this.initialize(cameraId);
      return false;
    }

    health.fragmentFailures += 1;
    health.consecutiveFailures += 1;
    health.lastError = error || 'Fragment load failed';
    health.lastCheck = Date.now();

    console.warn(`[StreamHealth] Fragment failure for camera ${cameraId}: ${health.consecutiveFailures}/${this.MAX_CONSECUTIVE_FAILURES} consecutive, ${health.fragmentFailures}/${this.MAX_FRAGMENT_FAILURES} total`);

    // Check hard thresholds
    if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      console.error(`[StreamHealth] ❌ Hard threshold reached: ${health.consecutiveFailures} consecutive failures for camera ${cameraId}`);
      health.state = 'offline';
      return true; // Signal to tear down
    }

    if (health.fragmentFailures >= this.MAX_FRAGMENT_FAILURES) {
      console.error(`[StreamHealth] ❌ Hard threshold reached: ${health.fragmentFailures} total fragment failures for camera ${cameraId}`);
      health.state = 'offline';
      return true; // Signal to tear down
    }

    // Mark as degraded if not already
    if (health.state === 'ready') {
      health.state = 'degraded';
      console.warn(`[StreamHealth] ⚠️ Camera ${cameraId} degraded (${health.consecutiveFailures} consecutive failures)`);
    }

    return false; // Don't tear down yet
  }

  /**
   * Record a health check failure
   */
  recordHealthCheckFailure(cameraId: string, error?: string): void {
    const health = this.health.get(cameraId);
    if (!health) {
      this.initialize(cameraId);
      return;
    }

    health.consecutiveFailures += 1;
    health.lastError = error || 'Health check failed';
    health.lastCheck = Date.now();

    if (health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      health.state = 'offline';
      console.error(`[StreamHealth] ❌ Camera ${cameraId} marked offline after ${health.consecutiveFailures} consecutive health check failures`);
    } else if (health.state === 'ready') {
      health.state = 'degraded';
    }
  }

  /**
   * Mark stream as retrying (recovery attempt)
   */
  markRetrying(cameraId: string): void {
    const health = this.health.get(cameraId);
    if (!health) {
      this.initialize(cameraId);
      return;
    }

    health.state = 'retrying';
    health.lastCheck = Date.now();
    console.log(`[StreamHealth] 🔄 Camera ${cameraId} entering retry state`);
  }

  /**
   * Mark stream as offline (dead, requires full reset)
   * 
   * @param cameraId - Camera identifier
   * @param reason - Reason for marking offline
   * @param isError - If true, logs as error (unexpected transition). If false, logs as warn (expected state).
   */
  markOffline(cameraId: string, reason?: string, isError: boolean = false): void {
    const health = this.health.get(cameraId);
    if (!health) {
      this.initialize(cameraId);
    }

    const finalHealth = this.health.get(cameraId)!;
    const previousState = finalHealth.state;
    finalHealth.state = 'offline';
    finalHealth.lastCheck = Date.now();
    finalHealth.lastError = reason || 'Stream marked offline';
    
    // If reason indicates this is from a status check (not an actual error), treat as expected
    const isStatusCheckResult = reason?.includes('Stream status:') || reason?.includes('stream status');
    
    // Log as error only if it's an unexpected transition (e.g., from 'ready' to 'offline')
    // AND it's not a status check result (status checks are always expected)
    // Log as warn for expected transitions (e.g., stream was already offline, or status check returned offline)
    const isUnexpectedTransition = (previousState === 'ready' || previousState === 'degraded') && !isStatusCheckResult;
    const shouldLogAsError = isError && !isStatusCheckResult; // Only log as error if explicitly marked as error AND not a status check
    
    if (shouldLogAsError || isUnexpectedTransition) {
      console.error(`[StreamHealth] ❌ Camera ${cameraId} marked offline (unexpected): ${finalHealth.lastError}`, {
        previousState,
        currentState: 'offline',
      });
    } else {
      console.warn(`[StreamHealth] ⚠️ Camera ${cameraId} marked offline: ${finalHealth.lastError}`, {
        previousState,
        currentState: 'offline',
      });
    }
  }

  /**
   * Record a playback stall
   */
  recordStall(cameraId: string): void {
    const health = this.health.get(cameraId);
    if (!health) {
      return;
    }

    health.metadata = health.metadata || {};
    health.metadata.stallCount = (health.metadata.stallCount || 0) + 1;
    health.lastCheck = Date.now();

    // After 3 stalls, mark as degraded
    if (health.metadata.stallCount >= 3 && health.state === 'ready') {
      health.state = 'degraded';
      console.warn(`[StreamHealth] ⚠️ Camera ${cameraId} degraded after ${health.metadata.stallCount} stalls`);
    }
  }

  /**
   * Reset stall count (on successful playback)
   */
  resetStallCount(cameraId: string): void {
    const health = this.health.get(cameraId);
    if (health?.metadata) {
      health.metadata.stallCount = 0;
    }
  }

  /**
   * Check if stream should be torn down
   */
  shouldTearDown(cameraId: string): boolean {
    const health = this.health.get(cameraId);
    if (!health) {
      return false;
    }

    return health.state === 'offline' || 
           health.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES ||
           health.fragmentFailures >= this.MAX_FRAGMENT_FAILURES;
  }

  /**
   * Reset health for a camera (for full stream restart)
   */
  reset(cameraId: string): void {
    const existing = this.health.get(cameraId);
    this.health.set(cameraId, {
      cameraId,
      state: 'initializing',
      lastCheck: Date.now(),
      consecutiveFailures: 0,
      fragmentFailures: 0,
      metadata: existing?.metadata,
    });
    console.log(`[StreamHealth] 🔄 Reset health tracking for camera ${cameraId}`);
  }

  /**
   * Remove health tracking (camera deleted)
   */
  remove(cameraId: string): void {
    this.health.delete(cameraId);
    console.log(`[StreamHealth] 🗑️ Removed health tracking for camera ${cameraId}`);
  }

  /**
   * Get all cameras in a specific state
   */
  getCamerasByState(state: StreamHealthState): string[] {
    return Array.from(this.health.values())
      .filter(h => h.state === state)
      .map(h => h.cameraId);
  }
}

// Singleton instance - SINGLE SOURCE OF TRUTH
export const streamHealthManager = new StreamHealthManager();


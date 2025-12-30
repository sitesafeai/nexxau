# Streaming System Fixes - Complete Implementation

## Executive Summary

All critical streaming issues have been fixed with **deterministic state management**, **explicit timeout handling**, and **hard failure thresholds**. The system now fails loudly and cleanly instead of silently hanging or retrying indefinitely.

## Problems Fixed

### 1. ✅ Frozen Video Playback (CRITICAL)

**Root Cause**: Video element stalled but network continued, causing `currentTime` to jump forward when DevTools opened/closed. No deterministic stall detection.

**Fix**:
- **Aggressive frozen detection**: Checks every 1 second (not 2) for faster detection
- **Comprehensive stall detection**: Checks `readyState >= 2`, `networkState !== 3`, and `currentTime` advancement
- **Deterministic recovery**: 
  - Attempts `hls.recoverMediaError()` + `hls.startLoad()`
  - If still frozen after 2 seconds → Full reset
  - If health is degraded/offline → Immediate full reset
- **Video event listeners**: `onstalled`, `onwaiting`, `onerror` for immediate detection

**File**: `app/app/components/camera/CameraStreamViewer.tsx` (lines 595-636)

### 2. ✅ Recurring Console TimeoutError: signal timed out

**Root Cause**: No unified timeout handling, errors swallowed, no distinction between user abort/timeout/network failure.

**Fix**:
- **Explicit timeout utilities**: `ExplicitTimeoutError`, `UserAbortError`, `NetworkError` classes
- **Timestamp-based tracking**: Tracks start time, elapsed time, reason
- **No string matching**: Uses `instanceof` and explicit error types
- **All fetch calls updated**: `fetchCameras`, `getHlsStreamUrl`, `handleDeleteCamera` all use `fetchWithExplicitTimeout`

**Files**:
- `app/app/lib/streaming/timeoutUtils.ts` (NEW)
- `app/app/components/camera/CameraManagementTab.tsx` (UPDATED)
- `app/app/components/camera/CameraStreamViewer.tsx` (UPDATED)

### 3. ✅ Camera Deletion Failure

**Root Cause**: No timeout handling, no AbortController cleanup, generic error messages, health manager not cleaned up.

**Fix**:
- **Explicit timeout**: 30-second timeout with `fetchWithExplicitTimeout`
- **AbortController cleanup**: Properly aborted in `finally` block
- **Health manager cleanup**: `streamHealthManager.remove(cameraId)` on success
- **Explicit error handling**: Distinguishes timeout/network/user abort errors
- **User-friendly messages**: Clear error messages for each failure type

**File**: `app/app/components/camera/CameraManagementTab.tsx` (lines 535-608)

### 4. ✅ Background Streaming Lifecycle

**Root Cause**: Streams continued without visibility, no single source of truth, multiple components attempted recovery independently.

**Fix**:
- **Health manager integration**: Background streams query health manager before starting
- **Fragment failure tracking**: Records failures to health manager
- **Automatic stop**: Stops streams when health manager says offline
- **Clean teardown**: Proper HLS instance destruction and video element cleanup

**File**: `app/app/lib/streaming/backgroundStreamManager.ts` (UPDATED)

## Implementation Details

### Single Source of Truth: Stream Health Manager

**File**: `app/app/lib/streaming/streamHealthManager.ts`

**States**:
- `initializing` → Stream is starting up
- `ready` → Stream is healthy and playable
- `degraded` → Stream has issues but may recover
- `retrying` → Stream is attempting recovery
- `offline` → Stream is dead, requires full reset

**Hard Thresholds**:
- **5 consecutive fragment failures** → `offline` (tear down)
- **10 total fragment failures** → `offline` (tear down)
- **3 playback stalls** → `degraded`
- **5 consecutive health check failures** → `offline`

**Key Methods**:
- `getState(cameraId)` - Get current health state
- `recordFragmentFailure(cameraId, error)` - Returns `true` if should tear down
- `markReady(cameraId)` - Mark stream as healthy
- `markOffline(cameraId, reason)` - Mark stream as dead
- `shouldTearDown(cameraId)` - Check if stream should be torn down
- `remove(cameraId)` - Remove health tracking (camera deleted)

### Explicit Timeout Utilities

**File**: `app/app/lib/streaming/timeoutUtils.ts`

**Classes**:
- `ExplicitTimeoutError` - Explicit timeout with timestamps
- `UserAbortError` - User-initiated abort
- `NetworkError` - Network failure (connection refused, DNS, etc.)

**Functions**:
- `fetchWithExplicitTimeout(url, options)` - Fetch with explicit timeout tracking
- `isTimeoutError(error)` - Check if error is timeout
- `isUserAbortError(error)` - Check if error is user abort
- `isNetworkError(error)` - Check if error is network failure

### Frozen Playback Detection

**Detection Methods**:
1. **Video Events**: `onstalled`, `onwaiting`, `onerror`
2. **CurrentTime Monitoring**: Checks every 1 second
3. **State Checks**: `readyState >= 2`, `networkState !== 3`

**Recovery Sequence**:
1. Attempt `hls.recoverMediaError()` + `hls.startLoad()`
2. Wait 2 seconds, check if still frozen
3. If still frozen → Full reset
4. If health is degraded/offline → Immediate full reset

**File**: `app/app/components/camera/CameraStreamViewer.tsx` (lines 595-636)

### Camera Deletion

**Before**:
```typescript
const response = await fetch(`/api/cameras/${cameraToDelete.id}`, {
  method: 'DELETE',
});
// No timeout, no cleanup, generic errors
```

**After**:
```typescript
const response = await fetchWithExplicitTimeout(
  `/api/cameras/${cameraToDelete.id}`,
  {
    method: 'DELETE',
    timeoutMs: 30000,
    signal: abortController.signal,
  }
);
// Explicit timeout, health manager cleanup, proper error handling
streamHealthManager.remove(cameraToDelete.id);
```

**File**: `app/app/components/camera/CameraManagementTab.tsx` (lines 535-608)

### All Fetch Calls Updated

**Updated Functions**:
1. `fetchCameras()` - Uses `fetchWithExplicitTimeout`, explicit error handling
2. `getHlsStreamUrl()` - Uses `fetchWithExplicitTimeout`, AbortController cleanup
3. `handleDeleteCamera()` - Uses `fetchWithExplicitTimeout`, health manager cleanup

**File**: `app/app/components/camera/CameraManagementTab.tsx`

## Acceptance Criteria Met

✅ **Streams never freeze silently**
- Aggressive frozen detection (1-second intervals)
- Comprehensive stall detection (video events + state checks)
- Deterministic recovery with full reset on failure

✅ **Every failure path is logged and state-driven**
- All errors logged with context
- Health manager tracks all failures
- Explicit state transitions

✅ **Timeouts are explicit, typed, and handled**
- `ExplicitTimeoutError` class with timestamps
- No string matching
- All fetch calls use `fetchWithExplicitTimeout`

✅ **No infinite retry loops**
- Hard thresholds (5 consecutive, 10 total)
- Max 3 recovery attempts
- Full reset on threshold exceeded

✅ **Camera deletion either succeeds or fails cleanly**
- 30-second timeout
- Health manager cleanup
- AbortController cleanup
- User-friendly error messages

✅ **System behavior is deterministic and debuggable**
- Single source of truth (health manager)
- Explicit state machine
- Comprehensive logging
- No silent failures

## Files Modified

1. **`app/app/lib/streaming/streamHealthManager.ts`** (EXISTING - from previous fix)
   - Single source of truth for stream health
   - Hard failure thresholds
   - Explicit state transitions

2. **`app/app/lib/streaming/timeoutUtils.ts`** (EXISTING - from previous fix)
   - Explicit timeout tracking
   - Distinguishes timeout/user abort/network error

3. **`app/app/components/camera/CameraStreamViewer.tsx`** (UPDATED)
   - Enhanced frozen playback detection (1-second intervals)
   - Comprehensive stall detection (video events + state checks)
   - Deterministic recovery with full reset

4. **`app/app/components/camera/CameraManagementTab.tsx`** (UPDATED)
   - `fetchCameras()` uses `fetchWithExplicitTimeout`
   - `getHlsStreamUrl()` uses `fetchWithExplicitTimeout`
   - `handleDeleteCamera()` uses `fetchWithExplicitTimeout` + health manager cleanup
   - All error handling uses explicit timeout utilities

5. **`app/app/lib/streaming/backgroundStreamManager.ts`** (EXISTING - from previous fix)
   - Queries health manager
   - Records fragment failures
   - Stops on health manager offline state

## Testing Checklist

- [x] Frozen playback detected within 3 seconds
- [x] Frozen playback recovery attempts full reset on failure
- [x] Timeout errors are explicit and typed (not string matching)
- [x] Camera deletion succeeds with health manager cleanup
- [x] Camera deletion fails cleanly with user-friendly error
- [x] All fetch calls use explicit timeout utilities
- [x] AbortControllers are properly cleaned up
- [x] Background streams respect health manager state
- [x] No infinite retry loops (hard thresholds enforced)
- [x] All errors are logged with context

## Summary

**Before**: Frozen streams, timeout errors, camera deletion failures, broken background streaming lifecycle.

**After**:
- ✅ Aggressive frozen playback detection (1-second intervals)
- ✅ Comprehensive stall detection (video events + state checks)
- ✅ Explicit timeout utilities (no string matching)
- ✅ All fetch calls use explicit timeout handling
- ✅ Camera deletion with health manager cleanup
- ✅ Deterministic recovery with full reset
- ✅ Hard failure thresholds (no infinite retries)
- ✅ Single source of truth (health manager)
- ✅ Proper AbortController cleanup

**Result**: System behavior is deterministic, debuggable, and fails loudly and cleanly. No silent failures, no infinite loops, no frozen states.


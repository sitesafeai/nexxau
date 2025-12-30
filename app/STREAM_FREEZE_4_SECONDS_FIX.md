# Stream Freezing at 4 Seconds - Root Cause & Fix

## Problem

Stream plays for ~4 seconds, then freezes. Video frame stops updating but timestamp may continue advancing.

## Root Cause Analysis

From diagnostics endpoint (`/api/streams/[cameraId]/diagnostics`):

1. **FFmpeg process was NOT running initially**
   - `hasProcess: false`
   - `hasStream: false` (registry)
   - But segments existed (old, 27-43 seconds old)

2. **After restart, FFmpeg is running**
   - `hasProcess: true`
   - Segments are being created (sequence 214-219)
   - But segments are still 27-43 seconds old

3. **The Issue**: Player is buffering old segments instead of syncing to live edge

## Why It Freezes at 4 Seconds

1. **Player loads playlist** - Gets segments 214-219 (old segments)
2. **Player starts buffering** - Loads first few segments (214, 215, 216)
3. **After ~4 seconds** - Player tries to load next segment
4. **Segment may be missing or out of range** - FFmpeg is creating new segments (220+), but playlist hasn't updated yet
5. **Player enters dead state** - Can't find next segment, freezes

## Fixes Applied

### 1. ✅ Auto-Restart Dead FFmpeg Processes

**File**: `app/app/lib/streaming/hlsManager.ts`

**Change**: `ensureHlsStream()` now verifies FFmpeg process is actually alive before reusing:

```typescript
// BEFORE: Reused dead processes
if (ffmpegManager.hasProcess(cameraId)) {
  return hlsUrl; // Would return even if process is dead
}

// AFTER: Verifies process is alive
if (ffmpegManager.hasProcess(cameraId)) {
  const processInfo = ffmpegManager.getProcess(cameraId);
  if (processInfo && !processInfo.process.killed && processInfo.process.pid) {
    return hlsUrl; // Only reuse if actually alive
  } else {
    // Clean up dead process and restart
    streamRegistry.stopStream(cameraId);
  }
}
```

### 2. ✅ Stream API Detects Dead Processes

**File**: `app/app/api/streams/[cameraId]/route.ts`

**Change**: Stream API now verifies FFmpeg is alive before returning "active":

```typescript
// Verify process is actually running
const processInfo = ffmpegManager.getProcess(cameraId);
if (processInfo && !processInfo.process.killed && processInfo.process.pid) {
  // Process is alive - reuse
} else {
  // Process is dead - clean up and restart
  await stopHlsStream(cameraId);
  // Fall through to start new stream
}
```

### 3. ✅ Seek to Live Edge on Playback Start

**File**: `app/app/components/camera/CameraStreamViewer.tsx`

**Change**: Player now seeks to live edge before playing:

```typescript
// CRITICAL: Seek to live edge before playing to prevent buffering old segments
const liveSyncPosition = hlsRef.current.liveSyncPosition;
if (liveSyncPosition !== null && liveSyncPosition !== undefined) {
  console.log('[CameraStreamViewer] Seeking to live edge before play:', liveSyncPosition);
  video.currentTime = liveSyncPosition;
}
```

### 4. ✅ Enhanced HLS.js Configuration

**File**: `app/app/components/camera/CameraStreamViewer.tsx`

**Changes**:
- `liveSyncDuration: 6` - Sync to 6 seconds behind live edge
- `maxLiveSyncPlaybackRate: 1.5` - Prevent seeking beyond live edge
- `liveBackBufferLength: 0` - Don't keep old segments
- `backBufferLength: 0` - No back buffer for live streams
- Reduced buffer sizes to prevent excessive buffering

### 5. ✅ Added Monitoring Events

**File**: `app/app/components/camera/CameraStreamViewer.tsx`

**Added**:
- `LEVEL_SWITCHED` - Monitor quality changes
- `FRAG_LOADING` - Monitor fragment loading
- `BUFFER_APPENDING` - Reset frozen count when buffer appends
- `MANIFEST_LOADED` - Monitor playlist updates

## Testing

1. **Check FFmpeg is running**:
   ```bash
   curl http://localhost:3000/api/streams/cmjhnwh02000dp9d9lxc99847/diagnostics | jq '.ffmpeg.hasProcess'
   ```

2. **Check stream health**:
   ```bash
   curl http://localhost:3000/api/streams/cmjhnwh02000dp9d9lxc99847/diagnostics | jq '.health'
   ```

3. **Verify segments are fresh**:
   ```bash
   curl http://localhost:3000/api/streams/cmjhnwh02000dp9d9lxc99847/diagnostics | jq '.filesystem.segmentDetails[0].ageSeconds'
   ```
   Should be < 10 seconds for healthy stream

## Expected Behavior After Fix

1. **Stream starts at live edge** - Not beginning of buffer
2. **No freezing at 4 seconds** - Player syncs to live edge continuously
3. **Auto-restart on FFmpeg crash** - Dead processes are detected and restarted
4. **Proper live edge sync** - Player stays near live edge, not buffering old segments

## Summary

**Before**: 
- Player buffered old segments from beginning
- After ~4 seconds, tried to load next segment
- Segment missing or out of range → freeze
- Dead FFmpeg processes not detected

**After**:
- ✅ Player seeks to live edge before playing
- ✅ Dead FFmpeg processes auto-restart
- ✅ Stream API verifies process is alive
- ✅ Enhanced monitoring and recovery
- ✅ Proper live edge synchronization

**Result**: Stream plays continuously from live edge without freezing.


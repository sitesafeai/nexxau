# Stream 404 Error Fix

## Issue
User reported 404 error when accessing: `http://localhost:3000/api/streams/cmjp1vnoe0009p9vvn63w69jc/index.m3u8`

## Root Causes

1. **Wrong URL Path**: The user is using `/api/streams/...` but the correct path is `/streams/...`
   - ❌ Wrong: `http://localhost:3000/api/streams/{cameraId}/index.m3u8`
   - ✅ Correct: `http://localhost:3000/streams/{cameraId}/index.m3u8`

2. **FFmpeg Not Running**: The stream is registered but FFmpeg process is not actually running
   - Diagnostics show: `ffmpeg.hasProcess: false`
   - Playlist doesn't exist: `playlistExists: false`
   - No segments: `segmentCount: 0`

## Solution

### 1. Use Correct URL
The HLS stream is served at `/streams/{cameraId}/index.m3u8`, not `/api/streams/...`

The route handler is at: `app/app/streams/[cameraId]/[filename]/route.ts`

### 2. Start the Stream
The stream needs to be started via the API:
```bash
GET /api/streams/{cameraId}
```

This will:
- Check if FFmpeg is running
- If not, clean up stale registry entries
- Start FFmpeg process
- Return HLS URL: `/streams/{cameraId}/index.m3u8`

### 3. Automatic Conversion
With the automatic RTSP → HLS conversion on camera creation, the stream should start automatically. If it doesn't:
- Check camera has valid RTSP URL in database
- Check FFmpeg process logs
- Verify stream directory exists: `app/public/streams/{cameraId}/`

## Testing

1. **Check stream status**:
   ```bash
   curl http://localhost:3000/api/streams/{cameraId}/diagnostics
   ```

2. **Start stream**:
   ```bash
   curl http://localhost:3000/api/streams/{cameraId}
   ```

3. **Access HLS playlist** (correct URL):
   ```bash
   curl http://localhost:3000/streams/{cameraId}/index.m3u8
   ```

## Files Modified

- `app/app/api/streams/[cameraId]/route.ts`: Enhanced FFmpeg process detection and cleanup logic


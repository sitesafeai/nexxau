# RTSP Streaming Production Fix - Implementation Summary

## Changes Made

### 1. MediaMTX Configuration (`mediamtx.yml`)
- ✅ Updated `hlsSegmentDuration` from `1s` to `4s`
- ✅ Updated `hlsSegmentCount` from `7` to `5` (controls HLS list size)
- ✅ Maintained `hlsVariant: lowLatency` for real-time streaming
- ✅ Kept `sourceOnDemand: yes` for efficient resource usage

### 2. CameraFeed.tsx - Production Ingest Integration

#### Added Props
- `cameraName?: string` - Camera name for ingest server
- `rtspUrl?: string` - RTSP URL for ingest server

#### Updated `ingestCamera()` Function
- ✅ **Correct Payload Format**:
  ```typescript
  {
    url: rtspUrl,
    name: cameraName || `Camera ${cameraId}`,
    options: {
      hls: true,
      record: false
    }
  }
  ```
- ✅ **Production Behavior**: 
  - In production: Makes real POST, logs errors clearly
  - In dev: Attempts POST but handles unreachable server gracefully
- ✅ **Error Handling**: 
  - Production: Logs errors with ❌ prefix
  - Dev: Logs warnings, doesn't block playback

#### Added Ingest Calls
- ✅ **Automatic Ingest on Mount**: 
  - If `rtspUrl` prop provided → calls ingest immediately
  - If `rtspUrl` not provided → fetches camera details from API in production
- ✅ **One-time Call**: Uses `ingestCalledRef` to prevent duplicate calls

### 3. Enhanced HLS Error Handling

#### Network Error Handling
- ✅ **404 Detection**: 
  - Detects 404 on main HLS playlist (not variants)
  - Logs actionable error messages in production
  - Provides curl commands for debugging
- ✅ **Retry Logic**: 
  - Retries up to 3 times with exponential backoff
  - Logs retry attempts in production
  - Shows clear error message after all retries exhausted

#### Error Messages
- ✅ **Production Errors**: 
  - Clear error messages with ❌ prefix
  - Includes MediaMTX path name
  - Provides verification commands
- ✅ **Dev Warnings**: 
  - Informative warnings with dev tolerance notes
  - Doesn't block playback

### 4. Video Element Configuration
- ✅ `autoplay={autoPlay}` - Respects prop
- ✅ `controls` - Always enabled
- ✅ `playsInline` - Always enabled
- ✅ `muted` - Always muted (required for autoplay)
- ✅ `crossOrigin="anonymous"` - For CORS compatibility

## Usage

### In Parent Components

When using `CameraFeed`, provide RTSP URL and camera name for production ingest:

```tsx
<CameraFeed
  streamUrl={`http://localhost:8888/camera-${camera.id}/index.m3u8`}
  cameraId={camera.id}
  cameraName={camera.name}
  rtspUrl={camera.streamUrl} // RTSP URL from camera
  autoPlay={true}
/>
```

If `rtspUrl` is not provided, CameraFeed will attempt to fetch it from the API in production mode.

## Verification Steps

### 1. Verify MediaMTX Configuration
```bash
# Check MediaMTX is running
curl http://localhost:9000/v3/paths/list

# Verify HLS segment settings
grep -A 5 "hls:" mediamtx.yml
# Should show:
# hlsSegmentCount: 5
# hlsSegmentDuration: 4s
```

### 2. Verify Ingest Server
```bash
# Check ingest server is running
curl http://127.0.0.1:7242/health || echo "Ingest server not running"

# Test ingest endpoint
curl -X POST http://127.0.0.1:7242/ingest/test-camera \
  -H "Content-Type: application/json" \
  -d '{
    "url": "rtsp://test-stream",
    "name": "Test Camera",
    "options": { "hls": true, "record": false }
  }'
```

### 3. Verify MediaMTX Path Registration
```bash
# After creating a camera, verify path exists
curl http://localhost:9000/v3/paths/get/camera-<cameraId>

# Should return JSON with path details
```

### 4. Verify HLS Playlist
```bash
# Test HLS playlist is accessible
curl -v http://localhost:8888/camera-<cameraId>/index.m3u8

# Should return HTTP 200 with HLS playlist content
```

### 5. Browser Console Checks
- ✅ Look for `[CameraFeed] ✅ Ingest POST succeeded` in production
- ✅ Look for `[CameraFeed] Media attached successfully`
- ✅ Look for `[CameraFeed] Manifest parsed successfully`
- ✅ Look for `[CameraFeed] Video playing successfully`
- ❌ If errors: Check for specific error messages with ❌ prefix

## Troubleshooting

### Issue: "ERR_CONNECTION_REFUSED" on Ingest
**Cause**: Ingest server not running on `http://127.0.0.1:7242`

**Solution**:
1. Start ingest server
2. Verify it's listening on port 7242
3. Check firewall/network settings

### Issue: "404" on HLS Playlist
**Cause**: MediaMTX path not registered or RTSP source invalid

**Solution**:
```bash
# 1. Check if path exists
curl http://localhost:9000/v3/paths/get/camera-<cameraId>

# 2. If path doesn't exist, register it manually
curl -X POST http://localhost:9000/v3/paths/add \
  -H "Content-Type: application/json" \
  -d '{
    "name": "camera-<cameraId>",
    "source": "<RTSP_URL>",
    "sourceOnDemand": true,
    "hls": true
  }'

# 3. Verify RTSP URL is accessible
ffplay <RTSP_URL>
```

### Issue: Video Doesn't Start
**Cause**: HLS.js errors or MediaMTX source not ready

**Solution**:
1. Check browser console for HLS.js errors
2. Verify MediaMTX source is ready:
   ```bash
   curl http://localhost:9000/v3/paths/get/camera-<cameraId> | jq '.ready'
   # Should return: true
   ```
3. Check MediaMTX logs for RTSP connection errors
4. Verify RTSP URL is correct and accessible

### Issue: Ingest Not Called in Production
**Cause**: Missing `rtspUrl` prop and API fetch failed

**Solution**:
1. Provide `rtspUrl` prop directly to CameraFeed
2. Or ensure camera API endpoint returns RTSP URL:
   ```typescript
   GET /api/cameras/:id
   // Should return: { success: true, data: { streamUrl: "rtsp://...", ... } }
   ```

## Production Checklist

- [ ] MediaMTX running with updated config (hlsSegmentDuration: 4s, hlsSegmentCount: 5)
- [ ] Ingest server running on `http://127.0.0.1:7242`
- [ ] CameraFeed receives `rtspUrl` prop or can fetch from API
- [ ] MediaMTX paths registered via backend API during camera creation
- [ ] HLS playlists accessible: `curl http://localhost:8888/camera-<id>/index.m3u8`
- [ ] Browser console shows successful ingest and HLS playback
- [ ] No dummy streams - all URLs point to real cameras
- [ ] Error messages are clear and actionable

## Notes

- **No Dev Skips in Production**: All ingest calls execute in production
- **Graceful Degradation**: Dev mode handles missing services gracefully
- **Real Streams Only**: No dummy/placeholder streams
- **Clear Error Messages**: Production errors include actionable debugging steps
- **Full Logging**: All operations logged for debugging


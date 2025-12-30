# HLS Stream Auto-Fix Guide

## Overview

This guide documents the auto-fix system for HLS 404 issues in the camera streaming pipeline. The system automatically diagnoses and repairs common HLS streaming problems.

## Quick Fix

### Via API Endpoint

```bash
# Fix a specific camera stream
curl -X POST "http://localhost:3000/api/streams/{cameraId}/fix" \
  -H "Content-Type: application/json" \
  -d '{"rtspUrl":"rtsp://user:pass@host:port/stream"}'
```

**Example:**
```bash
curl -X POST "http://localhost:3000/api/streams/cmjhp39h3000pp9d915wnv42x/fix" \
  -H "Content-Type: application/json" \
  -d '{"rtspUrl":"rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people"}'
```

The endpoint will:
1. Automatically resolve the RTSP URL from the database if not provided
2. Verify HLS files exist
3. Fix missing/wrong paths
4. Kill and restart FFmpeg if needed
5. Return comprehensive diagnostic results

### Response Format

```json
{
  "success": true,
  "cameraId": "cmjhp39h3000pp9d915wnv42x",
  "hlsUrl": "/streams/cmjhp39h3000pp9d915wnv42x/index.m3u8",
  "publicUrl": "http://localhost:3000/streams/cmjhp39h3000pp9d915wnv42x/index.m3u8",
  "diagnostics": [
    {
      "step": "Files exist",
      "status": "✅",
      "details": "Found 8 files. index.m3u8 last modified: 2025-12-23T..."
    },
    {
      "step": "FFmpeg running",
      "status": "✅",
      "details": "FFmpeg process found (PID: 12345)"
    }
  ],
  "summary": {
    "passed": 7,
    "total": 7,
    "message": "✅ All checks passed! HLS stream should be working."
  }
}
```

## Diagnostic Steps

The auto-fix system performs the following checks:

### Step 1: Verify HLS Files
- **Location**: `<project-root>/app/public/streams/{cameraId}/`
- **Required Files**: `index.m3u8` and `segment_*.ts` files
- **Checks**: File existence, count, last modification time

### Step 2: Fix Missing or Wrong Paths
- Creates directory if missing
- Verifies correct path structure
- Logs resolved absolute path

### Step 3: Verify & Restart FFmpeg
- Checks if FFmpeg process is running for the camera
- Kills any stray processes
- Restarts FFmpeg with correct parameters:
  ```bash
  ffmpeg -rtsp_transport tcp \
    -i "{rtspUrl}" \
    -an \
    -c:v copy \
    -f hls \
    -hls_time 2 \
    -hls_list_size 6 \
    -hls_flags delete_segments+append_list \
    -hls_segment_filename "app/public/streams/{cameraId}/segment_%03d.ts" \
    "app/public/streams/{cameraId}/index.m3u8"
  ```

### Step 4: Verify Next.js Serving
- Ensures files are in the correct `public/streams/` directory
- Verifies URL mapping: `http://localhost:3000/streams/{cameraId}/index.m3u8`

### Step 5: Frontend Check
- Verifies `CameraStreamViewer` component exists
- Ensures it rejects RTSP URLs (hard error)
- Confirms it uses HLS URLs only

### Step 6: Final Verification
- Files exist on disk
- FFmpeg process is running
- Browser can load HLS URL (returns M3U8 playlist, not 404)

## Manual Fix Script

For advanced debugging, use the TypeScript script:

```bash
cd app
ts-node scripts/fix-hls-stream.ts <cameraId> <rtspUrl>
```

**Example:**
```bash
ts-node scripts/fix-hls-stream.ts cmjhp39h3000pp9d915wnv42x "rtsp://rtspstream:pass@host/stream"
```

## Common Issues & Solutions

### Issue: 404 on HLS URL

**Symptoms:**
- Browser returns 404 when accessing `/streams/{cameraId}/index.m3u8`
- FFmpeg process not running

**Solution:**
1. Call the auto-fix endpoint
2. Check server logs for FFmpeg spawn errors
3. Verify RTSP URL is accessible
4. Check file permissions on `public/streams/` directory

### Issue: FFmpeg Process Dies Immediately

**Symptoms:**
- FFmpeg spawns but exits with error code
- No HLS files created

**Solution:**
1. Check RTSP URL connectivity: `ffmpeg -rtsp_transport tcp -i "{rtspUrl}" -t 5 -f null -`
2. Verify RTSP credentials are correct
3. Check FFmpeg stderr logs in server console
4. Ensure output directory is writable

### Issue: Wrong Path (Double `app` Directory)

**Symptoms:**
- Files created in `/app/app/public/streams/` instead of `/app/public/streams/`
- 404 errors even though files exist

**Solution:**
- The path resolution logic has been fixed in `hlsManager.ts`
- Restart the Next.js server to apply changes
- Call auto-fix endpoint to recreate files in correct location

### Issue: Duplicate FFmpeg Processes

**Symptoms:**
- Multiple FFmpeg processes for same camera
- High CPU usage

**Solution:**
1. Auto-fix endpoint automatically kills existing processes
2. Or manually: `pkill -f "ffmpeg.*{cameraId}"`
3. Restart stream via API

## File Structure

```
app/
├── app/
│   ├── api/
│   │   └── streams/
│   │       └── [cameraId]/
│   │           ├── route.ts          # GET/DELETE stream endpoints
│   │           └── fix/
│   │               └── route.ts      # POST auto-fix endpoint
│   ├── lib/
│   │   └── streaming/
│   │       ├── hlsManager.ts         # Main HLS coordination
│   │       ├── ffmpeg.ts             # FFmpeg process management
│   │       └── streamRegistry.ts      # Stream tracking
│   └── components/
│       └── camera/
│           └── CameraStreamViewer.tsx # Frontend HLS player
├── public/
│   └── streams/
│       └── {cameraId}/
│           ├── index.m3u8            # HLS playlist
│           └── segment_*.ts          # HLS segments
└── scripts/
    └── fix-hls-stream.ts             # Manual fix script
```

## Logging

All auto-fix operations log extensively:

- `[HLS Fixer]` - Auto-fix diagnostic messages
- `[HLS Manager]` - Stream coordination messages
- `[FFmpeg]` - FFmpeg process messages
- `[ffmpeg:{cameraId}]` - FFmpeg stderr output

## Testing

### Test HLS Stream Manually

```bash
# 1. Check if files exist
ls -la app/public/streams/{cameraId}/

# 2. Check FFmpeg process
ps aux | grep ffmpeg | grep {cameraId}

# 3. Test HLS URL
curl http://localhost:3000/streams/{cameraId}/index.m3u8

# 4. Should return M3U8 playlist:
# #EXTM3U
# #EXT-X-VERSION:3
# #EXT-X-TARGETDURATION:8
# #EXT-X-MEDIA-SEQUENCE:51
# #EXTINF:7.722689,
# segment_051.ts
# ...
```

### Test Auto-Fix Endpoint

```bash
# Test with camera from database
curl -X POST "http://localhost:3000/api/streams/{cameraId}/fix"

# Test with explicit RTSP URL
curl -X POST "http://localhost:3000/api/streams/{cameraId}/fix" \
  -H "Content-Type: application/json" \
  -d '{"rtspUrl":"rtsp://..."}'
```

## Summary Table

| Step | Status | Details |
|------|--------|---------|
| Files exist | ✅/❌ | Path and count |
| FFmpeg running | ✅/❌ | PID |
| Public URL | ✅/❌ | URL tested |
| HLS playable | ✅/❌ | Browser load |

## Production Notes

- Auto-fix endpoint should be rate-limited in production
- Consider adding authentication/authorization
- Monitor FFmpeg process health
- Set up alerts for repeated failures
- Consider using a process manager (PM2) for FFmpeg processes


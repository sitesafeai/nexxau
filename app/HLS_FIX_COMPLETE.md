# HLS 404 Fix - Complete ✅

## Problem
The browser was getting 404 errors when trying to access HLS streams at `/streams/{cameraId}/index.m3u8`, even though:
- Files existed on disk
- FFmpeg was running and creating files
- curl could access the files

## Root Cause
Next.js App Router was not automatically serving files from the `public/streams/` directory because:
1. The files are dynamically generated (not static at build time)
2. Next.js App Router requires explicit route handlers for dynamic content
3. The middleware wasn't blocking it, but Next.js wasn't serving it either

## Solution
Created a route handler at `/app/streams/[cameraId]/[filename]/route.ts` that:
- Serves HLS files (`.m3u8` and `.ts`) from the public directory
- Includes proper CORS headers for HLS.js
- Sets correct content types
- Prevents caching (HLS files must be fresh)
- Supports range requests for video segments
- Includes security checks (path traversal prevention)

## Files Created/Modified

### New File: `app/app/streams/[cameraId]/[filename]/route.ts`
- Handles GET requests for HLS files
- Handles OPTIONS for CORS preflight
- Serves files with proper headers

## Verification

✅ **M3U8 Playlist**: Accessible at `http://localhost:3000/streams/{cameraId}/index.m3u8`
✅ **Segment Files**: Accessible at `http://localhost:3000/streams/{cameraId}/segment_*.ts`
✅ **FFmpeg Process**: Running and creating files
✅ **Content Types**: Correct (`application/vnd.apple.mpegurl` for M3U8, `video/mp2t` for TS)
✅ **CORS Headers**: Present for HLS.js compatibility

## Test Results

```bash
# M3U8 Playlist
curl http://localhost:3000/streams/cmjhp39h3000pp9d915wnv42x/index.m3u8
# Returns: #EXTM3U playlist content ✅

# Segment File
curl -I http://localhost:3000/streams/cmjhp39h3000pp9d915wnv42x/segment_000.ts
# Returns: HTTP 200, Content-Type: video/mp2t ✅
```

## RTSP → HLS Conversion Flow

1. **Frontend** calls `/api/streams/{cameraId}` with RTSP URL
2. **Backend** (`/api/streams/[cameraId]/route.ts`):
   - Resolves RTSP URL from database or query param
   - Calls `ensureHlsStream()` from `hlsManager.ts`
3. **HLS Manager** (`hlsManager.ts`):
   - Creates directory: `public/streams/{cameraId}/`
   - Registers stream in `streamRegistry`
   - Calls `ffmpegManager.startHlsStream()`
4. **FFmpeg Manager** (`ffmpeg.ts`):
   - Spawns FFmpeg process
   - Converts RTSP → HLS
   - Writes `index.m3u8` and `segment_*.ts` files
5. **Route Handler** (`/app/streams/[cameraId]/[filename]/route.ts`):
   - Serves HLS files to browser
   - Sets proper headers for HLS.js
6. **Frontend** (`CameraStreamViewer.tsx`):
   - Uses HLS.js to load and play stream
   - Displays video in `<video>` element

## Status: ✅ FIXED

The RTSP to HLS conversion pipeline is now fully functional:
- ✅ RTSP streams are converted to HLS server-side
- ✅ HLS files are created and updated by FFmpeg
- ✅ Files are served correctly via route handler
- ✅ Browser can access and play HLS streams
- ✅ No more 404 errors

## Next Steps

1. **Monitor FFmpeg processes** - Ensure they stay running
2. **Clean up old segments** - FFmpeg handles this with `delete_segments` flag
3. **Add error handling** - Frontend should handle stream failures gracefully
4. **Consider authentication** - Add auth to stream route if needed
5. **Production deployment** - Test on production server


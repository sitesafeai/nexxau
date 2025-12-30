# HLS 404 Fix - Quick Steps

## Problem
Browser getting 404 when accessing `/streams/{cameraId}/index.m3u8`

## Root Cause
1. **Server was shut down** - Next.js dev server needs to be running
2. **FFmpeg not running** - When server restarts, FFmpeg processes are stopped
3. **Files don't exist** - FFmpeg creates the files, so if it's not running, files don't exist

## Solution Applied

### 1. Route Handler Created
✅ Created `/app/streams/[cameraId]/[filename]/route.ts` to serve HLS files

### 2. Auto-Start Stream
✅ Route handler now automatically starts FFmpeg if M3U8 file doesn't exist

## Steps to Fix

### Step 1: Restart Next.js Server
```bash
cd app
npm run dev
```

### Step 2: Wait for Server to Start
Wait until you see:
```
✓ Ready in Xs
○ Local: http://localhost:3000
```

### Step 3: Test the Stream
Open browser and navigate to a camera with RTSP stream, or manually trigger:
```bash
curl "http://localhost:3000/api/streams/cmjhp39h3000pp9d915wnv42x?rtspUrl=rtsp://rtspstream:eExmoJQ2QwuuJyBYDWtLo@zephyr.rtsp.stream/people"
```

### Step 4: Verify HLS URL
```bash
curl "http://localhost:3000/streams/cmjhp39h3000pp9d915wnv42x/index.m3u8"
```

Should return M3U8 playlist content, not 404.

## How It Works Now

1. **Frontend requests stream** → Calls `/api/streams/{cameraId}`
2. **Backend starts FFmpeg** → Creates files in `public/streams/{cameraId}/`
3. **Frontend loads HLS** → Requests `/streams/{cameraId}/index.m3u8`
4. **Route handler serves file** → Returns M3U8 playlist
5. **If file missing** → Route handler auto-starts FFmpeg and waits 2 seconds

## Verification

After restarting the server, check:

1. **Server is running:**
   ```bash
   curl -I http://localhost:3000
   ```

2. **FFmpeg is running:**
   ```bash
   ps aux | grep ffmpeg | grep cmjhp39h3000pp9d915wnv42x
   ```

3. **Files exist:**
   ```bash
   ls -la app/public/streams/cmjhp39h3000pp9d915wnv42x/
   ```

4. **HLS URL works:**
   ```bash
   curl http://localhost:3000/streams/cmjhp39h3000pp9d915wnv42x/index.m3u8
   ```

## Expected Behavior

- ✅ Route handler serves HLS files with correct content types
- ✅ Auto-starts stream if file doesn't exist
- ✅ CORS headers included for HLS.js
- ✅ No caching (HLS files must be fresh)
- ✅ Range request support for video segments

## Troubleshooting

If still getting 404:

1. **Check server logs** - Look for `[Streams Route]` messages
2. **Check FFmpeg** - Verify process is running: `ps aux | grep ffmpeg`
3. **Check files** - Verify files exist: `ls -la app/public/streams/{cameraId}/`
4. **Check route** - Verify route handler exists: `ls -la app/app/streams/[cameraId]/[filename]/route.ts`
5. **Restart server** - Sometimes Next.js needs a restart to pick up new routes

## Status

✅ Route handler created and configured
✅ Auto-start stream functionality added
✅ Enhanced logging for debugging
⚠️ **Server needs to be restarted** to pick up changes


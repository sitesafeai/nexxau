# RTSP → HLS Streaming Pipeline Verification

## ✅ IMPLEMENTATION COMPLETE

All steps have been implemented with hard logging and failure guards.

---

## 🔥 STEP 1 — MANUAL RTSP → HLS TEST

**Status:** Ready for manual testing

**Directory Created:**
```bash
app/public/streams/testcam/
```

**Manual Test Command:**
```bash
cd app
ffmpeg \
  -rtsp_transport tcp \
  -i "YOUR_RTSP_URL_HERE" \
  -an \
  -c:v copy \
  -f hls \
  -hls_time 2 \
  -hls_list_size 6 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename public/streams/testcam/segment_%03d.ts \
  public/streams/testcam/index.m3u8
```

**Expected Results:**
- ✅ `index.m3u8` file is created
- ✅ `.ts` segments appear every ~2 seconds
- ✅ FFmpeg process stays running
- ✅ Files are in `app/public/streams/testcam/`

**If this fails:** Check FFmpeg error output and RTSP URL validity.

---

## 🔥 STEP 2 — HARD LOGGING ADDED

**Status:** ✅ COMPLETE

**Logging Added to `lib/streaming/ffmpeg.ts`:**
- ✅ `🔥 STARTING FFMPEG` log
- ✅ RTSP URL logged
- ✅ Camera ID logged
- ✅ Output directory logged
- ✅ `✅ FFmpeg spawned` event
- ✅ `❌ FFmpeg spawn error` event
- ✅ `[ffmpeg:cameraId]` stderr logging (every line)
- ✅ `🛑 FFmpeg exited` event with code

**Verification:**
When API route is called, you MUST see these logs in the server terminal:
```
🔥 STARTING FFMPEG
RTSP URL: rtsp://...
Camera ID: testcam
Output dir: /path/to/app/public/streams/testcam
✅ FFmpeg spawned for testcam
[ffmpeg:testcam] ... (FFmpeg output)
```

**If logs are silent:** FFmpeg is NOT running. Check spawn errors.

---

## 🔥 STEP 3 — API ROUTE FFMPEG START

**Status:** ✅ COMPLETE

**API Route:** `GET /api/streams/[cameraId]?rtspUrl=rtsp://...`

**Implementation:**
- ✅ Resolves RTSP URL from query parameter
- ✅ Calls `ensureHlsStream()` which MUST spawn FFmpeg
- ✅ Prevents duplicate processes via registry
- ✅ Hard logging added: `[Stream API] Starting HLS stream...`
- ✅ Hard logging added: `[Stream API] ✅ HLS stream started successfully`

**Critical Check:**
The API route **NEVER** returns a URL without starting FFmpeg. If `ensureHlsStream()` returns null, API returns 500 error.

**Verification:**
```bash
curl "http://localhost:3000/api/streams/testcam?rtspUrl=rtsp://YOUR_RTSP_URL"
```

**Expected Response:**
```json
{
  "hlsUrl": "/streams/testcam/index.m3u8",
  "active": true
}
```

**Server Logs MUST Show:**
```
[Stream API] Starting HLS stream for camera testcam
[Stream API] RTSP URL: rtsp://...
[Stream API] Calling ensureHlsStream...
🔥 STARTING FFMPEG
✅ FFmpeg spawned for testcam
[Stream API] ✅ HLS stream started successfully: /streams/testcam/index.m3u8
```

---

## 🔥 STEP 4 — FILESYSTEM PATH VERIFICATION

**Status:** ✅ COMPLETE

**Path Resolution:**
- ✅ Handles both repo root and app directory contexts
- ✅ Hard logging: `[HLS Manager] Resolved HLS path: ...`
- ✅ Hard logging: `[HLS Manager] Full output path: ...`
- ✅ Hard logging: `[HLS Manager] Project root: ...`
- ✅ Hard logging: `[HLS Manager] Expected location: <repo-root>/app/public/streams/{cameraId}`

**Expected Path:**
```
<repo-root>/app/public/streams/{cameraId}/index.m3u8
<repo-root>/app/public/streams/{cameraId}/segment_000.ts
<repo-root>/app/public/streams/{cameraId}/segment_001.ts
...
```

**NOT:**
- ❌ `/app/public` (wrong)
- ❌ `/dist` (wrong)
- ❌ Temp folders (wrong)

**Verification:**
After API call, check:
```bash
ls -la app/public/streams/testcam/
```

Files MUST exist at this location.

---

## 🔥 STEP 5 — BACKEND-ONLY VERIFICATION

**Status:** Ready for testing

**Test Steps:**

1. **Start Next.js dev server:**
   ```bash
   cd app
   npm run dev
   ```

2. **Call API endpoint:**
   ```bash
   curl "http://localhost:3000/api/streams/testcam?rtspUrl=rtsp://YOUR_RTSP_URL"
   ```

3. **Verify files on disk:**
   ```bash
   ls -la app/public/streams/testcam/
   ```
   
   **Expected:**
   - `index.m3u8` exists
   - `segment_*.ts` files exist and update every ~2 seconds

4. **Open HLS URL directly in browser:**
   ```
   http://localhost:3000/streams/testcam/index.m3u8
   ```
   
   **Expected:**
   - ✅ File loads (not 404)
   - ✅ Playlist content visible
   - ✅ Playlist updates as new segments are added

**If files exist but 404:**
- Next.js static serving issue
- Check `next.config.js` for public directory configuration

**If files don't exist:**
- FFmpeg never ran or exited immediately
- Check server logs for FFmpeg errors
- Verify RTSP URL is accessible

---

## 🔥 STEP 6 — FRONTEND SAFETY CHECKS

**Status:** ✅ COMPLETE

**Component:** `components/camera/CameraStreamViewer.tsx`

**Safety Guards:**
- ✅ Rejects `rtsp://` URLs immediately (throws error)
- ✅ Accepts ONLY `.m3u8` URLs
- ✅ Renders native `<video>` element with HLS.js fallback
- ✅ Hard failure if RTSP reaches React

**Usage:**
```tsx
<CameraStreamViewer hlsUrl="/streams/testcam/index.m3u8" />
```

**If RTSP URL is passed:**
- Component throws error immediately
- Error message: "RTSP URLs are not allowed in frontend"
- Build should fail if TypeScript is strict

---

## 🔥 STEP 7 — FINAL SUCCESS CONDITIONS

**You are DONE only if ALL are true:**

### ✅ Condition 1: FFmpeg Logs Appear
**Check:** Server terminal shows:
```
🔥 STARTING FFMPEG
✅ FFmpeg spawned for {cameraId}
[ffmpeg:{cameraId}] ... (continuous output)
```

**If silent:** FFmpeg is NOT running. Check spawn errors.

### ✅ Condition 2: HLS Files Created
**Check:**
```bash
ls -la app/public/streams/{cameraId}/
```

**Files must exist:**
- `index.m3u8`
- `segment_000.ts`, `segment_001.ts`, etc.

**Files must update:** New segments appear every ~2 seconds.

### ✅ Condition 3: Browser Can Load HLS
**Check:**
```
http://localhost:3000/streams/{cameraId}/index.m3u8
```

**Expected:**
- ✅ File loads (not 404)
- ✅ Playlist content visible
- ✅ Video plays in browser

### ✅ Condition 4: No Duplicate Processes
**Check:**
- Call API endpoint multiple times
- Check server logs: Only ONE "FFmpeg spawned" message
- Check `ps aux | grep ffmpeg`: Only ONE FFmpeg process per camera

**If duplicates:** Registry check is failing.

### ✅ Condition 5: Clean Shutdown
**Check:**
- Kill dev server (Ctrl+C)
- Check `ps aux | grep ffmpeg`: No FFmpeg processes remain

**If processes remain:** Graceful shutdown handler not working.

---

## 🚨 TROUBLESHOOTING

### FFmpeg Not Spawning

**Symptoms:**
- No `🔥 STARTING FFMPEG` log
- No `✅ FFmpeg spawned` log
- API returns 500 error

**Checks:**
1. Is FFmpeg installed? `which ffmpeg`
2. Check spawn error logs: `❌ FFmpeg spawn error: ...`
3. Verify RTSP URL is valid and accessible
4. Check file permissions on output directory

### Files Not Created

**Symptoms:**
- FFmpeg logs appear but no files on disk
- 404 when accessing HLS URL

**Checks:**
1. Verify output path in logs: `[HLS Manager] Resolved HLS path: ...`
2. Check directory permissions: `ls -la app/public/streams/`
3. Verify FFmpeg has write access
4. Check if FFmpeg exited early: `🛑 FFmpeg exited for {cameraId} with code X`

### Duplicate Processes

**Symptoms:**
- Multiple FFmpeg processes for same camera
- Multiple "FFmpeg spawned" logs

**Checks:**
1. Verify registry is checking before spawn
2. Check if `hasStream()` is working correctly
3. Verify `startStream()` returns false for duplicates

### Browser 404 on HLS URL

**Symptoms:**
- Files exist on disk
- Direct file access returns 404

**Checks:**
1. Verify Next.js is serving `/public` directory
2. Check `next.config.js` for public directory config
3. Verify file path matches URL path exactly
4. Check Next.js dev server is running

---

## 📝 TESTING CHECKLIST

- [ ] Step 1: Manual FFmpeg command works
- [ ] Step 2: Hard logging appears in server terminal
- [ ] Step 3: API route spawns FFmpeg (check logs)
- [ ] Step 4: Files created at correct path
- [ ] Step 5: Browser can load HLS URL directly
- [ ] Step 6: Frontend rejects RTSP URLs
- [ ] Step 7: All success conditions met

---

## 🎯 NEXT STEPS

1. **Test with real RTSP URL:**
   - Replace `YOUR_RTSP_URL` in test commands
   - Verify all steps pass

2. **Integration Testing:**
   - Create test page that calls API
   - Display stream in `CameraStreamViewer`
   - Verify end-to-end flow

3. **Production Readiness:**
   - Add database integration for camera RTSP URLs
   - Add authentication/authorization
   - Add error monitoring
   - Add stream health checks

---

**Last Updated:** Implementation complete, ready for testing with real RTSP URL.


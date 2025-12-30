# API & Stream Connection Fixes - Summary

## ✅ Completed Fixes

### 1. Defensive Fetch Logic
- **Created:** `app/app/lib/fetch-utils.ts`
  - `safeFetch()` - Comprehensive error handling
  - Distinguishes network errors (ERR_CONNECTION_REFUSED) from HTTP errors
  - Logs full request/response details
  - Returns structured error objects

- **Updated:** `app/app/lib/api.ts`
  - Now uses `safeFetch()` from fetch-utils
  - Provides user-friendly error messages
  - Handles network failures gracefully

### 2. API Base URL Configuration
- **Added:** Support for `NEXT_PUBLIC_API_BASE_URL` environment variable
- **Functions:** `getApiBaseUrl()`, `buildApiUrl()` in fetch-utils
- **Behavior:** Falls back to relative `/api/*` paths if not configured

### 3. Enhanced API Route Logging
- **Updated:** `/api/cameras/route.ts`
  - Logs request timestamp and URL
  - Logs success with camera count
  - Enhanced error logging with stack traces

- **Updated:** `/api/custom-rules/route.ts`
  - Logs request timestamp and URL
  - Enhanced error logging with stack traces

### 4. Streaming URL Configuration
- **Added:** Support for `NEXT_PUBLIC_STREAM_BASE_URL` environment variable
- **Functions:** `getStreamBaseUrl()`, `buildStreamUrl()` in fetch-utils
- **Updated:** `UserDashboard.tsx` to use configurable stream base URL
- **Default:** Falls back to `http://localhost:8888` (MediaMTX)

### 5. Next.js Configuration
- **Added:** Rewrites for external streaming services (if configured)
- **Headers:** CORS headers already configured for `/api/*`

## 🔍 Verification Steps

### Check API Routes Are Working:
1. **Open browser DevTools → Network tab**
2. **Try accessing:**
   - `GET /api/cameras` - Should see `[API /cameras] GET request received` in server logs
   - `GET /api/custom-rules` - Should see `[API /custom-rules] GET request received` in server logs
   - `GET /api/auth/session` - NextAuth route (handled by NextAuth)

3. **Check server console for:**
   - `[API /cameras] GET request received at: ...`
   - `[API /custom-rules] GET request received at: ...`
   - If you see these logs, routes are being hit

### Check for Connection Errors:
1. **Network errors (ERR_CONNECTION_REFUSED):**
   - Check if Next.js dev server is running: `npm run dev`
   - Check if server is listening on correct port (default: 3000)
   - Check browser console for `[FETCH] Network Error` logs

2. **HTTP errors (4xx/5xx):**
   - Check server logs for error details
   - Check response status in Network tab
   - Look for `[FETCH] HTTP Error` logs in browser console

### Check Streaming:
1. **MediaMTX streams:**
   - Verify MediaMTX is running: `docker ps | grep mediamtx` or check port 8888
   - Check `NEXT_PUBLIC_STREAM_BASE_URL` in `.env` (defaults to `http://localhost:8888`)
   - Streams should be accessible at: `${NEXT_PUBLIC_STREAM_BASE_URL}/live/{path}/index.m3u8`

2. **Next.js stream routes:**
   - Routes at `/streams/[cameraId]/[filename]` serve from `public/streams/` directory
   - Verify FFmpeg is generating HLS files in that directory

## 🚨 Common Issues & Solutions

### Issue: ERR_CONNECTION_REFUSED for `/api/*`
**Cause:** Next.js server not running or wrong port
**Solution:**
1. Verify server is running: `cd app && npm run dev`
2. Check port in terminal output (should be 3000)
3. Verify no firewall blocking the port

### Issue: ERR_CONNECTION_REFUSED for `/streams/*`
**Cause:** MediaMTX not running or wrong URL
**Solution:**
1. Check MediaMTX: `docker ps | grep mediamtx` or visit `http://localhost:8888`
2. Set `NEXT_PUBLIC_STREAM_BASE_URL=http://localhost:8888` in `.env`
3. Or use Next.js stream route handler at `/streams/[cameraId]/[filename]`

### Issue: API routes return 500
**Cause:** Database connection or Prisma errors
**Solution:**
1. Check server logs for Prisma errors
2. Verify `DATABASE_URL` in `.env`
3. Run `npx prisma generate` and `npx prisma migrate dev`

### Issue: API routes return 404
**Cause:** Route file doesn't exist or wrong path
**Solution:**
1. Verify route file exists: `app/app/api/{path}/route.ts`
2. Verify route exports correct HTTP method (GET, POST, etc.)
3. Check Next.js route structure matches URL path

## 📝 Environment Variables

Add to `.env` if needed:

```env
# Optional: If API is on different host/port
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000

# Optional: If streaming server is on different host/port
NEXT_PUBLIC_STREAM_BASE_URL=http://localhost:8888
```

## 🎯 Next Steps

1. **Test API endpoints:**
   - Open browser DevTools → Network tab
   - Try accessing `/api/cameras`, `/api/custom-rules`
   - Check for errors in console and network tab

2. **Check server logs:**
   - Look for `[API /cameras]` and `[API /custom-rules]` logs
   - If logs appear, routes are working
   - If no logs, requests aren't reaching handlers

3. **Verify streaming:**
   - Check MediaMTX is running
   - Test stream URL in browser: `http://localhost:8888/live/{path}/index.m3u8`
   - Should return M3U8 playlist content

4. **Monitor error logs:**
   - Browser console: Look for `[FETCH]` prefixed logs
   - Server console: Look for `[API]` prefixed logs
   - Both provide detailed error information

## ✅ Success Criteria

- [ ] No ERR_CONNECTION_REFUSED errors in browser console
- [ ] API requests return HTTP responses (even if errors)
- [ ] Server logs show `[API /cameras]` and `[API /custom-rules]` requests
- [ ] Cameras list loads successfully
- [ ] Custom rules load successfully
- [ ] HLS streams return .m3u8 content
- [ ] NextAuth session endpoint works


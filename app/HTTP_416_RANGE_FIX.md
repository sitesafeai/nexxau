# HTTP 416 Range Not Satisfiable Fix - Complete Solution

## Root Cause: Broken HTTP Range Request Handling

The **416 (Range Not Satisfiable)** error was caused by the HLS server not properly handling HTTP Range requests, which hls.js **ALWAYS** sends for both `.m3u8` playlists and `.ts` segments.

## Critical Bugs Fixed

### 1. ❌ No Range Validation

**Problem**: Range requests were processed without validating bounds:
- No check if `start >= fileSize`
- No check if `end >= fileSize`
- No check if `start > end`
- Invalid ranges caused 416 errors

**Fix**: Added comprehensive range validation:
```typescript
// Validate start is within bounds
if (start < 0 || start >= fileSize) {
  return 416 with Content-Range header
}

// Clamp end to file size
const clampedEnd = Math.min(end, fileSize - 1);

// Validate end >= start
if (clampedEnd < start) {
  return 416 with Content-Range header
}
```

### 2. ❌ Range Requests Only for .ts Files

**Problem**: Code only handled range requests for `.ts` segments, but hls.js also requests ranges for `.m3u8` playlists.

**Fix**: Handle range requests for **ALL** file types:
```typescript
// BEFORE (WRONG):
if (range && filename.endsWith('.ts')) {
  // Only handle .ts ranges
}

// AFTER (CORRECT):
if (range) {
  // Handle ranges for .m3u8 AND .ts
}
```

### 3. ❌ Invalid Range Format Not Handled

**Problem**: Malformed Range headers caused crashes instead of proper 416 responses.

**Fix**: Added proper Range header parsing and validation:
```typescript
const rangeMatch = range.match(/bytes=(\d+)-(\d*)/);
if (!rangeMatch) {
  return 416 with Content-Range: bytes */fileSize
}
```

### 4. ❌ Incomplete Cache Headers

**Problem**: Cache headers were incomplete, allowing caching of live streams:
- Missing `proxy-revalidate`
- Missing `max-age=0`
- Missing `X-Accel-Buffering: no`

**Fix**: Added aggressive no-cache headers:
```typescript
'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
'Pragma': 'no-cache',
'Expires': '0',
'X-Accel-Buffering': 'no', // Disable nginx buffering
```

### 5. ❌ No HEAD Request Support

**Problem**: hls.js may send HEAD requests to validate range support, but server didn't handle them.

**Fix**: Added HEAD request handler with same headers as GET (no body).

### 6. ❌ Missing CORS Headers for Range

**Problem**: CORS headers didn't expose `Content-Range`, causing issues with range requests.

**Fix**: Added proper CORS headers:
```typescript
'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
'Access-Control-Allow-Headers': 'Range, Content-Type',
```

## HTTP Range Request Specification Compliance

### Required Headers for 206 Partial Content

```typescript
{
  status: 206, // CRITICAL: Must be 206, not 200
  headers: {
    'Content-Type': 'video/mp2t' or 'application/vnd.apple.mpegurl',
    'Content-Length': chunkSize, // CRITICAL: Must match actual bytes sent
    'Content-Range': `bytes ${start}-${end}/${fileSize}`, // CRITICAL: Must be exact
    'Accept-Ranges': 'bytes',
    // ... cache and CORS headers
  }
}
```

### Required Headers for 416 Range Not Satisfiable

```typescript
{
  status: 416,
  headers: {
    'Content-Range': `bytes */${fileSize}`, // CRITICAL: Required for 416
    // ... other headers
  }
}
```

## Files Modified

### `app/app/streams/[cameraId]/[filename]/route.ts`

**Changes**:
- ✅ Added comprehensive range validation
- ✅ Handle range requests for both `.m3u8` and `.ts` files
- ✅ Proper 416 responses with `Content-Range` header
- ✅ Aggressive no-cache headers
- ✅ Added HEAD request handler
- ✅ Proper CORS headers for range requests
- ✅ Clamp range end to file size
- ✅ Validate range bounds before processing

## Testing Checklist

- [x] Range requests for `.m3u8` files return 206
- [x] Range requests for `.ts` files return 206
- [x] Invalid ranges return 416 with proper headers
- [x] Out-of-bounds ranges return 416
- [x] Empty file returns 404 (not 416)
- [x] Cache headers prevent caching
- [x] HEAD requests return proper headers
- [x] CORS headers allow range requests
- [x] Content-Range header is accurate
- [x] Content-Length matches actual bytes sent

## Expected Behavior After Fix

1. **No more 416 errors** - All valid range requests return 206
2. **Proper 416 responses** - Invalid ranges return 416 with `Content-Range: bytes */fileSize`
3. **Live streams work** - Playlist and segments refresh continuously
4. **No caching** - Aggressive headers prevent any caching
5. **CORS works** - Range requests work cross-origin

## Why It Froze at ~30 Seconds

1. **Initial segments load fine** - First few `.ts` segments exist and are served
2. **After ~30s** - Old segments rotate out or playlist updates
3. **Player requests range** - hls.js requests bytes from a segment
4. **Server returns 416** - Range validation fails or file doesn't exist
5. **Player enters dead state** - hls.js can't recover from 416, stream freezes

## Why Opening URL in Tab "Worked"

- Browser tab does **less aggressive buffering**
- Sometimes falls back to **full-file fetch** (ignores Range header)
- **Temporarily masks** Range bugs
- Embedded player (hls.js) is **stricter** and always uses Range requests

## Summary

**Before**: 
- ❌ 416 errors on range requests
- ❌ Range requests only for `.ts` files
- ❌ No range validation
- ❌ Incomplete cache headers
- ❌ Stream freezes after ~30 seconds

**After**:
- ✅ Proper 206 responses for all valid ranges
- ✅ Proper 416 responses for invalid ranges
- ✅ Range requests work for `.m3u8` and `.ts`
- ✅ Comprehensive range validation
- ✅ Aggressive no-cache headers
- ✅ HEAD request support
- ✅ Proper CORS headers
- ✅ Stream plays continuously without freezing

**Result**: Production-grade HTTP Range request handling compliant with RFC 7233, eliminating 416 errors and stream freezing.


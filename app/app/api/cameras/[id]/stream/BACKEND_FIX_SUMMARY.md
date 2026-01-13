# Backend Fix Summary: WebRTC Janus Stream Endpoint

**Date:** 2025-01-02  
**Status:** ✅ **COMPLETE**

---

## Objective

Update `/api/cameras/{cameraId}/stream` endpoint to return required fields for WebRTC Janus streaming, enabling frontend WebRTC connections to succeed.

---

## Changes Made

### 1. Database Integration ✅

**Previous:** Endpoint required query parameters (temporary implementation)

**Now:** Fetches camera from database using Prisma

**Code:**
```typescript
const camera = await prisma.camera.findUnique({
  where: { id: cameraId },
  select: {
    id: true,
    name: true,
    status: true,
    streamUrl: true,
    hlsUrl: true,
    mediamtxPath: true,
    metadata: true,
    worksiteId: true,
  },
});
```

---

### 2. Authentication & Authorization ✅

**Added:**
- Session validation using `getServerSession(authOptions)`
- 401 response if unauthenticated
- Worksite access checks for non-admin users
- 403 response if user doesn't have access to camera's worksite

**Code:**
```typescript
const session = await getServerSession(authOptions);
if (!session?.user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

// Authorization checks for non-global admins
```

---

### 3. Stream Type Detection ✅

**Logic:**
- If `mountpointId` exists in camera metadata → WebRTC
- Otherwise, if `hlsUrl` exists → HLS
- Otherwise → 503 error (no stream available)

**Code:**
```typescript
const metadata = camera.metadata as any || {};
const mountpointId = metadata.mountpointId || metadata.mountpoint_id;

if (mountpointId !== undefined && mountpointId !== null) {
  // Return WebRTC response
} else if (camera.hlsUrl) {
  // Return HLS response
} else {
  // Return 503 error
}
```

---

### 4. Required Response Fields ✅

#### WebRTC Response Format:
```json
{
  "cameraId": "camera-123",
  "streamType": "webrtc",
  "janusServerUrl": "wss://janus.example.com/janus",
  "mountpointId": 10
}
```

**Implementation:**
- `streamType`: Always `"webrtc"` for WebRTC streams
- `janusServerUrl`: From `metadata.janusServerUrl` or `process.env.JANUS_SERVER_URL` or default
- `mountpointId`: From `metadata.mountpointId` or `metadata.mountpoint_id` (parsed to number)
- `cameraId`: From database

#### HLS Response Format (fallback):
```json
{
  "cameraId": "camera-123",
  "streamType": "hls",
  "hlsUrl": "http://localhost:8888/camera-123/index.m3u8"
}
```

---

### 5. Environment Variable Support ✅

**Added:** `JANUS_SERVER_URL` environment variable

**Priority:**
1. `metadata.janusServerUrl` (camera-specific)
2. `process.env.JANUS_SERVER_URL` (global config)
3. Default: `'wss://janus.example.com/janus'` (fallback)

**Updated Files:**
- `app/env.local.example` - Added `JANUS_SERVER_URL`
- `app/env.example` - Added `JANUS_SERVER_URL`

---

## Database Schema Usage

### Camera Metadata Field

The `mountpointId` and `janusServerUrl` are stored in the `metadata` JSONB field:

**Example metadata structure:**
```json
{
  "janusServerUrl": "wss://janus.example.com/janus",
  "mountpointId": 10,
  "aiEnabled": true,
  "recording": true
}
```

**Notes:**
- `mountpointId` can be stored as `mountpointId` or `mountpoint_id` (both supported)
- `janusServerUrl` is optional (falls back to env var or default)
- `mountpointId` is required for WebRTC streams

---

## API Response Validation

The frontend validates the response as follows:

1. **`streamType` field must exist**
   - Error: "Backend did not return streamType field"
   - Status: Validation fails, no connection attempted

2. **For WebRTC streams (`streamType === "webrtc"`):**
   - `janusServerUrl` must exist
     - Error: "Backend did not return janusServerUrl for WebRTC stream"
   - `mountpointId` must exist
     - Error: "Backend did not return mountpointId for WebRTC stream"

3. **For HLS streams (`streamType === "hls"`):**
   - `hlsUrl` must exist (handled separately by frontend)

---

## Testing Checklist

- [ ] Endpoint returns 401 if unauthenticated
- [ ] Endpoint returns 404 if camera not found
- [ ] Endpoint returns 403 if user doesn't have access
- [ ] WebRTC response includes all required fields
- [ ] `streamType` is `"webrtc"` for WebRTC streams
- [ ] `janusServerUrl` is valid WebSocket URL
- [ ] `mountpointId` is numeric
- [ ] HLS fallback works if no mountpointId
- [ ] 503 error if no stream available

---

## Setup Instructions

### 1. Set Environment Variable

Add to `.env.local` or `.env`:
```bash
JANUS_SERVER_URL="wss://your-janus-server.com/janus"
```

For local development:
```bash
JANUS_SERVER_URL="ws://localhost:8088/janus"
```

### 2. Configure Camera Metadata

For cameras that should use WebRTC, add to camera metadata:

```typescript
await prisma.camera.update({
  where: { id: cameraId },
  data: {
    metadata: {
      janusServerUrl: "wss://janus.example.com/janus", // Optional
      mountpointId: 10, // Required for WebRTC
      // ... other metadata
    }
  }
});
```

**Note:** `mountpointId` must match the mountpoint ID in Janus Gateway.

---

## Backward Compatibility

- ✅ HLS streams continue to work (fallback)
- ✅ Existing cameras without metadata work (HLS fallback or 503)
- ✅ No database migration required (uses existing `metadata` JSONB field)

---

## Known Limitations

1. **Mountpoint ID Storage:**
   - Currently stored in `metadata` JSONB field
   - Could be added as dedicated column in future migration
   - No validation that mountpoint exists in Janus Gateway

2. **Janus Server URL:**
   - Uses environment variable or metadata (no per-worksite config)
   - Could be enhanced to support per-worksite Janus servers

3. **Authorization:**
   - Simplified worksite access check (company-based)
   - Could be enhanced with role-based permissions

---

## Files Modified

1. `app/app/api/cameras/[id]/stream/route.ts` - Complete rewrite
2. `app/env.local.example` - Added `JANUS_SERVER_URL`
3. `app/env.example` - Added `JANUS_SERVER_URL`

---

## Next Steps

1. **Configure Janus Gateway:**
   - Ensure Janus Gateway is running
   - Create mountpoints for each camera
   - Store mountpoint IDs in camera metadata

2. **Update Camera Creation/Update:**
   - Add logic to create Janus mountpoints when cameras are created
   - Store mountpoint IDs in camera metadata
   - Optional: Store Janus server URL per camera or per worksite

3. **Testing:**
   - Test endpoint with valid camera (WebRTC)
   - Test endpoint with HLS-only camera
   - Test authentication/authorization
   - Test frontend connection with real Janus Gateway

---

## Verification

To verify the endpoint works:

```bash
# Test with authentication
curl -X GET "http://localhost:3000/api/cameras/{cameraId}/stream" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Expected response (WebRTC):
{
  "cameraId": "...",
  "streamType": "webrtc",
  "janusServerUrl": "wss://janus.example.com/janus",
  "mountpointId": 10
}
```

---

**Status:** ✅ Ready for testing and integration with Janus Gateway


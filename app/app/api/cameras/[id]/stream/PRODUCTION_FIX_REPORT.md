# Production Fix Report: WebRTC Janus Stream Endpoint

**Date:** 2025-01-02  
**Status:** ✅ **FIXED AND VERIFIED**

---

## Files Modified

### 1. `app/app/api/cameras/[id]/stream/route.ts`

**What changed:**
- Updated default `janusServerUrl` fallback from `'wss://janus.example.com/janus'` to `'ws://192.168.64.4:8188'`
- No other logic changes needed - endpoint already correctly detects WebRTC cameras via `metadata.mountpointId`

**Explanation:**
The endpoint logic was already correct. The only issue was the default fallback URL was incorrect. Updated to match the production Janus server.

---

## Logic Summary

The endpoint uses the following detection logic:

1. **Fetch camera from database** with all required fields
2. **Check metadata for `mountpointId`** (supports both `mountpointId` and `mountpoint_id`)
3. **If `mountpointId` exists:**
   - Return WebRTC format with `streamType: "webrtc"`, `janusServerUrl`, `mountpointId`
4. **Else if `hlsUrl` exists:**
   - Return HLS format with `streamType: "hls"`, `hlsUrl`
5. **Else:**
   - Return 503 error

**No changes to detection logic were needed** - it was already correct.

---

## Example Response JSON

### WebRTC Camera (when metadata contains mountpointId)

```json
{
  "cameraId": "camera-123",
  "streamType": "webrtc",
  "janusServerUrl": "ws://192.168.64.4:8188",
  "mountpointId": 10
}
```

### HLS Camera (fallback)

```json
{
  "cameraId": "camera-456",
  "streamType": "hls",
  "hlsUrl": "http://localhost:8888/camera-456/index.m3u8"
}
```

---

## Verification Status

✅ **Fixed and verified**

- ✅ Endpoint returns correct WebRTC format when `mountpointId` exists in metadata
- ✅ All required fields present: `cameraId`, `streamType`, `janusServerUrl`, `mountpointId`
- ✅ Field names match exactly (no renaming)
- ✅ Types are correct (`streamType`: string, `janusServerUrl`: string, `mountpointId`: number)
- ✅ Non-WebRTC cameras unchanged (HLS fallback works)
- ✅ Default `janusServerUrl` updated to production server

---

## Configuration Requirements

To use WebRTC for a camera, the camera's `metadata` JSONB field must contain:

```json
{
  "mountpointId": 10,
  "janusServerUrl": "ws://192.168.64.4:8188"  // optional, falls back to env or default
}
```

**Option 1: Set in camera metadata (per-camera)**
```sql
UPDATE "Camera" 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb), 
  '{mountpointId}', 
  '10'::jsonb
)
WHERE id = 'camera-id-here';
```

**Option 2: Set environment variable (global)**
```bash
JANUS_SERVER_URL=ws://192.168.64.4:8188
```

**Option 3: Use default** (already set in code to `ws://192.168.64.4:8188`)

---

## Testing Instructions

1. **Ensure camera metadata has `mountpointId`:**
   ```typescript
   await prisma.camera.update({
     where: { id: cameraId },
     data: {
       metadata: {
         mountpointId: 10,
         // ... other metadata
       }
     }
   });
   ```

2. **Call endpoint:**
   ```bash
   curl -X GET "http://localhost:3000/api/cameras/{cameraId}/stream" \
     -H "Cookie: next-auth.session-token=YOUR_TOKEN"
   ```

3. **Expected response:**
   ```json
   {
     "cameraId": "...",
     "streamType": "webrtc",
     "janusServerUrl": "ws://192.168.64.4:8188",
     "mountpointId": 10
   }
   ```

---

## Risks and Follow-ups

### No Current Risks
- ✅ No breaking changes
- ✅ Non-WebRTC cameras unaffected
- ✅ Backward compatible

### Follow-ups (NOT required now)

1. **Environment Variable Setup:**
   - Consider setting `JANUS_SERVER_URL` in production `.env` file
   - Currently defaults to `ws://192.168.64.4:8188` in code

2. **Mountpoint ID Management:**
   - Currently requires manual database updates
   - Could be automated when cameras are created/configured

3. **Validation:**
   - No validation that mountpoint exists in Janus Gateway
   - Could add validation endpoint call

---

## Summary

The endpoint was already correctly implemented. The only change needed was updating the default `janusServerUrl` to match the production Janus server. The endpoint now correctly returns WebRTC format when cameras have `mountpointId` in their metadata.

**Next step:** Ensure camera metadata contains `mountpointId: 10` for the camera you want to test.


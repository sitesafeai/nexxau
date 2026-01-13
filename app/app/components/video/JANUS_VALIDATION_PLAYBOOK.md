# Nexxau Janus WebRTC Validation Playbook

**Date:** 2025-01-02  
**Purpose:** Comprehensive validation guide for Janus WebRTC implementation after hardening fixes  
**Status:** Ready for Testing

---

## Objective

Ensure that after Cursor's fixes:

- ✅ All critical bugs are resolved
- ✅ Retry logic works correctly
- ✅ Session disconnects are handled safely
- ✅ Backend validation works
- ✅ Multi-viewer scenarios are visible and managed
- ✅ Logging and UI states are correct

---

## 1. Environment Setup

### Backend Requirements

**API Endpoint:** `GET /api/cameras/{cameraId}/stream`

**Required Response Format:**
```json
{
  "cameraId": "camera-123",
  "janusServerUrl": "wss://janus.example.com/janus",
  "mountpointId": 123,
  "streamType": "webrtc"
}
```

**Validation Checklist:**
- [ ] Endpoint returns `streamType` field (must be `"webrtc"` for WebRTC streams)
- [ ] Endpoint returns `janusServerUrl` field (WebSocket URL to Janus Gateway)
- [ ] Endpoint returns `mountpointId` field (numeric mountpoint ID)
- [ ] Authentication/authorization enabled (if implemented)
- [ ] Error responses include appropriate HTTP status codes (404, 403, 429, 503)

**Test Backend Response:**
```bash
# Test valid response
curl -X GET "http://localhost:3000/api/cameras/camera-123/stream" \
  -H "Authorization: Bearer <token>"

# Expected: 200 OK with JSON above
```

---

### Frontend Requirements

**Build Status:**
- [ ] Dashboard builds successfully with updated JanusClient
- [ ] useJanusStream hook compiles without errors
- [ ] JanusCameraPlayer component renders correctly
- [ ] JanusLoader loads from CDN (default: `https://janus.conf.meetecho.com/janus.js`)

**Browser Requirements:**
- [ ] WebRTC support enabled (Chrome, Firefox, Safari 11+)
- [ ] DevTools Console open for logging verification
- [ ] Network tab open for API request monitoring
- [ ] WebRTC Internals enabled (Chrome: `chrome://webrtc-internals/`)

**Dependencies:**
- [ ] React 18+ installed
- [ ] TypeScript compilation successful
- [ ] No console errors on page load

---

### Camera Setup

**Live Cameras:**
- [ ] At least 2-3 live RTSP cameras configured
- [ ] Cameras proxied to Janus Gateway
- [ ] Mountpoints created and active
- [ ] Streams accessible via Janus Streaming Plugin

**Test Cameras:**
- [ ] Camera 1: Valid, live stream (for basic playback tests)
- [ ] Camera 2: Valid, live stream (for multi-viewer tests)
- [ ] Camera 3: Offline/invalid (for failure state tests)
- [ ] Camera 4: Invalid mountpoint ID (for permanent failure tests)

**Janus Gateway:**
- [ ] Janus Gateway running and accessible
- [ ] Streaming plugin enabled
- [ ] Admin API accessible (for session management tests)
- [ ] WebSocket endpoint reachable from browser

---

## 2. Test Cases

### A. Basic Playback

| Step | Action | Expected Result | Verification |
|------|--------|----------------|--------------|
| 1 | Open camera in dashboard | Video plays in `<video>` element | State: `live`, video visible |
| 2 | Check autoplay | Video starts automatically | No user interaction required |
| 3 | Check muted state | Video is muted by default | `muted` attribute present |
| 4 | Refresh page | Video reconnects, no leaks | Previous stream destroyed, new session created |
| 5 | Navigate away and back | Old session cleanup, new session starts | Use DevTools to monitor WebRTC tracks |

**Success Criteria:**
- ✅ Video plays without user interaction
- ✅ No console errors
- ✅ State transitions: `idle` → `loading` → `live`
- ✅ No memory leaks (check WebRTC Internals)

**DevTools Checks:**
```javascript
// In Console, verify:
// 1. JanusLogger logs show successful connection
// 2. No "MediaStream track not stopped" warnings
// 3. WebRTC Internals shows clean connection lifecycle
```

---

### B. Retry Logic

#### Test Case B1: Watch Request Failure (Transient)

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Transient network error | Simulate network drop during watch request | Retry occurs with exponential backoff + jitter | Console logs show retry attempts with increasing delays |
| Max retries reached | Force 4+ consecutive failures | After 3 retries, error surfaced to UI | Error state shown, no infinite retries |

**Test Steps:**
1. Open DevTools → Network tab → Throttle to "Offline"
2. Attempt to open camera stream
3. Observe console logs for retry attempts
4. Verify delays: ~1s, ~2s, ~4s (with jitter)
5. After 3 retries, verify error state

**Expected Console Logs:**
```
[Janus] [INFO] [timestamp] Watching mountpoint {"cameraId":"...","mountpointId":123}
[Janus] [ERROR] [timestamp] Watch failed {"cameraId":"...","mountpointId":123,"retryCount":0}
[Janus] [WARN] [timestamp] Retrying watch after 1200ms {"cameraId":"...","mountpointId":123,"delay":1200}
[Janus] [ERROR] [timestamp] Watch failed {"cameraId":"...","mountpointId":123,"retryCount":1}
[Janus] [WARN] [timestamp] Retrying watch after 2400ms {"cameraId":"...","mountpointId":123,"delay":2400}
```

**Success Criteria:**
- ✅ Retries use exponential backoff (1s → 2s → 4s)
- ✅ Jitter applied (delays vary slightly)
- ✅ Max 3 retries attempted
- ✅ Error surfaced after exhaustion

---

#### Test Case B2: ICE Disconnect (Transient)

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| ICE disconnect | Disable network for 5 seconds | Connection attempts to reconnect | State transitions: `live` → `offline` → `live` (if successful) |

**Test Steps:**
1. Open camera stream (verify `live` state)
2. DevTools → Network → Throttle to "Offline"
3. Wait 5 seconds
4. Network → Throttle to "Online"
5. Observe reconnection behavior

**Expected Behavior:**
- ICE state changes logged: `connected` → `disconnected` → `connected`
- State transitions: `live` → `offline` → `live`
- No retry attempts (ICE handles reconnection automatically)

**Success Criteria:**
- ✅ ICE disconnect detected
- ✅ State transitions correctly
- ✅ Reconnection automatic (no manual retry needed)

---

#### Test Case B3: Permanent Failure (No Retry)

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Invalid mountpoint | Set mountpoint to non-existent ID | No retry occurs, error immediately surfaced | Error code: `MOUNTPOINT_NOT_FOUND` |

**Test Steps:**
1. Mock backend to return invalid `mountpointId` (e.g., 99999)
2. Attempt to open camera stream
3. Observe console logs
4. Verify no retry attempts

**Expected Console Logs:**
```
[Janus] [INFO] [timestamp] Watching mountpoint {"cameraId":"...","mountpointId":99999}
[Janus] [ERROR] [timestamp] Watch failed {"cameraId":"...","mountpointId":99999,"retryCount":0}
// NO retry logs - error is permanent
```

**Success Criteria:**
- ✅ No retry attempts for permanent failures
- ✅ Error code: `MOUNTPOINT_NOT_FOUND`
- ✅ Error message: "Mountpoint not found"
- ✅ UI shows error state immediately

---

### C. Session Disconnect / Transport Closed

#### Test Case C1: Janus Session Destroyed

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Session destroyed | Kill session from Janus admin console | `handleSessionDisconnect()` called, cleanup safe, UI shows Error | No crashes, all resources cleaned up |

**Test Steps:**
1. Open camera stream (verify `live` state)
2. Janus Admin API → Destroy session
3. Observe cleanup behavior
4. Check console logs
5. Verify WebRTC tracks stopped

**Expected Console Logs:**
```
[Janus] [WARN] [timestamp] Session destroyed by server {"cameraId":"...","mountpointId":123}
[Janus] [ERROR] [timestamp] Session disconnected {"cameraId":"...","mountpointId":123,"reason":"Session destroyed by server"}
[Janus] [INFO] [timestamp] Destroying client {"cameraId":"...","mountpointId":123}
```

**Success Criteria:**
- ✅ `handleSessionDisconnect()` called
- ✅ `tearDownResources()` called
- ✅ All MediaStream tracks stopped
- ✅ RTCPeerConnection closed
- ✅ Plugin handle detached
- ✅ UI shows error state with message: "Connection lost: Session destroyed by server"
- ✅ Error code: `SESSION_DISCONNECTED`
- ✅ No crashes or exceptions

---

#### Test Case C2: Transport Closed

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Transport closed | Force WebSocket close | Same as C1 | Same cleanup behavior |

**Test Steps:**
1. Open camera stream (verify `live` state)
2. DevTools → Network → Block WebSocket connection
3. Observe cleanup behavior

**Expected Behavior:**
- Same as Test Case C1
- Error message: "Connection lost: Transport closed"

**Success Criteria:**
- ✅ Same as Test Case C1
- ✅ Transport close detected
- ✅ Cleanup safe and complete

---

### D. Backend Validation

#### Test Case D1: Missing `janusServerUrl`

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Missing field | Remove `janusServerUrl` from API response | Frontend fails fast, shows explicit error | Error message: "Backend did not return janusServerUrl for WebRTC stream" |

**Test Steps:**
1. Mock backend to return response without `janusServerUrl`:
   ```json
   {
     "cameraId": "camera-123",
     "mountpointId": 123,
     "streamType": "webrtc"
   }
   ```
2. Attempt to open camera stream
3. Observe error handling

**Expected Console Logs:**
```
[useJanusStream] Fetching metadata for camera: camera-123
Error: Backend did not return janusServerUrl for WebRTC stream
```

**Success Criteria:**
- ✅ Validation fails immediately (no Janus connection attempted)
- ✅ Error message is explicit and actionable
- ✅ UI shows error state
- ✅ No partial connection state

---

#### Test Case D2: Missing `mountpointId`

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Missing field | Remove `mountpointId` from API response | Frontend fails fast, shows explicit error | Error message: "Backend did not return mountpointId for WebRTC stream" |

**Test Steps:**
1. Mock backend to return response without `mountpointId`:
   ```json
   {
     "cameraId": "camera-123",
     "janusServerUrl": "wss://janus.example.com/janus",
     "streamType": "webrtc"
   }
   ```
2. Attempt to open camera stream
3. Observe error handling

**Expected Behavior:**
- Same as Test Case D1
- Error message: "Backend did not return mountpointId for WebRTC stream"

**Success Criteria:**
- ✅ Same as Test Case D1

---

#### Test Case D3: Wrong `streamType`

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Wrong type | Set `streamType` to `"hls"` | Frontend rejects, shows error message | Error message: "Stream type is hls, expected 'webrtc'" |

**Test Steps:**
1. Mock backend to return:
   ```json
   {
     "cameraId": "camera-123",
     "janusServerUrl": "wss://janus.example.com/janus",
     "mountpointId": 123,
     "streamType": "hls"
   }
   ```
2. Attempt to open camera stream
3. Observe error handling

**Expected Behavior:**
- Validation fails before Janus connection
- Error message: "Stream type is hls, expected 'webrtc'"

**Success Criteria:**
- ✅ Validation fails immediately
- ✅ Error message is clear
- ✅ No Janus connection attempted

---

#### Test Case D4: Missing `streamType`

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Missing field | Remove `streamType` from API response | Frontend fails fast, shows explicit error | Error message: "Backend did not return streamType field" |

**Test Steps:**
1. Mock backend to return response without `streamType`
2. Attempt to open camera stream
3. Observe error handling

**Expected Behavior:**
- Validation fails first (before checking other fields)
- Error message: "Backend did not return streamType field"

**Success Criteria:**
- ✅ Validation fails immediately
- ✅ Error message is explicit

---

### E. Multi-Viewer Handling

#### Test Case E1: Max Viewers Reached (Error Code 458)

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Too many viewers | Simulate Janus error code 458 | Detect error code, UI shows "Too Many Viewers" | Error code: `TOO_MANY_VIEWERS`, orange styling |

**Test Steps:**
1. Mock Janus to return error code 458 on watch request:
   ```json
   {
     "error": "Too many viewers",
     "error_code": 458
   }
   ```
2. Attempt to open camera stream
3. Observe UI state

**Expected UI:**
- Overlay: Orange warning icon
- Title: "Too Many Viewers"
- Message: "Stream busy - too many viewers. Please try again later."
- Retry button: Orange styling

**Expected Console Logs:**
```
[Janus] [ERROR] [timestamp] Watch failed {"cameraId":"...","mountpointId":123,"retryCount":0}
// Error code 458 detected, no retry
```

**Success Criteria:**
- ✅ Error code 458 detected
- ✅ Error code: `TOO_MANY_VIEWERS`
- ✅ UI shows orange overlay (not red)
- ✅ No retry attempts (permanent error)
- ✅ User-friendly message displayed

---

#### Test Case E2: Stream Busy (Error Code 459)

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Stream busy | Simulate Janus error code 459 | Detect error code, UI shows "Stream Busy" | Error code: `STREAM_BUSY`, orange styling |

**Test Steps:**
1. Mock Janus to return error code 459 on watch request:
   ```json
   {
     "error": "Stream is busy",
     "error_code": 459
   }
   ```
2. Attempt to open camera stream
3. Observe UI state

**Expected UI:**
- Overlay: Orange warning icon
- Title: "Stream Busy"
- Message: "Stream is currently busy. Please try again in a moment."
- Retry button: Orange styling

**Success Criteria:**
- ✅ Error code 459 detected
- ✅ Error code: `STREAM_BUSY`
- ✅ UI shows orange overlay
- ✅ No retry attempts
- ✅ User-friendly message displayed

---

#### Test Case E3: Multiple Viewers (Success)

| Scenario | Action | Expected Result | Verification |
|----------|--------|----------------|--------------|
| Multiple viewers | Connect 2-3 viewers simultaneously | All viewers see stream, no crash | Logging includes retry count/context |

**Test Steps:**
1. Open camera stream in Browser Tab 1
2. Open same camera stream in Browser Tab 2
3. Open same camera stream in Browser Tab 3
4. Verify all streams play
5. Check console logs for context

**Expected Behavior:**
- All 3 viewers see live stream
- No crashes or errors
- Each viewer has independent Janus session
- Logs include `cameraId`, `mountpointId` for each viewer

**Success Criteria:**
- ✅ All viewers see stream
- ✅ No crashes
- ✅ Independent sessions per viewer
- ✅ Logging includes context for each viewer

---

### F. UI State Verification

#### Test Case F1: Loading State

| State | Visual | Message | Actions |
|-------|--------|---------|---------|
| `loading` | Spinner animation | "Connecting to stream..." | None |

**Verification:**
- [ ] Spinner visible (blue, animated)
- [ ] Message displayed
- [ ] No video element visible
- [ ] Overlay covers entire video area

---

#### Test Case F2: Live State

| State | Visual | Message | Actions |
|-------|--------|---------|---------|
| `live` | Video playing | None | None |

**Verification:**
- [ ] Video element visible and playing
- [ ] No overlay visible
- [ ] Video muted by default
- [ ] Autoplay working

---

#### Test Case F3: Offline State

| State | Visual | Message | Actions |
|-------|--------|---------|---------|
| `offline` | Yellow warning icon | "Stream Offline" + description | Retry button |

**Verification:**
- [ ] Yellow warning icon visible
- [ ] Title: "Stream Offline"
- [ ] Description: "The camera stream is currently unavailable"
- [ ] Retry button visible (yellow styling)
- [ ] Clicking retry attempts reconnection

---

#### Test Case F4: Error State (Generic)

| State | Visual | Message | Actions |
|-------|--------|---------|---------|
| `error` | Red error icon | Error message | Retry button |

**Verification:**
- [ ] Red error icon visible
- [ ] Title: "Connection Error"
- [ ] Error message displayed
- [ ] Retry button visible (red styling)
- [ ] Clicking retry attempts reconnection

---

#### Test Case F5: Error State (Stream Busy)

| State | Visual | Message | Actions |
|-------|--------|---------|---------|
| `error` (code: `STREAM_BUSY`) | Orange warning icon | "Stream Busy" + description | Retry button |

**Verification:**
- [ ] Orange warning icon visible
- [ ] Title: "Stream Busy"
- [ ] Message: "Stream is currently busy. Please try again in a moment."
- [ ] Retry button visible (orange styling)

---

#### Test Case F6: Error State (Too Many Viewers)

| State | Visual | Message | Actions |
|-------|--------|---------|---------|
| `error` (code: `TOO_MANY_VIEWERS`) | Orange warning icon | "Too Many Viewers" + description | Retry button |

**Verification:**
- [ ] Orange warning icon visible
- [ ] Title: "Too Many Viewers"
- [ ] Message: "Stream busy - too many viewers. Please try again later."
- [ ] Retry button visible (orange styling)

---

### G. Logging & Observability

#### Test Case G1: JanusLogger Integration

**Verification Checklist:**
- [ ] All events logged via JanusLogger (not console.log)
- [ ] Log format: `[Janus] [LEVEL] [TIMESTAMP] message {context}`
- [ ] Context includes `cameraId`, `mountpointId` (where applicable)
- [ ] Retry attempts include `retryCount` in context
- [ ] Error logs include error details

**Expected Log Events:**
```
[Janus] [INFO] [timestamp] Connecting to Janus {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Janus library loaded {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Creating Janus session {"cameraId":"...","mountpointId":123,"serverUrl":"wss://..."}
[Janus] [INFO] [timestamp] Session created {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Attaching to streaming plugin {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Plugin attached {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Watching mountpoint {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Watch request sent {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Received SDP offer {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] ICE candidate {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] ICE connection state changed {"cameraId":"...","mountpointId":123,"iceState":"connected"}
[Janus] [INFO] [timestamp] SDP answer sent {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Sending start request {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Start request successful {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Remote stream received {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Stream started {"cameraId":"...","mountpointId":123}
```

**Error Logs:**
```
[Janus] [ERROR] [timestamp] Watch failed {"cameraId":"...","mountpointId":123,"retryCount":0}
[Janus] [WARN] [timestamp] Retrying watch after 1200ms {"cameraId":"...","mountpointId":123,"delay":1200}
[Janus] [ERROR] [timestamp] Session disconnected {"cameraId":"...","mountpointId":123,"reason":"Session destroyed by server"}
```

**Success Criteria:**
- ✅ No raw `console.log()` calls (all via JanusLogger)
- ✅ All logs include structured context
- ✅ Log levels appropriate (INFO/WARN/ERROR)
- ✅ Timestamps in ISO format
- ✅ Context includes cameraId, mountpointId, retryCount (where applicable)

---

### H. Cleanup Verification

#### Test Case H1: Component Unmount

| Action | Expected Result | Verification |
|--------|----------------|--------------|
| Navigate away from camera page | All resources cleaned up | No lingering WebRTC connections |

**Test Steps:**
1. Open camera stream (verify `live` state)
2. Navigate away from page
3. Check WebRTC Internals: `chrome://webrtc-internals/`
4. Verify no active connections

**Expected Console Logs:**
```
[Janus] [INFO] [timestamp] Destroying client {"cameraId":"...","mountpointId":123}
[Janus] [INFO] [timestamp] Client destroyed {"cameraId":"...","mountpointId":123}
```

**WebRTC Internals Checks:**
- [ ] No active RTCPeerConnections
- [ ] No active MediaStream tracks
- [ ] Connection count: 0

**Success Criteria:**
- ✅ `destroy()` method called
- ✅ All MediaStream tracks stopped
- ✅ RTCPeerConnection closed
- ✅ Plugin handle detached
- ✅ Session destroyed
- ✅ No memory leaks
- ✅ WebRTC Internals shows clean state

---

#### Test Case H2: Page Refresh

| Action | Expected Result | Verification |
|--------|----------------|--------------|
| Refresh page | Old session destroyed, new session created | No duplicate connections |

**Test Steps:**
1. Open camera stream (verify `live` state)
2. Refresh page (F5 or Cmd+R)
3. Verify old session destroyed before new session created
4. Check WebRTC Internals

**Expected Behavior:**
- Old session cleanup logs appear
- New session creation logs appear
- No duplicate connections
- Video reconnects successfully

**Success Criteria:**
- ✅ Old session destroyed before new session created
- ✅ No duplicate connections
- ✅ Video reconnects successfully
- ✅ No memory leaks

---

#### Test Case H3: Multiple Cameras Cleanup

| Action | Expected Result | Verification |
|--------|----------------|--------------|
| Open 3 cameras, then close all | All resources cleaned up | No lingering connections |

**Test Steps:**
1. Open Camera 1 (verify `live`)
2. Open Camera 2 (verify `live`)
3. Open Camera 3 (verify `live`)
4. Close all cameras (navigate away or close tabs)
5. Check WebRTC Internals

**Expected Behavior:**
- Each camera has independent cleanup
- All sessions destroyed
- All tracks stopped
- No lingering connections

**Success Criteria:**
- ✅ All 3 cameras cleaned up independently
- ✅ No lingering connections
- ✅ WebRTC Internals shows clean state

---

## 3. Manual Verification Steps

### Quick Verification Checklist

1. **Basic Playback**
   - [ ] Open 1 camera → observe Live state
   - [ ] Video plays automatically
   - [ ] Video is muted by default
   - [ ] Refresh page → video reconnects

2. **Multi-Viewer**
   - [ ] Open 2-3 cameras simultaneously → check multi-viewer behavior
   - [ ] All streams play independently
   - [ ] No crashes or errors

3. **Session Disconnect**
   - [ ] Kill Janus session → verify session disconnect handled
   - [ ] UI shows error state
   - [ ] No crashes
   - [ ] Cleanup logs appear

4. **Retry Logic**
   - [ ] Force network drop → verify retry/backoff logic
   - [ ] Retry attempts logged with exponential backoff
   - [ ] Max retries respected (3 attempts)
   - [ ] Permanent failures don't retry

5. **Backend Validation**
   - [ ] Simulate backend API missing fields → verify fail fast
   - [ ] Error messages are explicit
   - [ ] No partial connection state

6. **UI States**
   - [ ] Observe UI overlays for all states
   - [ ] Loading: Spinner + message
   - [ ] Live: No overlay
   - [ ] Offline: Yellow warning + retry
   - [ ] Error: Red error + retry
   - [ ] Stream Busy: Orange warning + retry
   - [ ] Too Many Viewers: Orange warning + retry

7. **Logging**
   - [ ] Check DevTools Console / JanusLogger for full logging context
   - [ ] All logs include cameraId, mountpointId
   - [ ] Retry attempts include retryCount
   - [ ] No console.log() calls (all via JanusLogger)

---

## 4. Automated / Optional Tests

### Jest + React Testing Library Tests

**Test File:** `app/app/lib/hooks/__tests__/useJanusStream.test.ts`

**Test Cases:**
```typescript
describe('useJanusStream', () => {
  it('should connect and set live state', async () => {
    // Test successful connection
  });

  it('should retry on transient failures', async () => {
    // Test retry logic with exponential backoff
  });

  it('should not retry on permanent failures', async () => {
    // Test mountpoint not found (no retry)
  });

  it('should handle session disconnect', async () => {
    // Test handleSessionDisconnect() called
  });

  it('should cleanup on unmount', async () => {
    // Test tearDownResources() called
  });

  it('should validate backend response', async () => {
    // Test streamType validation
    // Test missing fields
  });

  it('should detect multi-viewer errors', async () => {
    // Test error codes 458, 459
  });
});
```

**Test File:** `app/app/components/video/__tests__/JanusCameraPlayer.test.tsx`

**Test Cases:**
```typescript
describe('JanusCameraPlayer', () => {
  it('should render loading state', () => {
    // Test loading overlay
  });

  it('should render live state', () => {
    // Test video element visible
  });

  it('should render error state', () => {
    // Test error overlay
  });

  it('should render stream busy state', () => {
    // Test orange overlay for STREAM_BUSY
  });

  it('should render too many viewers state', () => {
    // Test orange overlay for TOO_MANY_VIEWERS
  });

  it('should cleanup on unmount', () => {
    // Test cleanup called
  });
});
```

---

### Cypress E2E Tests (Optional)

**Test File:** `cypress/e2e/janus-streaming.cy.ts`

**Test Cases:**
```typescript
describe('Janus WebRTC Streaming', () => {
  it('should play video stream', () => {
    cy.visit('/dashboard');
    cy.get('[data-testid="camera-player"]').should('be.visible');
    cy.get('video').should('have.prop', 'paused', false);
  });

  it('should handle network errors', () => {
    cy.intercept('GET', '/api/cameras/*/stream', { forceNetworkError: true });
    cy.visit('/dashboard');
    cy.get('[data-testid="error-overlay"]').should('be.visible');
  });

  it('should retry on failure', () => {
    // Test retry logic
  });

  it('should cleanup on navigation', () => {
    // Test cleanup
  });
});
```

---

## 5. Acceptance Criteria

### ✅ Critical Requirements

- [ ] **Video plays reliably** for single and multiple viewers
- [ ] **Retry/backoff logic** works as designed (exponential backoff + jitter, max 3 retries)
- [ ] **Session disconnects** and transport closures handled safely (no crashes, cleanup complete)
- [ ] **Backend validation** enforced, fails fast if invalid (streamType, janusServerUrl, mountpointId)
- [ ] **UI states** cover all scenarios:
  - [ ] Loading (spinner + message)
  - [ ] Live (video visible)
  - [ ] Offline (yellow warning + retry)
  - [ ] Error (red error + retry)
  - [ ] Stream Busy (orange warning + retry)
  - [ ] Too Many Viewers (orange warning + retry)
- [ ] **Logging** is consistent and contextual (JanusLogger, structured context)
- [ ] **Cleanup** is deterministic, no memory leaks or dangling streams

### ✅ Performance Requirements

- [ ] Connection established in < 3 seconds (under normal conditions)
- [ ] Retry delays respect exponential backoff (1s → 2s → 4s)
- [ ] Cleanup completes in < 1 second
- [ ] No memory leaks after 10+ connect/disconnect cycles

### ✅ Error Handling Requirements

- [ ] All errors surfaced to UI with user-friendly messages
- [ ] Error codes passed through callback chain
- [ ] Multi-viewer errors (458, 459) detected and displayed correctly
- [ ] Permanent failures don't retry
- [ ] Transient failures retry with backoff

### ✅ Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari 11+ (if applicable)

---

## 6. Troubleshooting Guide

### Common Issues

**Issue:** Video doesn't play
- **Check:** Backend API returns correct fields
- **Check:** Janus Gateway is running
- **Check:** Mountpoint exists and is active
- **Check:** Browser WebRTC support enabled

**Issue:** Retries not working
- **Check:** Error is transient (not permanent)
- **Check:** Console logs show retry attempts
- **Check:** Max retries not exceeded (3)

**Issue:** Session disconnect not handled
- **Check:** `handleSessionDisconnect()` method exists
- **Check:** `tearDownResources()` method exists
- **Check:** Console logs show cleanup

**Issue:** UI states not showing
- **Check:** Error codes passed through callback chain
- **Check:** `errorCode` state in useJanusStream hook
- **Check:** JanusCameraPlayer checks errorCode

**Issue:** Logging inconsistent
- **Check:** All console.log replaced with JanusLogger
- **Check:** Context includes cameraId, mountpointId
- **Check:** Log format matches expected pattern

---

## 7. Sign-Off

**Validation Completed By:** _________________  
**Date:** _________________  
**Status:** ☐ PASS  ☐ FAIL  ☐ PARTIAL

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

## Appendix: Quick Reference

### Error Codes

| Code | Meaning | Retry? | UI State |
|------|---------|--------|----------|
| `TOO_MANY_VIEWERS` | Error 458 | No | Orange overlay |
| `STREAM_BUSY` | Error 459 | No | Orange overlay |
| `MOUNTPOINT_NOT_FOUND` | Error 457 | No | Red overlay |
| `PERMISSION_DENIED` | Error 403 | No | Red overlay |
| `SESSION_DISCONNECTED` | Session destroyed | No | Red overlay |
| `ICE_FAILED` | ICE connection failed | No | Red overlay |
| `SDP_FAILED` | SDP negotiation failed | No | Red overlay |
| `WATCH_FAILED` | Generic watch error | Depends | Red overlay |

### Retry Configuration

- **Max Retries:** 3
- **Initial Delay:** 1000ms
- **Max Delay:** 8000ms
- **Backoff Multiplier:** 2
- **Jitter:** 0-20% random

### Log Format

```
[Janus] [LEVEL] [TIMESTAMP] message {"cameraId":"...","mountpointId":123,"retryCount":0}
```

---

**End of Validation Playbook**


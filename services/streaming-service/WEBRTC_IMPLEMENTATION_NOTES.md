# WebRTC Integration Implementation Notes

**Status**: Placeholder Implementation  
**Priority**: MEDIUM  
**Dependencies**: Janus Gateway Server

## Current State

The WebRTC implementation is currently a placeholder. The following needs to be implemented:

## Required Changes

### 1. Deploy Janus Gateway Server

External dependency that needs to be set up separately:

```bash
# Docker example
docker run -d --name janus \
  -p 8088:8088 \
  -p 8089:8089 \
  -p 8188:8188 \
  -p 8189:8189 \
  -e JANUS_CONFIG_PATH=/opt/janus/etc/janus \
  canyan/janus-gateway
```

### 2. Update stream_manager.py

Replace `_start_webrtc_stream()` placeholder with actual Janus Gateway integration:

- Create Janus session via HTTP API
- Attach RTSP plugin
- Configure RTSP source URL
- Start stream
- Store session info (session_id, handle_id, janus_url)

### 3. Update main.py

Replace `/webrtc/{camera_id}/signaling` endpoint placeholder with actual Janus signaling:

- Forward SDP offers/answers to Janus
- Handle ICE candidates
- Return Janus responses to client

### 4. Session Management

- Store WebRTC sessions in `_webrtc_sessions` dictionary
- Clean up sessions on stream stop
- Handle session timeouts

## Recommended Implementation Order

1. Set up Janus Gateway server (test connectivity)
2. Implement session creation in `_start_webrtc_stream()`
3. Implement signaling endpoint
4. Test with WebRTC client
5. Add session cleanup and error handling
6. Add Prometheus metrics

## Metrics to Add

- `webrtc_sessions_active_total{camera_id}`
- `webrtc_connection_failures_total{camera_id, error_type}`
- `webrtc_session_duration_seconds{camera_id}`

## Notes

- WebRTC is optional - LL-HLS fallback will be used if WebRTC fails
- Implementation complexity is HIGH due to external dependency
- Can be implemented incrementally (start with placeholder, add real implementation later)


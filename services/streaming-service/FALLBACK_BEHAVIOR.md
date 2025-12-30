# Fallback Behavior

Documentation for fallback behavior when streaming fails or protocol is unavailable.

## Overview

The Streaming Service implements fallback strategies to ensure video availability even when primary streaming methods fail.

## Fallback Strategy

### Fallback Hierarchy

```
1. WebRTC (Primary for small sites)
   ↓ (if fails)
2. LL-HLS (Fallback)
   ↓ (if fails)
3. Static Snapshot (Final fallback)
```

### Fallback Rules

1. **WebRTC → LL-HLS**: If WebRTC fails, fall back to LL-HLS
2. **LL-HLS → Static Snapshot**: If LL-HLS fails, fall back to static snapshot
3. **Max Attempts**: Maximum 3 fallback attempts per camera to prevent loops
4. **Cooldown**: Fallback attempts tracked to prevent rapid retries

## Fallback Scenarios

### Scenario 1: WebRTC Failure

**Trigger**: WebRTC stream fails to start or crashes

**Fallback Action**:
1. Detect WebRTC process failure
2. Stop WebRTC process
3. Start LL-HLS stream instead
4. Update stream URL to HLS playlist
5. Log fallback event

**Example**:
```
Camera: camera-123
Primary: WebRTC
Status: Failed (process died)
Fallback: LL-HLS
Result: LL-HLS stream active
```

### Scenario 2: LL-HLS Failure

**Trigger**: LL-HLS stream fails to start or FFmpeg crashes

**Fallback Action**:
1. Detect LL-HLS process failure
2. Stop LL-HLS process
3. Return static snapshot URL (no live stream)
4. Log fallback event
5. Schedule retry (with backoff)

**Example**:
```
Camera: camera-123
Primary: LL-HLS
Status: Failed (FFmpeg error)
Fallback: Static Snapshot
Result: Static snapshot URL returned
```

### Scenario 3: Protocol Unavailable

**Trigger**: Requested protocol is disabled or not supported

**Fallback Action**:
1. Detect protocol unavailable
2. Select alternative protocol automatically
3. Start stream with alternative protocol
4. Log protocol switch

**Example**:
```
Camera: camera-123
Requested: WebRTC
Status: Disabled
Fallback: LL-HLS
Result: LL-HLS stream started
```

## Implementation

### Fallback Manager

The `FallbackManager` class handles fallback logic:

```python
fallback_manager = FallbackManager(enable_fallback=True)

# Get fallback protocol
fallback_protocol = fallback_manager.get_fallback_protocol(
    primary_protocol=StreamingProtocol.WEBRTC,
    camera_count=5
)
# Returns: StreamingProtocol.LL_HLS

# Check if fallback should be attempted
should_fallback = fallback_manager.should_try_fallback(
    camera_id="camera-123",
    protocol=StreamingProtocol.WEBRTC
)
# Returns: True (if not exceeded max attempts)
```

### Fallback Flow

```
Start Stream Request
    │
    ├─ Try Primary Protocol
    │   │
    │   ├─ Success → Done ✓
    │   │
    │   └─ Failure
    │       │
    │       ├─ Check Fallback Available
    │       │   │
    │       │   ├─ Yes → Try Fallback Protocol
    │       │   │   │
    │       │   │   ├─ Success → Done ✓
    │       │   │   │
    │       │   │   └─ Failure → Static Snapshot
    │       │   │
    │       │   └─ No → Static Snapshot
    │       │
    │       └─ Record Fallback Attempt
    │
    └─ Return Stream URL (or snapshot URL)
```

## Fallback Limits

### Maximum Attempts

- **Max Fallback Attempts**: 3 per camera/protocol combination
- **Prevents**: Infinite fallback loops
- **Tracking**: Stored in memory (cleared on success)

### Cooldown Period

- **Cooldown**: No explicit cooldown (relies on max attempts)
- **Reset**: Fallback history cleared on successful stream

## Static Snapshot Fallback

### When Used

Static snapshot fallback is used when:
- All streaming protocols fail
- FFmpeg/WebRTC processes cannot start
- Network connectivity issues to RTSP source

### Implementation

```python
# Return static snapshot URL instead of stream URL
snapshot_url = f"https://snapshot-service/tenant/{tenant_id}/camera/{camera_id}/latest.jpg"

# Client can poll snapshot URL for updates
# Or use snapshot service's latest frame endpoint
```

### Limitations

- **Not Real-time**: Snapshot updates depend on snapshot service
- **Higher Latency**: No live streaming
- **Limited Functionality**: No video playback controls

## Fallback Metrics

### Tracking

Fallback events are tracked in:
- **Logs**: Structured logging with fallback reason
- **Metrics**: Fallback counts (future enhancement)

### Logging

```json
{
  "level": "WARNING",
  "message": "Fallback triggered",
  "camera_id": "camera-123",
  "primary_protocol": "webrtc",
  "fallback_protocol": "ll_hls",
  "reason": "process_failure"
}
```

## Error Handling

### Process Failure Detection

- **Poll Process**: Check if process is still running
- **Exit Code**: Check process exit code
- **Stderr Output**: Monitor FFmpeg/WebRTC errors

### Automatic Recovery

1. **Detect Failure**: Process dies or exits with error
2. **Stop Process**: Clean up failed process
3. **Try Fallback**: Attempt fallback protocol
4. **Update Status**: Update stream status and health metrics

## Configuration

### Enable/Disable Fallback

```bash
# Environment variable
ENABLE_FALLBACK=true  # Enable fallback behavior
```

### Fallback Behavior Settings

- **Max Attempts**: Hardcoded to 3 (configurable in code)
- **Protocol Priority**: WebRTC → LL-HLS → Static Snapshot

## Best Practices

### 1. Monitor Fallback Frequency

- High fallback rate indicates infrastructure issues
- Alert if fallback rate > 10% of streams

### 2. Log Fallback Reasons

- Track why fallbacks occur
- Use for troubleshooting and capacity planning

### 3. Health Checks

- Regular health checks detect failures early
- Proactive fallback before user impact

### 4. Retry Logic

- After fallback, schedule retry of primary protocol
- Use exponential backoff to avoid rapid retries

## Example Scenarios

### Example 1: WebRTC → LL-HLS Fallback

```
10:00:00 - Start WebRTC stream for camera-123
10:00:05 - WebRTC process dies (signaling server issue)
10:00:06 - Detect failure
10:00:07 - Stop WebRTC process
10:00:08 - Start LL-HLS stream (fallback)
10:00:10 - LL-HLS stream active
10:00:11 - Update stream URL to HLS playlist
```

### Example 2: LL-HLS → Static Snapshot Fallback

```
10:00:00 - Start LL-HLS stream for camera-456
10:00:05 - FFmpeg process fails (RTSP connection error)
10:00:06 - Detect failure
10:00:07 - Stop LL-HLS process
10:00:08 - No protocol fallback available
10:00:09 - Return static snapshot URL
10:00:10 - Client displays static snapshot
```

### Example 3: Protocol Unavailable Fallback

```
10:00:00 - Request WebRTC stream for camera-789
10:00:01 - WebRTC disabled in configuration
10:00:02 - Auto-select LL-HLS (fallback)
10:00:03 - Start LL-HLS stream
10:00:05 - LL-HLS stream active
```


# Streaming Service

Service for video streaming with WebRTC and LL-HLS support.

## Overview

The Streaming Service provides video streaming capabilities for cameras with protocol selection based on site size:
- **WebRTC**: For small sites (<10 cameras) - ultra-low latency
- **LL-HLS**: For larger sites (≥10 cameras) - scalable, HTTP-based

**Critical Principle**: Streaming processes are completely separate from detection to ensure streaming NEVER affects detection performance.

## Features

### Protocol Selection

- **Automatic Selection**: Based on camera count at worksite
- **WebRTC**: <10 cameras (low latency)
- **LL-HLS**: ≥10 cameras (scalability)

### Streaming Independence

- **Separate Processes**: Streaming uses separate FFmpeg/WebRTC processes
- **No Detection Impact**: Detection continues independently
- **Resource Isolation**: No shared resources between streaming and detection

### Health Metrics

- Stream availability monitoring
- Uptime tracking
- Restart counting
- Prometheus metrics

### Fallback Behavior

- WebRTC → LL-HLS fallback
- LL-HLS → Static snapshot fallback
- Automatic protocol switching

## Architecture

See [STREAMING_ARCHITECTURE.md](./STREAMING_ARCHITECTURE.md) for detailed architecture documentation.

**Key Design**:
- Detection: Reads frames from `/tmp/frames` (from Camera Ingest Service)
- Streaming: Reads directly from RTSP source (separate process)
- Complete isolation ensures no interference

## Tradeoffs

See [TRADEOFF_EXPLANATION.md](./TRADEOFF_EXPLANATION.md) for detailed tradeoff analysis.

**Summary**:
- **WebRTC**: Low latency (<500ms) but limited scalability
- **LL-HLS**: Higher latency (2-6s) but highly scalable

## Fallback Behavior

See [FALLBACK_BEHAVIOR.md](./FALLBACK_BEHAVIOR.md) for fallback behavior documentation.

**Fallback Hierarchy**:
1. WebRTC → LL-HLS
2. LL-HLS → Static Snapshot
3. Maximum 3 attempts per camera

## API Endpoints

### Start Stream

```
POST /stream/<camera_id>/start
```

Starts streaming for a camera. Protocol is auto-selected based on camera count.

**Response**:
```json
{
  "success": true,
  "camera_id": "camera-123",
  "stream_url": "http://localhost:8080/hls/camera-123/playlist.m3u8",
  "protocol": "ll_hls"
}
```

### Stop Stream

```
POST /stream/<camera_id>/stop
```

Stops streaming for a camera.

### Get Stream Status

```
GET /stream/<camera_id>/status
```

Returns stream status, health, and URL.

**Response**:
```json
{
  "camera_id": "camera-123",
  "is_active": true,
  "stream_url": "http://localhost:8080/hls/camera-123/playlist.m3u8",
  "health": {
    "protocol": "ll_hls",
    "uptime_seconds": 3600,
    "restart_count": 0,
    "is_available": true
  }
}
```

### HLS Playlist

```
GET /hls/<camera_id>/playlist.m3u8
```

Serves HLS playlist file for LL-HLS streaming.

### HLS Segments

```
GET /hls/<camera_id>/<segment>.ts
```

Serves HLS segment files.

## Configuration

### Environment Variables

```bash
# Protocol Selection
SMALL_SITE_THRESHOLD=10  # Cameras threshold for WebRTC vs LL-HLS

# Protocol Enable/Disable
WEBRTC_ENABLED=true
LL_HLS_ENABLED=true

# Ports
RTMP_PORT=1935
HLS_PORT=8080
WEBRTC_PORT=8081

# HLS Settings
HLS_SEGMENT_DURATION=2.0
HLS_SEGMENT_COUNT=3

# Fallback
ENABLE_FALLBACK=true
```

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export DB_PASSWORD=your-password

# Run service
python src/main.py
```

## Metrics

Prometheus metrics exposed on `/metrics`:

- `streams_active_total{protocol, worksite_id}`: Active stream count
- `stream_uptime_seconds{camera_id, protocol}`: Stream uptime histogram
- `stream_restarts_total{camera_id, protocol}`: Stream restart count
- `stream_availability{camera_id, protocol}`: Availability (1=up, 0=down)

## Dependencies

- **FFmpeg**: Required for LL-HLS streaming
- **flask**: HTTP server for API and HLS serving
- **psycopg2**: PostgreSQL client for camera lookups
- **prometheus-client**: Metrics collection

## Documentation

- [STREAMING_ARCHITECTURE.md](./STREAMING_ARCHITECTURE.md): Architecture and design
- [TRADEOFF_EXPLANATION.md](./TRADEOFF_EXPLANATION.md): Protocol tradeoffs
- [FALLBACK_BEHAVIOR.md](./FALLBACK_BEHAVIOR.md): Fallback behavior

## Limitations

- WebRTC implementation is placeholder (needs WebRTC server integration)
- Static snapshot fallback requires snapshot service integration
- No CDN integration (can be added for LL-HLS)
- FFmpeg required for LL-HLS streaming

## Future Enhancements

- WebRTC server integration (Janus, Kurento, etc.)
- CDN integration for LL-HLS
- Adaptive bitrate streaming
- Stream recording/playback
- Multiple quality profiles


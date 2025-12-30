# Streaming Architecture

Documentation for video streaming architecture with WebRTC and LL-HLS support.

## Overview

The Streaming Service provides video streaming capabilities for cameras with two protocol options:
- **WebRTC**: For small sites (<10 cameras) - low latency, peer-to-peer
- **LL-HLS**: For larger sites (≥10 cameras) - scalable, HTTP-based

**Critical Principle**: Streaming processes are completely separate from detection to ensure streaming NEVER affects detection performance.

## Architecture

### Separation of Concerns

```
┌─────────────────────────────────────────────────────────┐
│                    Camera RTSP Source                    │
└──────────────┬──────────────────────────┬───────────────┘
               │                          │
               │                          │
    ┌──────────▼──────────┐    ┌─────────▼──────────┐
    │  Detection Pipeline │    │  Streaming Service │
    │                     │    │                    │
    │  • Frame extraction │    │  • WebRTC          │
    │  • YOLO inference   │    │  • LL-HLS          │
    │  • Violation logic  │    │  • Health metrics  │
    │                     │    │                    │
    │  Output: /tmp/frames│    │  Output: Streams   │
    └─────────────────────┘    └────────────────────┘
         Independent              Independent
         Processes                Processes
```

### Key Design Principles

1. **Complete Isolation**: Detection and streaming use separate processes
2. **No Shared Resources**: Detection reads frames, streaming reads RTSP directly
3. **Independent Scaling**: Streaming can scale independently of detection
4. **No Interference**: Streaming failures don't affect detection

## Protocol Selection

### WebRTC (Small Sites <10 Cameras)

**When to Use**:
- Sites with ≤10 active cameras
- Low latency requirements (<500ms)
- Real-time interaction needed

**Architecture**:
```
RTSP Source → GStreamer/Janus → WebRTC → Browser
```

**Characteristics**:
- Low latency (<500ms)
- Peer-to-peer connection
- High bandwidth per stream
- Limited scalability (CPU-intensive per stream)

### LL-HLS (Larger Sites ≥10 Cameras)

**When to Use**:
- Sites with >10 active cameras
- Scalable streaming needed
- Standard HTTP infrastructure

**Architecture**:
```
RTSP Source → FFmpeg → LL-HLS Segments → HTTP Server → Browser
```

**Characteristics**:
- Low latency (~2-6 seconds)
- HTTP-based (CDN-friendly)
- Highly scalable
- Lower bandwidth per viewer (HTTP caching)

## Streaming Process Architecture

### LL-HLS Process Flow

```
┌─────────────────┐
│  RTSP Source    │
│  (Camera)       │
└────────┬────────┘
         │
         │ RTSP Stream
         │
         ▼
┌─────────────────┐
│  FFmpeg Process │  ← Separate process (not detection)
│  • RTSP input   │
│  • H.264 encode │
│  • LL-HLS output│
└────────┬────────┘
         │
         │ HLS Segments
         │
         ▼
┌─────────────────┐
│  /tmp/streams/  │
│  camera_id/     │
│  • playlist.m3u8│
│  • segment_*.ts │
└────────┬────────┘
         │
         │ HTTP GET
         │
         ▼
┌─────────────────┐
│  Flask Server   │
│  • Serve HLS    │
│  • Metrics      │
└─────────────────┘
```

### WebRTC Process Flow (Placeholder)

```
┌─────────────────┐
│  RTSP Source    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  WebRTC Server  │  ← Janus/Kurento/GStreamer
│  • Signaling    │
│  • Media relay  │
└────────┬────────┘
         │
         │ WebRTC
         │
         ▼
┌─────────────────┐
│  Browser        │
│  (Client)       │
└─────────────────┘
```

## Detection Independence

### How Streaming Doesn't Affect Detection

1. **Separate Processes**:
   - Detection: Reads frames from `/tmp/frames` (from Camera Ingest Service)
   - Streaming: Reads directly from RTSP source (separate FFmpeg process)

2. **No Shared Resources**:
   - Detection uses its own frame buffer
   - Streaming uses its own encoding pipeline
   - No CPU/memory contention

3. **Independent Failure**:
   - Streaming failure → Detection continues
   - Detection failure → Streaming continues
   - Each can restart independently

4. **Resource Isolation**:
   ```
   Detection Process:
   - Input: /tmp/frames/{camera_id}/*.jpg
   - CPU: YOLO inference
   - Memory: Frame buffer (small)
   
   Streaming Process:
   - Input: RTSP URL (network)
   - CPU: H.264 encoding
   - Memory: Encoding buffer (separate)
   ```

## Stream Management

### Stream Lifecycle

1. **Start Stream**:
   - Check camera count at worksite
   - Select protocol (WebRTC or LL-HLS)
   - Start FFmpeg/WebRTC process
   - Register with health monitor

2. **Monitor Stream**:
   - Health checks every 30 seconds
   - Track uptime and availability
   - Detect process failures

3. **Stop Stream**:
   - Terminate process gracefully
   - Clean up resources
   - Update health metrics

### Process Management

- **Process Isolation**: Each stream runs in separate subprocess
- **Failure Handling**: Automatic cleanup of dead processes
- **Resource Limits**: Per-process resource limits (if needed)

## Health Metrics

### Prometheus Metrics

- `streams_active_total{protocol, worksite_id}`: Active stream count
- `stream_uptime_seconds{camera_id, protocol}`: Stream uptime histogram
- `stream_restarts_total{camera_id, protocol}`: Stream restart count
- `stream_availability{camera_id, protocol}`: Availability (1=up, 0=down)

### Health Checks

- **Process Health**: Check if FFmpeg/WebRTC process is running
- **Output Health**: Check if HLS segments are being generated (LL-HLS)
- **Availability**: Track when streams are available/unavailable

## API Endpoints

### Start Stream

```
POST /stream/<camera_id>/start
```

Starts streaming for a camera. Protocol is auto-selected based on camera count.

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
HLS_SEGMENT_DURATION=2.0  # Seconds
HLS_SEGMENT_COUNT=3       # Number of segments
```

## Integration Points

### With Camera Ingest Service

- **Detection**: Camera Ingest Service extracts frames → Detection Service
- **Streaming**: Streaming Service reads RTSP directly → No interference

### With Violation Engine

- Streaming is read-only for violation engine
- No direct integration needed

### With Frontend

- Frontend requests stream URLs from Streaming Service
- Frontend plays WebRTC or HLS streams based on URL


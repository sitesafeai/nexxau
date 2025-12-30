# Tradeoff Explanation: WebRTC vs LL-HLS

Documentation explaining tradeoffs between WebRTC and LL-HLS streaming protocols.

## Protocol Comparison

### WebRTC

**Advantages**:
- **Ultra-low latency**: <500ms end-to-end
- **Real-time interaction**: Suitable for live monitoring with immediate feedback
- **Peer-to-peer**: Direct connection reduces server load
- **Adaptive bitrate**: Automatic quality adjustment based on network

**Disadvantages**:
- **High CPU usage**: Per-stream encoding is CPU-intensive
- **Limited scalability**: Each stream requires significant resources
- **Complex setup**: Requires signaling server (Janus, Kurento, etc.)
- **Browser compatibility**: Some browsers have limitations
- **Bandwidth**: Higher bandwidth per viewer (no HTTP caching)

**Use Case**: Small sites (<10 cameras) where low latency is critical

### LL-HLS (Low Latency HLS)

**Advantages**:
- **Scalability**: HTTP-based, highly scalable with CDN support
- **Standard HTTP**: Works with standard web infrastructure
- **CDN-friendly**: Can be cached and distributed via CDN
- **Lower server load**: HTTP server is less CPU-intensive than WebRTC
- **Browser support**: Universal browser support (native HLS support)

**Disadvantages**:
- **Higher latency**: 2-6 seconds (vs <500ms for WebRTC)
- **HTTP overhead**: Multiple HTTP requests for segments
- **Segment management**: Requires careful segment lifecycle management

**Use Case**: Larger sites (≥10 cameras) where scalability is more important than ultra-low latency

## Decision Matrix

### Protocol Selection Rules

```
IF camera_count <= 10 AND latency_critical:
    USE WebRTC
ELSE:
    USE LL-HLS
```

### Factors to Consider

1. **Camera Count**:
   - <10 cameras: WebRTC is feasible
   - ≥10 cameras: LL-HLS scales better

2. **Latency Requirements**:
   - <500ms: WebRTC required
   - 2-6 seconds acceptable: LL-HLS sufficient

3. **Infrastructure**:
   - Existing CDN: LL-HLS benefits
   - Simple setup: LL-HLS easier
   - Advanced setup: WebRTC possible

4. **Cost**:
   - CPU-intensive: WebRTC more expensive at scale
   - CDN-friendly: LL-HLS cheaper at scale

## Resource Usage Comparison

### CPU Usage

**WebRTC**:
- Per-stream: ~10-20% CPU per camera
- 10 cameras: ~100-200% CPU (multiple cores needed)
- Encoding happens per connection

**LL-HLS**:
- Per-stream: ~5-10% CPU per camera (FFmpeg encoding)
- 10 cameras: ~50-100% CPU
- Encoding happens once, multiple viewers share

### Memory Usage

**WebRTC**:
- Per-stream: ~50-100 MB
- Per-viewer: Additional memory for connection

**LL-HLS**:
- Per-stream: ~20-50 MB (segment buffer)
- Per-viewer: Minimal (HTTP caching)

### Network Bandwidth

**WebRTC**:
- Per-viewer: Full stream bandwidth
- No caching benefit
- 10 viewers = 10x bandwidth

**LL-HLS**:
- Per-viewer: Full stream bandwidth (but can be cached)
- CDN caching reduces origin bandwidth
- 10 viewers with CDN = ~1x origin bandwidth

## Performance Characteristics

### Latency Comparison

```
WebRTC:
  Camera → Encoding → WebRTC → Browser
  Total: <500ms

LL-HLS:
  Camera → Encoding → Segment (2s) → HTTP → Browser
  Total: 2-6 seconds
```

### Scalability Comparison

```
WebRTC:
  10 cameras: ✓ Feasible
  50 cameras: ✗ Difficult (CPU constraints)
  100 cameras: ✗ Not feasible

LL-HLS:
  10 cameras: ✓ Easy
  50 cameras: ✓ Feasible (with CDN)
  100 cameras: ✓ Feasible (with CDN)
```

## Cost Analysis

### Infrastructure Costs

**WebRTC (Small Site)**:
- Server: 2-4 CPU cores for 10 cameras
- Bandwidth: Direct connection (no CDN benefit)
- Complexity: Higher (signaling server)

**LL-HLS (Large Site)**:
- Server: 4-8 CPU cores for 50 cameras
- Bandwidth: CDN reduces origin bandwidth
- Complexity: Lower (standard HTTP)

### Operational Costs

**WebRTC**:
- Higher CPU costs
- More complex monitoring
- Per-connection resource tracking

**LL-HLS**:
- Lower CPU costs per viewer
- Standard HTTP monitoring
- Simpler operational model

## Recommendation

### Small Sites (<10 Cameras)

**Recommendation**: Use **WebRTC**

**Reasoning**:
- Low latency is valuable for small sites
- CPU resources are manageable
- Real-time interaction improves user experience
- Simpler infrastructure (fewer cameras to manage)

### Large Sites (≥10 Cameras)

**Recommendation**: Use **LL-HLS**

**Reasoning**:
- Scalability becomes critical
- 2-6 second latency is acceptable for monitoring
- CDN integration reduces costs
- Standard HTTP infrastructure is easier to operate
- CPU usage is more efficient at scale

## Hybrid Approach (Future)

For sites with mixed requirements:

1. **Critical cameras**: Use WebRTC (low latency)
2. **Standard cameras**: Use LL-HLS (scalability)
3. **Protocol selection**: Per-camera based on requirements

This allows optimizing for both latency and scalability within the same site.


# Redis Streams Integration - Camera Ingest Service

## Overview

The Camera Ingest Service pushes frame **REFERENCES** (file paths) from RTSP streams into Redis Streams for downstream processing. Each tenant + camera combination has its own stream, enabling parallel processing and tenant isolation.

## ⚠️ IMPORTANT DESIGN DECISION: Frame References, NOT Binary Data

**Redis Streams store frame REFERENCES (file paths), NOT binary image data.**

This design decision was made for production efficiency:

1. **Memory Efficiency**: File paths are ~100 bytes vs 100KB+ for Base64-encoded JPEGs
   - Reduces Redis memory usage by ~99%
   - Enables handling thousands of cameras simultaneously

2. **GPU Inference Optimization**: 
   - Frame files can be memory-mapped directly by GPU inference services
   - Avoids unnecessary copies and Base64 decode overhead
   - Enables zero-copy loading for optimal performance

3. **Stream Performance**:
   - Smaller entries = faster Redis operations
   - Lower network overhead when consuming streams
   - Better throughput under high frame rates

4. **Flexibility**:
   - Consumers can choose optimal loading strategy (mmap, direct read, HTTP)
   - Files can be served via HTTP/CDN for distributed systems
   - Enables file-based caching strategies

## Stream Schema

### Stream Key Format

```
frames:tenant:{tenantId}:camera:{cameraId}
```

**Example:**
```
frames:tenant:company-123:camera:cam-456
```

### Stream Entry Structure

Each entry in the stream contains the following fields:

| Field | Type | Description |
|-------|------|-------------|
| `frame_path` | String | **Absolute file path** to JPEG frame on disk |
| `timestamp` | ISO 8601 string | Timestamp when frame was captured |
| `size` | String (number) | Frame file size in bytes |
| `sequence` | String (number) | Frame sequence number (extracted from filename) |

**Example Entry:**
```
ID: 1705320000000-0
Fields:
  frame_path: "/tmp/frames/cam-456/frame_00042.jpg"
  timestamp: "2024-01-15T10:30:00.000Z"
  size: "125430"
  sequence: "42"
```

### Frame Path Format

Frame paths are **absolute paths** to JPEG files on the local filesystem:
- Format: `/tmp/frames/{cameraId}/frame_{sequence}.jpg`
- Sequence number: Extracted from filename (e.g., `frame_00042.jpg` → sequence `42`)
- Must be accessible by consumer services (same filesystem or shared storage)

## Stream Configuration

### Maximum Stream Length

- **Limit**: 20 entries
- **Enforcement**: Automatic trimming using `XTRIM MAXLEN ~ 20`
- **Strategy**: Removes oldest entries (beginning of stream), keeping most recent
- **Approximation**: Uses `~` for performance (approximate trimming, slight length variation possible)

### Backpressure Threshold

- **Threshold**: 10 entries
- **Behavior**: New frames are dropped when stream length >= 10
- **Purpose**: Prevent stream from growing too large before trimming can occur
- **Monitoring**: Drop events are logged and tracked in metrics

### Frame Retention

- **Always keeps most recent frames**: MAXLEN trimming removes from the beginning
- **No frame loss during normal operation**: Backpressure prevents overflow
- **Old frames automatically removed**: Maintains constant stream size

## Backpressure Logic

### Flow Diagram

```
Frame arrives
    ↓
Check stream length (XLEN)
    ↓
Is length >= 10?
    ├─ YES → Drop frame, increment dropped counter, log warning
    └─ NO → Continue
    ↓
Add frame to stream (XADD)
    ↓
Trim stream to MAX_STREAM_LENGTH (XTRIM MAXLEN ~ 20)
    ↓
Update metrics
```

### Implementation Details

1. **Pre-check**: Stream length is checked before adding frame
2. **Early drop**: Frame is dropped if backlog too high (>= 10)
3. **Post-trim**: Stream is trimmed after adding (ensures max length)
4. **Metrics tracking**: Dropped frames are counted per camera

### Why Backpressure?

- **Prevents memory bloat**: Limits Redis memory usage
- **Maintains performance**: Shorter streams = faster queries
- **Ensures freshness**: Forces consumers to process frames promptly
- **Predictable behavior**: Fixed maximum stream size

## Reading from Streams

### Redis CLI Examples

```bash
# Read latest 10 entries (non-blocking)
XREAD COUNT 10 STREAMS frames:tenant:company-123:camera:cam-456 0

# Read with blocking (wait up to 5 seconds for new entries)
XREAD BLOCK 5000 COUNT 10 STREAMS frames:tenant:company-123:camera:cam-456 $

# Read range (all entries)
XRANGE frames:tenant:company-123:camera:cam-456 - + COUNT 20

# Read entries from specific ID onwards
XRANGE frames:tenant:company-123:camera:cam-456 1705320000000-0 + COUNT 20

# Get stream info
XINFO STREAM frames:tenant:company-123:camera:cam-456
```

### Node.js/ioredis Example

```typescript
import Redis from 'ioredis';
import { readFile } from 'fs/promises';

const redis = new Redis();

// Read latest entries
const entries = await redis.xread(
  'COUNT', 10,
  'STREAMS', 'frames:tenant:company-123:camera:cam-456', '$'
);

// Process entries
for (const [streamKey, messages] of entries) {
  for (const [messageId, fields] of messages) {
    // Parse fields (alternating key-value pairs)
    const fieldsMap: Record<string, string> = {};
    for (let i = 0; i < fields.length; i += 2) {
      fieldsMap[fields[i]] = fields[i + 1];
    }
    
    const framePath = fieldsMap['frame_path'];
    const timestamp = fieldsMap['timestamp'];
    const size = parseInt(fieldsMap['size'], 10);
    const sequence = parseInt(fieldsMap['sequence'], 10);
    
    // Read frame file from disk
    const frameBuffer = await readFile(framePath);
    
    // Use frameBuffer (JPEG image) for processing
    // For GPU inference, use memory-mapped file access instead
  }
}
```

### Python Example (for GPU inference)

```python
import redis
import mmap

r = redis.Redis()

# Read latest entries
entries = r.xread({'frames:tenant:company-123:camera:cam-456': '$'}, count=10)

for stream, messages in entries:
    for message_id, fields in messages:
        # Parse fields (dict with byte keys/values)
        fields_dict = {k.decode(): v.decode() for k, v in zip(fields[::2], fields[1::2])}
        
        frame_path = fields_dict['frame_path']
        timestamp = fields_dict['timestamp']
        size = int(fields_dict['size'])
        sequence = int(fields_dict['sequence'])
        
        # Memory-map file for GPU inference (zero-copy)
        with open(frame_path, 'rb') as f:
            with mmap.mmap(f.fileno(), 0, access=mmap.ACCESS_READ) as mm:
                # mm is memory-mapped, ready for GPU processing
                process_frame_gpu(mm)
```

### Consumer Group Example (Recommended)

```bash
# Create consumer group
XGROUP CREATE frames:tenant:company-123:camera:cam-456 detection-workers $ 0

# Read as consumer
XREADGROUP GROUP detection-workers worker-1 COUNT 10 STREAMS frames:tenant:company-123:camera:cam-456 >
```

## Metrics

### Stream Metrics Per Camera

| Metric | Description |
|--------|-------------|
| `streamLength` | Current number of entries in stream |
| `droppedFrames` | Total frames dropped (lifetime counter) |
| `lastFrameTimestamp` | Timestamp of most recent frame |
| `pendingFrames` | Reserved for future use (currently 0) |

### API Endpoints

**Get metrics:**
```bash
GET /api/v1/cameras/:cameraId/metrics?tenantId={tenantId}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cameraId": "cam-456",
    "tenantId": "company-123",
    "streamLength": 5,
    "pendingFrames": 0,
    "droppedFrames": 2,
    "lastFrameTimestamp": "2024-01-15T10:30:00.000Z",
    "maxStreamLength": 20,
    "backpressureThreshold": 10
  }
}
```

### Health Check

Health check endpoint includes Redis connection status:
```bash
GET /health
```

**Response includes:**
```json
{
  "checks": {
    "redis": {
      "status": "healthy",
      "connected": true
    }
  }
}
```

## Performance Considerations

### Stream Trimming

- **Approximate trimming (`~`)**: Better performance, slight length variation
- **Exact trimming (`=`)**: Guarantees exact length, slower
- **Current implementation**: Uses `~` for performance

### Frame Reference Size Impact

- Frame references (file paths) are ~100-200 bytes
- No binary data stored in Redis
- Total storage per entry: ~100-200 bytes
- Max stream size (20 entries): ~2-4 KB per camera
- **Memory reduction: ~99% compared to storing Base64-encoded frames**

### Redis Memory

- Minimal memory usage per camera (~2-4 KB per stream)
- Can handle thousands of cameras with minimal Redis memory
- Monitor Redis memory usage (should be very low)
- Old streams can be manually deleted if needed

### File System Considerations

- Frame files are stored on local filesystem: `/tmp/frames/{cameraId}/`
- For distributed systems, use shared storage (NFS, S3, etc.)
- Files can be served via HTTP for remote access
- Implement file cleanup/rotation policies to prevent disk space issues

## Troubleshooting

### Frames Not Appearing in Stream

1. **Check Redis connection**: Verify `/health` endpoint shows Redis as connected
2. **Check frame watcher**: Ensure frame watcher is running (check logs)
3. **Check stream key**: Verify key format matches expected pattern
4. **Check backpressure**: Stream length might be >= 10 (frames dropped)

### High Drop Rate

1. **Consumer not processing**: Ensure downstream service is consuming frames
2. **Stream length check**: Verify current stream length via metrics endpoint
3. **Backpressure threshold**: Consider increasing threshold (trade-off: more memory)

### Redis Connection Issues

1. **Check configuration**: Verify `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
2. **Check network**: Ensure Redis is accessible from service
3. **Check Redis logs**: Review Redis server logs for errors
4. **Retry logic**: Service automatically retries connection

## Best Practices

1. **Use Consumer Groups**: For multiple workers processing same stream
2. **Acknowledge Processing**: Use `XACK` after processing entries
3. **Monitor Metrics**: Track stream length and dropped frames
4. **Handle Failures**: Implement retry logic in consumers
5. **Clean Old Streams**: Delete streams for removed cameras

## Future Enhancements

- Consumer group support for parallel processing
- Stream TTL for automatic cleanup
- Compression for frame data
- Frame deduplication
- Multi-format support (not just JPEG)

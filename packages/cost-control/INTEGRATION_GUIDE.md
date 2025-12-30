# Cost Control Integration Guide

Guide for integrating cost control components into services.

## Camera Ingest Service

### Integration Steps

1. **Import FPS Controller**:
```typescript
import { FPSController } from './fps-controller';
```

2. **Initialize in Camera Manager**:
```typescript
private fpsController = new FPSController();

// Use dynamic FPS based on load
getCurrentFPS(frameBacklog?: number): number {
  return this.fpsController.getCurrentFPS(frameBacklog);
}
```

3. **Update FFmpeg Manager to Use Dynamic FPS**:
```typescript
// In spawnFFmpeg, use dynamic FPS:
const dynamicFPS = fpsController.getCurrentFPS(frameBacklog);
const ffmpegArgs = [
  '-vf', `fps=${dynamicFPS}`,
  // ... other args
];
```

## Detection Service

### Integration Steps

1. **Import GPU Saturation Handler**:
```python
from gpu_saturation_handler import GPUSaturationHandler

# Initialize
gpu_saturation_handler = GPUSaturationHandler.from_env()
```

2. **Integrate in Processing Loop**:
```python
# In process_frames_loop, before processing frame:
if gpu_saturation_handler.should_drop_frame(current_lag, device):
    # Drop frame, increment metric
    frames_dropped_total.labels(
        tenant_id=tenant_id,
        camera_id=camera_id,
        reason='gpu_saturation'
    ).inc()
    continue  # Skip processing
```

## Alert Orchestrator Service

### Integration Steps

1. **Import SMS Rate Limiter**:
```python
from sms_rate_limiter import SMSRateLimiter

# Initialize
sms_rate_limiter = SMSRateLimiter.from_env(redis_client)
```

2. **Integrate in Alert Sending**:
```python
# Before sending SMS:
is_allowed, reason, remaining = sms_rate_limiter.is_allowed(tenant_id)
if not is_allowed:
    logger.warning(
        f"SMS rate limit exceeded",
        extra={
            'tenant_id': tenant_id,
            'reason': reason,
            'remaining': remaining
        }
    )
    # Use fallback channel (email, WebSocket)
    return False
```

## Snapshot Service

### Integration Steps

1. **Import Storage Limit Manager**:
```python
from storage_limit_manager import StorageLimitManager

# Initialize
storage_limit_manager = StorageLimitManager(
    s3_storage=s3_storage,
    config=None  # Uses env vars
)
```

2. **Integrate in Snapshot Capture**:
```python
# Before capturing snapshot:
if not storage_limit_manager.is_snapshot_allowed():
    logger.warning(
        "Snapshot disabled due to storage limit",
        extra=storage_limit_manager.get_storage_status()
    )
    # Skip snapshot capture
    return None
```

## Configuration

Set environment variables for each service:

```bash
# FPS Control (Camera Ingest)
FPS_CONTROL_MIN=0.5
FPS_CONTROL_MAX=10.0
FPS_CONTROL_REDUCTION_FACTOR=0.5
FPS_CONTROL_CPU_THRESHOLD=0.8
FPS_CONTROL_MEMORY_THRESHOLD=0.8
FPS_CONTROL_BACKLOG_THRESHOLD=15

# GPU Saturation (Detection)
GPU_SATURATION_LAG_WARNING=100
GPU_SATURATION_LAG_CRITICAL=500
GPU_SATURATION_DROP_PROB_100=0.1
GPU_SATURATION_DROP_PROB_500=0.5
GPU_SATURATION_MAX_DROP=0.9

# SMS Cap (Alert Orchestrator)
SMS_CAP_HOURLY=100
SMS_CAP_DAILY=1000
SMS_CAP_WARNING_HOURLY=0.8
SMS_CAP_WARNING_DAILY=0.8

# Storage Limit (Snapshot)
SNAPSHOT_STORAGE_MAX_BYTES=1000000000000  # 1TB
SNAPSHOT_STORAGE_WARNING=0.8
SNAPSHOT_STORAGE_DISABLE=0.95
SNAPSHOT_STORAGE_CHECK_INTERVAL=300
```


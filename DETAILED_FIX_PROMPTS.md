# Detailed Fix Prompts for Missing Functionality

This document provides step-by-step implementation instructions for all missing or partial functionality identified in the verification checklist.

---

## 1. GPU Saturation Handler Integration (Detection Service)

### Status
❌ **FAIL** - Component exists but not integrated

### Service
Detection Service (`services/detection-service`)

### Feature Description
Integrate GPU saturation handler to drop frames probabilistically when GPU lag exceeds thresholds.

### Expected Behavior
- Before processing each frame in GPU mode, check if frame should be dropped
- Drop probability increases with GPU lag (10% at 100 lag, 50% at 500 lag)
- Increment `frames_dropped_total{reason="gpu_saturation"}` metric
- Log dropped frames with structured logging

### Step-by-Step Implementation

#### Step 1: Import GPU Saturation Handler

**File**: `services/detection-service/src/main.py`

**Location**: After other imports (around line 25)

**Change**:
```python
from gpu_saturation_handler import GPUSaturationHandler
```

#### Step 2: Initialize Handler

**File**: `services/detection-service/src/main.py`

**Location**: In `main()` function, after model loading (around line 485)

**Change**:
```python
# Initialize GPU saturation handler
gpu_saturation_handler = GPUSaturationHandler.from_env()
logger.info("GPU saturation handler initialized")
```

#### Step 3: Integrate into Processing Loop

**File**: `services/detection-service/src/main.py`

**Location**: In `process_frames_loop()` function, before frame processing (around line 190, inside the loop where frames are collected)

**Change**:
```python
# GPU saturation check (before processing)
if model_manager.is_gpu():
    current_lag = stream_length  # Already available from earlier in loop
    device = model_manager.device_str
    
    if gpu_saturation_handler.should_drop_frame(current_lag, device):
        frames_dropped_total.labels(
            tenant_id=tenant_id,
            camera_id=camera_id,
            reason='gpu_saturation'
        ).inc()
        logger.warning(
            "Frame dropped due to GPU saturation",
            extra={
                'camera_id': camera_id,
                'tenant_id': tenant_id,
                'lag': current_lag,
                'device': device
            }
        )
        continue  # Skip this frame
```

**Exact Location**: After line 188 (after pending_frames.append), add the check before the frame processing logic starts.

#### Step 4: Make Handler Available Globally

**File**: `services/detection-service/src/main.py`

**Location**: At top of file with other global variables (around line 81)

**Change**:
```python
gpu_saturation_handler: Optional[GPUSaturationHandler] = None
```

**Update initialization** (in main() around line 485):
```python
global gpu_saturation_handler
gpu_saturation_handler = GPUSaturationHandler.from_env()
```

**Update process_frames_loop signature** (around line 105):
```python
def process_frames_loop():
    global gpu_saturation_handler
    # ... rest of function
```

### Files to Modify
- `services/detection-service/src/main.py`

### Integration Verification Instructions

1. **Unit Test**:
   ```python
   # Test that handler is called
   # Set GPU lag to 300, verify drop probability is ~30%
   ```

2. **Integration Test**:
   - Start Detection Service with GPU mode
   - Simulate high GPU lag (>100 entries)
   - Verify frames are dropped
   - Check `frames_dropped_total{reason="gpu_saturation"}` metric increments

3. **Manual Verification**:
   - Monitor logs for "Frame dropped due to GPU saturation"
   - Check Prometheus metrics for `frames_dropped_total{reason="gpu_saturation"}`

### References
- Component: `services/detection-service/src/gpu_saturation_handler.py`
- Main loop: `services/detection-service/src/main.py` (process_frames_loop function)
- Metrics: `services/detection-service/src/main.py` (frames_dropped_total)

---

## 2. Dead-Letter Queue Implementation (Detection Service)

### Status
❌ **FAIL** - Completely missing

### Service
Detection Service (`services/detection-service`)

### Feature Description
Implement dead-letter queue for messages that fail processing after maximum retries.

### Expected Behavior
- Track retry count per message ID in Redis
- After 3 retries, move message to DLQ stream: `detections:raw:dlq`
- DLQ entry includes: original stream, message_id, message_data, error, retry_count, timestamp
- Increment metric: `messages_dlq_total{stream, error_type}`
- ACK original message after moving to DLQ

### Step-by-Step Implementation

#### Step 1: Add DLQ Metric

**File**: `services/detection-service/src/main.py`

**Location**: With other Prometheus metrics (around line 70)

**Change**:
```python
messages_dlq_total = Counter(
    'messages_dlq_total',
    'Total messages sent to DLQ',
    ['stream', 'error_type']
)
```

#### Step 2: Create DLQ Producer

**File**: `services/detection-service/src/redis_producer.py`

**Location**: Add new method to `DetectionProducer` class

**Change**:
```python
def publish_to_dlq(
    self,
    original_stream: str,
    message_id: str,
    message_data: Dict,
    error: str,
    retry_count: int
) -> Optional[str]:
    """
    Publish message to dead-letter queue.
    
    Args:
        original_stream: Original stream key
        message_id: Original message ID
        message_data: Original message data
        error: Error that caused failure
        retry_count: Number of retries attempted
        
    Returns:
        DLQ message ID if successful, None otherwise
    """
    import time
    import json
    
    dlq_stream = f"{original_stream}:dlq"
    
    try:
        dlq_entry = {
            'original_stream': original_stream,
            'original_message_id': message_id,
            'message_data': json.dumps(message_data),
            'error': error,
            'retry_count': str(retry_count),
            'timestamp': str(time.time())
        }
        
        dlq_message_id = self.redis.xadd(
            dlq_stream,
            {k: str(v) for k, v in dlq_entry.items()},
            maxlen=10000,  # Keep last 10k DLQ messages
            approximate=True
        )
        
        logger.warning(
            f"Message moved to DLQ",
            extra={
                'original_stream': original_stream,
                'original_message_id': message_id,
                'dlq_stream': dlq_stream,
                'retry_count': retry_count,
                'error': error
            }
        )
        
        return dlq_message_id.decode('utf-8') if isinstance(dlq_message_id, bytes) else dlq_message_id
        
    except Exception as e:
        logger.error(f"Failed to publish to DLQ: {e}", exc_info=True)
        return None
```

#### Step 3: Add Retry Tracking to Consumer

**File**: `services/detection-service/src/redis_consumer.py`

**Location**: Add methods to `FrameConsumer` class

**Change**:
```python
def get_retry_count(self, message_id: str) -> int:
    """Get retry count for message"""
    try:
        retry_key = f"retry:detection:{message_id}"
        count = self.redis.get(retry_key)
        return int(count) if count else 0
    except Exception:
        return 0

def increment_retry_count(self, message_id: str, max_retries: int = 3) -> int:
    """Increment retry count, return new count"""
    try:
        retry_key = f"retry:detection:{message_id}"
        count = self.redis.incr(retry_key)
        self.redis.expire(retry_key, 3600)  # Expire after 1 hour
        return count
    except Exception:
        return 0

def clear_retry_count(self, message_id: str) -> None:
    """Clear retry count on success"""
    try:
        retry_key = f"retry:detection:{message_id}"
        self.redis.delete(retry_key)
    except Exception:
        pass
```

#### Step 4: Integrate DLQ into Processing Loop

**File**: `services/detection-service/src/main.py`

**Location**: In `process_frames_loop()`, wrap frame processing in try-except with retry tracking

**Change**: Replace the frame processing section (around line 257-323) with:

```python
# CPU MODE: Sequential processing (no batching)
for frame_ref, tenant_id, camera_id, camera_key in pending_frames:
    # Update processed sequence tracking
    processed_sequences[camera_key] = frame_ref['sequence']
    
    # Get message ID for retry tracking (from frame_ref if available)
    message_id = frame_ref.get('message_id', f"{camera_id}:{frame_ref['sequence']}")
    stream_key = f"frames:tenant:{tenant_id}:camera:{camera_id}"
    
    try:
        # Process frame sequentially
        detection_result = processor.process_frame(
            frame_path=frame_ref['frame_path'],
            camera_id=camera_id,
            tenant_id=tenant_id,
            sequence=frame_ref['sequence'],
            timestamp=frame_ref['timestamp']
        )
        
        if detection_result is None:
            # Processing skipped (rate limited or error)
            frames_processed_total.labels(status='skipped', model_name=model_name_label, device=device_label).inc()
            consumer.clear_retry_count(message_id)  # Clear retry on skip
            continue
        
        # Publish detection result
        pub_message_id = producer.publish_detection(
            tenant_id=tenant_id,
            camera_id=camera_id,
            detection_result=detection_result
        )
        
        if pub_message_id:
            frames_processed_total.labels(status='success', model_name=model_name_label, device=device_label).inc()
            inference_latency_ms.labels(model_name=model_name_label, device=device_label).observe(detection_result.get('inference_latency_ms', 0))
            consumer.clear_retry_count(message_id)  # Clear retry on success
        else:
            # Publishing failed - increment retry
            retry_count = consumer.increment_retry_count(message_id)
            if retry_count >= 3:  # Max retries
                # Move to DLQ
                producer.publish_to_dlq(
                    original_stream=stream_key,
                    message_id=message_id,
                    message_data=frame_ref,
                    error="publish_failed",
                    retry_count=retry_count
                )
                messages_dlq_total.labels(stream=stream_key, error_type="publish_failed").inc()
                # ACK original message
                consumer.acknowledge_frame(tenant_id, camera_id, message_id)
            frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc()
        
    except Exception as e:
        logger.error(
            f"Error processing frame",
            extra={
                'camera_id': camera_id,
                'sequence': frame_ref.get('sequence'),
                'error': str(e),
            },
            exc_info=True
        )
        
        # Increment retry count
        retry_count = consumer.increment_retry_count(message_id)
        
        if retry_count >= 3:  # Max retries
            # Move to DLQ
            error_type = type(e).__name__
            producer.publish_to_dlq(
                original_stream=stream_key,
                message_id=message_id,
                message_data=frame_ref,
                error=str(e),
                retry_count=retry_count
            )
            messages_dlq_total.labels(stream=stream_key, error_type=error_type).inc()
            # ACK original message
            consumer.acknowledge_frame(tenant_id, camera_id, message_id)
        else:
            frames_processed_total.labels(status='failed', model_name=model_name_label, device=device_label).inc()
        
        continue
```

**Note**: You'll also need to add `acknowledge_frame()` method to `FrameConsumer` if it doesn't exist, or use existing ACK mechanism.

#### Step 5: Add Acknowledge Method to Consumer (if needed)

**File**: `services/detection-service/src/redis_consumer.py`

**Location**: Add method to `FrameConsumer` class

**Change**:
```python
def acknowledge_frame(self, tenant_id: str, camera_id: str, message_id: str) -> None:
    """Acknowledge a specific message ID"""
    stream_key = f"{self.stream_prefix}{tenant_id}:camera:{camera_id}"
    try:
        self.redis.xack(stream_key, "default-group", message_id)  # Adjust consumer group name as needed
    except Exception as e:
        logger.error(f"Failed to acknowledge message {message_id}: {e}")
```

### Files to Modify
- `services/detection-service/src/main.py`
- `services/detection-service/src/redis_producer.py`
- `services/detection-service/src/redis_consumer.py`

### Integration Verification Instructions

1. **Unit Test**:
   - Create test message with retry count = 3
   - Verify message moves to DLQ
   - Verify metric increments

2. **Integration Test**:
   - Inject frame that fails processing 3 times
   - Verify message appears in `detections:raw:dlq` stream
   - Verify `messages_dlq_total` metric increments
   - Verify original message is ACKed

3. **Manual Verification**:
   - Monitor Redis for DLQ stream: `detections:raw:dlq`
   - Check Prometheus metrics for `messages_dlq_total`
   - Verify logs show "Message moved to DLQ"

### References
- Redis Producer: `services/detection-service/src/redis_producer.py`
- Redis Consumer: `services/detection-service/src/redis_consumer.py`
- Main Loop: `services/detection-service/src/main.py` (process_frames_loop)

---

## 3. Dead-Letter Queue Implementation (Violation Engine Service)

### Status
❌ **FAIL** - Completely missing

### Service
Violation Engine Service (`services/violation-engine-service`)

### Feature Description
Implement dead-letter queue for detection events that fail violation processing after maximum retries.

### Expected Behavior
- Track retry count per message ID
- After 3 retries, move message to DLQ: `detections:raw:dlq`
- DLQ entry includes: original stream, message_id, event_data, error, retry_count, timestamp
- Increment metric: `messages_dlq_total{stream, error_type}`
- ACK original message

### Step-by-Step Implementation

Follow similar pattern to Detection Service DLQ implementation:

#### Step 1: Add DLQ Metric

**File**: `services/violation-engine-service/src/main.py` (or create metrics file)

**Change**: Add Prometheus Counter:
```python
messages_dlq_total = Counter(
    'messages_dlq_total',
    'Total messages sent to DLQ',
    ['stream', 'error_type']
)
```

#### Step 2: Add Retry Tracking

**File**: `services/violation-engine-service/src/redis_consumer.py`

Add methods similar to Detection Service consumer.

#### Step 3: Add DLQ Publisher

**File**: `services/violation-engine-service/src/violation_producer.py` (or create new DLQ producer)

Add `publish_to_dlq()` method.

#### Step 4: Integrate into Processor

**File**: `services/violation-engine-service/src/processor.py`

Wrap processing in try-except, track retries, move to DLQ after 3 retries.

### Files to Modify
- `services/violation-engine-service/src/main.py` (or metrics file)
- `services/violation-engine-service/src/redis_consumer.py`
- `services/violation-engine-service/src/violation_producer.py`
- `services/violation-engine-service/src/processor.py`

### Integration Verification Instructions

Same as Detection Service DLQ (see section 2).

---

## 4. Snapshot Fetch API Endpoint

### Status
❌ **FAIL** - Endpoint missing

### Service
Snapshot Service (`services/snapshot-service`)

### Feature Description
Add API endpoint to fetch snapshot metadata and signed URLs for a violation.

### Expected Behavior
- Endpoint: `GET /snapshots/violation/{violation_id}`
- Query params: `tenant_id` (required for security), `ttl_seconds` (optional, default 3600)
- Returns: JSON array of snapshots with signed URLs
- 404 if no snapshots found
- 403 if tenant_id doesn't match

### Step-by-Step Implementation

#### Step 1: Add FastAPI Import

**File**: `services/snapshot-service/src/main.py`

**Location**: Update imports (currently uses simple service class, need to add FastAPI)

**Change**: Add FastAPI if not already present:
```python
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import JSONResponse
```

#### Step 2: Create FastAPI App (if not exists)

**File**: `services/snapshot-service/src/main.py`

**Location**: Before SnapshotService class definition

**Change**: Create FastAPI app:
```python
app = FastAPI(title="Snapshot Service")

# Keep existing SnapshotService for background processing
```

#### Step 3: Add Snapshot Fetch Endpoint

**File**: `services/snapshot-service/src/main.py`

**Location**: After app creation, before SnapshotService class

**Change**: Add endpoint:
```python
@app.get("/snapshots/violation/{violation_id}")
async def get_violation_snapshots(
    violation_id: str,
    tenant_id: str = Query(..., description="Tenant ID for security check"),
    ttl_seconds: int = Query(3600, description="TTL for signed URLs in seconds")
):
    """
    Get snapshots for a violation with signed URLs.
    
    Returns list of snapshots (snapshot + clip if available).
    """
    try:
        # Get snapshots from repository
        # Note: Need to pass repository instance - may need to refactor main() to expose it
        snapshots = snapshot_repository.get_snapshots_by_violation(violation_id)
        
        if not snapshots:
            raise HTTPException(status_code=404, detail="No snapshots found for violation")
        
        # Security check: verify tenant_id matches
        if snapshots[0].tenant_id != tenant_id:
            raise HTTPException(status_code=403, detail="Access denied: tenant_id mismatch")
        
        # Generate signed URLs
        result = []
        for snapshot in snapshots:
            signed_url = s3_storage.generate_signed_url(
                snapshot.s3_key,
                expiration_seconds=ttl_seconds
            )
            result.append({
                'snapshot_id': snapshot.snapshot_id,
                'snapshot_type': snapshot.snapshot_type,
                'signed_url': signed_url,
                'captured_at': snapshot.captured_at.isoformat(),
                'file_size_bytes': snapshot.file_size_bytes,
                'content_type': snapshot.content_type
            })
        
        return JSONResponse(result)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching snapshots: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))
```

#### Step 4: Refactor Main to Expose Repository and S3 Storage

**File**: `services/snapshot-service/src/main.py`

**Change**: Make repository and s3_storage accessible to FastAPI endpoints:

**Option A**: Store as module-level variables (simpler):
```python
snapshot_repository = None
s3_storage = None

def main():
    global snapshot_repository, s3_storage
    # ... existing initialization code ...
    snapshot_repository = SnapshotRepository(db_pool)
    s3_storage = S3Storage(...)
```

**Option B**: Use dependency injection (more complex but cleaner)

#### Step 5: Run FastAPI Server

**File**: `services/snapshot-service/src/main.py`

**Location**: At end of `main()` function

**Change**: Add FastAPI server alongside SnapshotService:
```python
import uvicorn
import threading

# Start background service in thread
service = SnapshotService(redis_client, snapshot_processor, retention_worker)
service_thread = threading.Thread(target=service.start, daemon=True)
service_thread.start()

# Start FastAPI server
api_port = int(os.getenv('API_PORT', '8080'))
uvicorn.run(app, host='0.0.0.0', port=api_port)
```

### Files to Modify
- `services/snapshot-service/src/main.py`

### Integration Verification Instructions

1. **Unit Test**:
   - Mock repository and S3 storage
   - Test endpoint returns correct JSON
   - Test 404 for no snapshots
   - Test 403 for tenant mismatch

2. **Integration Test**:
   - Create violation with snapshots
   - Call endpoint with correct tenant_id
   - Verify signed URLs are valid and accessible
   - Verify TTL is respected

3. **Manual Verification**:
   ```bash
   curl "http://localhost:8080/snapshots/violation/abc-123?tenant_id=tenant-456&ttl_seconds=7200"
   ```

### References
- Repository: `services/snapshot-service/src/snapshot_repository.py` (get_snapshots_by_violation method exists)
- S3 Storage: `services/snapshot-service/src/s3_storage.py` (generate_signed_url method exists)
- Main: `services/snapshot-service/src/main.py`

---

## 5. Storage Limit Manager Integration (Snapshot Service)

### Status
❌ **FAIL** - Component exists but not integrated

### Service
Snapshot Service (`services/snapshot-service`)

### Feature Description
Check storage limits before capturing snapshots and disable capture if limit exceeded.

### Expected Behavior
- Before snapshot capture, check if storage limit exceeded
- If storage > 95% of limit, skip snapshot capture
- Log warning when storage limit exceeded
- Return early from processing with reason

### Step-by-Step Implementation

#### Step 1: Import Storage Limit Manager

**File**: `services/snapshot-service/src/main.py`

**Location**: With other imports

**Change**:
```python
from .storage_limit_manager import StorageLimitManager
```

#### Step 2: Initialize Storage Limit Manager

**File**: `services/snapshot-service/src/main.py`

**Location**: In `main()` function, after s3_storage initialization (around line 243)

**Change**:
```python
storage_limit_manager = StorageLimitManager(
    s3_storage=s3_storage,
    config=None  # Uses env vars
)
```

#### Step 3: Pass to Snapshot Processor

**File**: `services/snapshot-service/src/main.py`

**Location**: Update SnapshotProcessor initialization (around line 247)

**Change**: Update SnapshotProcessor to accept storage_limit_manager, or check in main before processing.

**Option A**: Check in SnapshotService before processing (simpler):
```python
# In SnapshotService._process_batch(), before processing:
if not storage_limit_manager.is_snapshot_allowed():
    logger.warning(
        "Snapshot disabled due to storage limit",
        extra=storage_limit_manager.get_storage_status()
    )
    # Acknowledge message but skip processing
    message_ids_to_ack.append(state_change.message_id)
    continue
```

**Option B**: Pass to SnapshotProcessor and check inside (cleaner):
```python
# Update SnapshotProcessor.__init__ to accept storage_limit_manager
# Update SnapshotProcessor.process_violation_state_change() to check before capture
```

#### Step 4: Update Snapshot Processor (Option B)

**File**: `services/snapshot-service/src/snapshot_processor.py`

**Location**: Update `__init__` method (around line 26)

**Change**:
```python
def __init__(
    self,
    snapshot_capture: SnapshotCapture,
    s3_storage: S3Storage,
    snapshot_repository: SnapshotRepository,
    storage_limit_manager: Optional[StorageLimitManager] = None,  # Add this
    capture_clips: bool = True,
    signed_url_ttl_seconds: int = 3600
):
    # ... existing code ...
    self.storage_limit_manager = storage_limit_manager
```

**Location**: Update `process_violation_state_change` method (around line 50)

**Change**: Add check at start:
```python
def process_violation_state_change(
    self,
    state_change: ViolationStateChange
) -> dict:
    result = {
        'violation_id': state_change.violation_id,
        'snapshot_captured': False,
        'clip_captured': False,
        'snapshot_url': None,
        'clip_url': None,
        'error': None
    }
    
    # Check storage limit before capture
    if self.storage_limit_manager and not self.storage_limit_manager.is_snapshot_allowed():
        logger.warning(
            "Snapshot disabled due to storage limit",
            extra=self.storage_limit_manager.get_storage_status()
        )
        result['error'] = 'storage_limit_exceeded'
        return result
    
    # ... rest of existing code ...
```

#### Step 5: Update Main to Pass Manager

**File**: `services/snapshot-service/src/main.py`

**Location**: SnapshotProcessor initialization (around line 247)

**Change**:
```python
snapshot_processor = SnapshotProcessor(
    snapshot_capture=snapshot_capture,
    s3_storage=s3_storage,
    snapshot_repository=snapshot_repository,
    storage_limit_manager=storage_limit_manager,  # Add this
    capture_clips=capture_clips,
    signed_url_ttl_seconds=signed_url_ttl_seconds
)
```

### Files to Modify
- `services/snapshot-service/src/main.py`
- `services/snapshot-service/src/snapshot_processor.py`

### Integration Verification Instructions

1. **Unit Test**:
   - Mock storage_limit_manager to return False
   - Verify snapshot capture is skipped
   - Verify error reason is set

2. **Integration Test**:
   - Set storage limit to low value
   - Trigger snapshot capture
   - Verify snapshot is skipped
   - Verify warning logged

3. **Manual Verification**:
   - Set `SNAPSHOT_STORAGE_MAX_BYTES` to simulate limit
   - Trigger violation
   - Check logs for "Snapshot disabled due to storage limit"
   - Verify no snapshot files created

### References
- Component: `services/snapshot-service/src/storage_limit_manager.py`
- Processor: `services/snapshot-service/src/snapshot_processor.py`
- Main: `services/snapshot-service/src/main.py`

---

## 6. SMS Rate Limiter Integration (Alert Orchestrator Service)

### Status
❌ **FAIL** - Component exists but not integrated

### Service
Alert Orchestrator Service (`services/alert-orchestrator-service`)

### Feature Description
Check SMS rate limits before sending SMS alerts and fallback to email if limit exceeded.

### Expected Behavior
- Before sending SMS, check if tenant has exceeded hourly/daily limits
- If limit exceeded, fallback to email channel
- Log rate limit event
- Increment `alerts_rate_limited_total` metric

### Step-by-Step Implementation

#### Step 1: Import SMS Rate Limiter

**File**: `services/alert-orchestrator-service/src/main.py`

**Location**: With other imports

**Change**:
```python
from .sms_rate_limiter import SMSRateLimiter
```

#### Step 2: Initialize SMS Rate Limiter

**File**: `services/alert-orchestrator-service/src/main.py`

**Location**: In `main()` function, after Redis client initialization

**Change**:
```python
sms_rate_limiter = SMSRateLimiter.from_env(redis_client)
```

#### Step 3: Pass to Alert Orchestrator

**File**: `services/alert-orchestrator-service/src/main.py`

**Location**: AlertOrchestrator initialization

**Change**: Update AlertOrchestrator.__init__ to accept sms_rate_limiter, or check in main before calling orchestrator.

**Option A**: Check in main before calling orchestrator (simpler)

**Option B**: Pass to AlertOrchestrator and check inside (cleaner) - recommended

#### Step 4: Update Alert Orchestrator

**File**: `services/alert-orchestrator-service/src/alert_orchestrator.py`

**Location**: Update `__init__` method (around line 31)

**Change**:
```python
def __init__(
    self,
    channels: Dict[str, AlertChannel],
    rate_limiter: RateLimiter,
    escalation_manager: EscalationManager,
    retry_handler: RetryHandler,
    failure_logger: FailureLogger,
    sms_rate_limiter: Optional[SMSRateLimiter] = None  # Add this
):
    # ... existing code ...
    self.sms_rate_limiter = sms_rate_limiter
```

**Location**: Update `send_alert` method (around line 154, inside channel loop)

**Change**: Add SMS rate limit check:
```python
for channel_name in target_channels:
    if channel_name not in self.channels:
        logger.warning(f"Channel {channel_name} not available")
        continue
    
    # SMS rate limiting check
    if channel_name == 'sms' and self.sms_rate_limiter:
        is_allowed, reason, remaining = self.sms_rate_limiter.is_allowed(tenant_id)
        if not is_allowed:
            logger.warning(
                f"SMS rate limit exceeded, falling back to email",
                extra={
                    'tenant_id': tenant_id,
                    'reason': reason,
                    'remaining': remaining
                }
            )
            # Fallback to email
            if 'email' in self.channels:
                channel_name = 'email'
            else:
                logger.error("SMS rate limited and email channel not available")
                result['errors'].append(f"SMS rate limited ({reason}) and no fallback")
                continue
    
    channel = self.channels[channel_name]
    # ... rest of existing code ...
```

#### Step 5: Update Main to Pass Rate Limiter

**File**: `services/alert-orchestrator-service/src/main.py`

**Location**: AlertOrchestrator initialization

**Change**:
```python
alert_orchestrator = AlertOrchestrator(
    channels=channels,
    rate_limiter=rate_limiter,
    escalation_manager=escalation_manager,
    retry_handler=retry_handler,
    failure_logger=failure_logger,
    sms_rate_limiter=sms_rate_limiter  # Add this
)
```

### Files to Modify
- `services/alert-orchestrator-service/src/main.py`
- `services/alert-orchestrator-service/src/alert_orchestrator.py`

### Integration Verification Instructions

1. **Unit Test**:
   - Mock sms_rate_limiter to return False
   - Verify fallback to email occurs
   - Verify warning logged

2. **Integration Test**:
   - Send 101 SMS alerts (exceed hourly limit of 100)
   - Verify 101st falls back to email
   - Verify rate limit metric increments

3. **Manual Verification**:
   - Monitor logs for "SMS rate limit exceeded, falling back to email"
   - Check Redis for rate limit keys: `sms_limit:hourly:{tenant_id}`
   - Verify email alerts sent when SMS limit exceeded

### References
- Component: `services/alert-orchestrator-service/src/sms_rate_limiter.py`
- Orchestrator: `services/alert-orchestrator-service/src/alert_orchestrator.py`
- Main: `services/alert-orchestrator-service/src/main.py`

---

## 7. FPS Controller Integration (Camera Ingest Service)

### Status
❌ **FAIL** - Component exists but not integrated

### Service
Camera Ingest Service (`services/camera-ingest-service`)

### Feature Description
Integrate FPS controller to dynamically adjust frame rate based on system load.

### Expected Behavior
- Periodically check system load (CPU, memory, frame backlog)
- Reduce FPS when load detected (CPU > 80%, memory > 80%, backlog > 15)
- Increase FPS when load decreases
- Restart FFmpeg with new FPS when changed

### Step-by-Step Implementation

#### Step 1: Import FPS Controller

**File**: `services/camera-ingest-service/src/camera-manager.ts`

**Location**: At top with other imports

**Change**:
```typescript
import { FPSController } from './fps-controller';
```

#### Step 2: Initialize FPS Controller

**File**: `services/camera-ingest-service/src/camera-manager.ts`

**Location**: In CameraManager class, as private property

**Change**:
```typescript
private fpsController: FPSController;

constructor(logger: Logger) {
  // ... existing code ...
  this.fpsController = new FPSController();
}
```

#### Step 3: Add Method to Get Current FPS

**File**: `services/camera-ingest-service/src/camera-manager.ts`

**Location**: Add method to CameraManager class

**Change**:
```typescript
getCurrentFPS(cameraId: string): number {
  // Get frame backlog for camera (if available)
  const frameBacklog = this.getFrameBacklog(cameraId);  // Need to implement this or get from Redis
  
  // Get current FPS based on system load
  return this.fpsController.getCurrentFPS(frameBacklog);
}

private getFrameBacklog(cameraId: string): number | undefined {
  // Option 1: Get from Redis stream length
  // Option 2: Track locally
  // For now, return undefined (controller will use CPU/memory only)
  return undefined;
}
```

#### Step 4: Add Update Loop for FPS

**File**: `services/camera-ingest-service/src/camera-manager.ts`

**Location**: Add periodic FPS check (in existing update loop or new interval)

**Change**: Add method to update FPS for all cameras:
```typescript
private updateCameraFPS(): void {
  for (const [cameraId, state] of this.cameras.entries()) {
    if (state.status !== CameraStatus.RUNNING) {
      continue;
    }
    
    const currentFPS = this.getCurrentFPS(cameraId);
    const configuredFPS = state.config.fps || 1;
    
    // Update if FPS changed significantly (>10% difference)
    if (Math.abs(currentFPS - configuredFPS) > configuredFPS * 0.1) {
      this.logger.info('Updating camera FPS', {
        cameraId,
        oldFPS: configuredFPS,
        newFPS: currentFPS
      });
      
      // Update FFmpeg with new FPS
      this.ffmpegManager.updateFPS(cameraId, currentFPS);
      
      // Update config
      state.config.fps = currentFPS;
    }
  }
}
```

#### Step 5: Add UpdateFPS to FFmpeg Manager

**File**: `services/camera-ingest-service/src/ffmpeg-manager.ts`

**Location**: Add method to FFmpegManager class

**Change**:
```typescript
updateFPS(cameraId: string, newFPS: number): void {
  const state = this.cameras.get(cameraId);
  if (!state) {
    this.logger.warn('Camera not found for FPS update', { cameraId });
    return;
  }
  
  // Stop current process
  this.stopCamera(cameraId);
  
  // Update config
  state.config.fps = newFPS;
  
  // Restart with new FPS
  this.startCamera(state.config);
}
```

#### Step 6: Start Periodic FPS Update

**File**: `services/camera-ingest-service/src/camera-manager.ts`

**Location**: In constructor or start method

**Change**:
```typescript
// Start periodic FPS update (every 30 seconds)
this.fpsUpdateInterval = setInterval(() => {
  this.updateCameraFPS();
}, 30000);
```

**Also add cleanup**:
```typescript
shutdown(): void {
  if (this.fpsUpdateInterval) {
    clearInterval(this.fpsUpdateInterval);
  }
  // ... existing cleanup ...
}
```

### Files to Modify
- `services/camera-ingest-service/src/camera-manager.ts`
- `services/camera-ingest-service/src/ffmpeg-manager.ts`

### Integration Verification Instructions

1. **Unit Test**:
   - Mock system load (CPU > 80%)
   - Verify FPS reduces
   - Verify FFmpeg restarts with new FPS

2. **Integration Test**:
   - Start camera with high CPU load
   - Verify FPS reduces from max to min
   - Verify FFmpeg process restarts

3. **Manual Verification**:
   - Monitor logs for "Updating camera FPS"
   - Check FFmpeg process args for FPS changes
   - Monitor CPU/memory to verify triggers

### References
- Component: `services/camera-ingest-service/src/fps-controller.ts`
- Manager: `services/camera-ingest-service/src/camera-manager.ts`
- FFmpeg: `services/camera-ingest-service/src/ffmpeg-manager.ts`

---

## 8. WebRTC Integration (Streaming Service)

### Status
❌ **FAIL** - Placeholder only

### Service
Streaming Service (`services/streaming-service`)

### Feature Description
Replace WebRTC placeholder with actual WebRTC server integration (Janus Gateway recommended).

### Expected Behavior
- RTSP → WebRTC conversion functional
- WebRTC signaling endpoint operational
- WebRTC connection established and maintained
- Health monitoring tracks WebRTC status

### Step-by-Step Implementation

#### Option 1: Janus Gateway (Recommended)

**Step 1: Deploy Janus Gateway**

Deploy Janus Gateway server (Docker or native installation).

**Step 2: Update Stream Manager**

**File**: `services/streaming-service/src/stream_manager.py`

**Location**: `_start_webrtc_stream` method (around line 120)

**Change**: Replace placeholder with Janus integration:
```python
def _start_webrtc_stream(
    self,
    camera_id: str,
    rtsp_url: str
) -> Optional[subprocess.Popen]:
    """
    Start WebRTC stream using Janus Gateway.
    
    Creates Janus session, attaches RTSP plugin, and starts streaming.
    """
    try:
        import requests
        import uuid
        
        janus_url = os.getenv('JANUS_URL', 'http://localhost:8088/janus')
        
        # Create Janus session
        session_response = requests.post(
            f"{janus_url}",
            json={
                "janus": "create",
                "transaction": str(uuid.uuid4())
            },
            timeout=5
        )
        session_response.raise_for_status()
        session_data = session_response.json()
        session_id = session_data['data']['id']
        
        # Attach RTSP plugin
        handle_response = requests.post(
            f"{janus_url}/{session_id}",
            json={
                "janus": "attach",
                "plugin": "janus.plugin.streaming",
                "transaction": str(uuid.uuid4())
            },
            timeout=5
        )
        handle_response.raise_for_status()
        handle_data = handle_response.json()
        handle_id = handle_data['data']['id']
        
        # Create stream (configure RTSP source)
        create_response = requests.post(
            f"{janus_url}/{session_id}/{handle_id}",
            json={
                "janus": "message",
                "body": {
                    "request": "create",
                    "type": "rtsp",
                    "name": f"camera_{camera_id}",
                    "url": rtsp_url,
                    "video": True,
                    "audio": False
                },
                "transaction": str(uuid.uuid4())
            },
            timeout=10
        )
        create_response.raise_for_status()
        
        # Start stream
        watch_response = requests.post(
            f"{janus_url}/{session_id}/{handle_id}",
            json={
                "janus": "message",
                "body": {
                    "request": "watch",
                    "id": 1  # Stream ID from create response
                },
                "transaction": str(uuid.uuid4())
            },
            timeout=5
        )
        watch_response.raise_for_status()
        
        # Store session info for signaling
        self._webrtc_sessions[camera_id] = {
            'session_id': session_id,
            'handle_id': handle_id,
            'janus_url': janus_url
        }
        
        logger.info(
            f"WebRTC stream started via Janus",
            extra={
                'camera_id': camera_id,
                'session_id': session_id,
                'handle_id': handle_id
            }
        )
        
        # Return None (no subprocess for Janus)
        return None
        
    except Exception as e:
        logger.error(f"Failed to start WebRTC stream: {e}", exc_info=True)
        return None
```

**Step 3: Update Signaling Endpoint**

**File**: `services/streaming-service/src/main.py`

**Location**: `webrtc_endpoint` function (around line 174)

**Change**: Replace placeholder with Janus signaling:
```python
@app.route('/webrtc/<camera_id>/signaling', methods=['POST'])
def webrtc_signaling(camera_id: str):
    """
    WebRTC signaling endpoint (Janus Gateway).
    
    Handles SDP offer/answer and ICE candidates.
    """
    try:
        if camera_id not in stream_manager._webrtc_sessions:
            return jsonify({'error': 'stream_not_found'}), 404
        
        session_info = stream_manager._webrtc_sessions[camera_id]
        data = request.get_json()
        
        # Forward signaling message to Janus
        import requests
        response = requests.post(
            f"{session_info['janus_url']}/{session_info['session_id']}/{session_info['handle_id']}",
            json=data,
            timeout=5
        )
        response.raise_for_status()
        
        return jsonify(response.json()), 200
        
    except Exception as e:
        logger.error(f"Error in WebRTC signaling: {e}", exc_info=True)
        return jsonify({'error': str(e)}), 500
```

**Step 4: Add Session Storage**

**File**: `services/streaming-service/src/stream_manager.py`

**Location**: In `__init__` method

**Change**: Add session storage:
```python
self._webrtc_sessions: Dict[str, Dict] = {}
```

### Files to Modify
- `services/streaming-service/src/stream_manager.py`
- `services/streaming-service/src/main.py`

### Integration Verification Instructions

1. **Prerequisites**:
   - Deploy Janus Gateway server
   - Configure RTSP plugin
   - Set `JANUS_URL` environment variable

2. **Integration Test**:
   - Start WebRTC stream for camera
   - Verify Janus session created
   - Verify signaling endpoint responds
   - Connect WebRTC client and verify video stream

3. **Manual Verification**:
   - Call `POST /stream/{camera_id}/start` with protocol=webrtc
   - Check logs for "WebRTC stream started via Janus"
   - Test signaling endpoint with SDP offer
   - Verify WebRTC connection established

### References
- Stream Manager: `services/streaming-service/src/stream_manager.py`
- Main: `services/streaming-service/src/main.py`
- Janus Gateway: https://janus.conf.meetecho.com/

---

## Summary of All Fixes

### Priority 1 (HIGH) - Cost Control Integration
1. GPU Saturation Handler (Detection Service)
2. Storage Limit Manager (Snapshot Service)
3. SMS Rate Limiter (Alert Orchestrator)
4. FPS Controller (Camera Ingest)

### Priority 2 (HIGH) - Dead-Letter Queues
5. DLQ for Detection Service
6. DLQ for Violation Engine

### Priority 3 (MEDIUM) - Missing Endpoints
7. Snapshot Fetch API

### Priority 4 (MEDIUM) - WebRTC
8. WebRTC Server Integration

All fixes are now documented with step-by-step instructions, code examples, and verification procedures.


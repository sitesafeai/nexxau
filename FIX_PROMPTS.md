# Fix Prompts for Missing Functionality

## 1. Dead-Letter Queue for Poison Messages

### Service
Detection Service, Violation Engine Service

### Feature Description
Implement dead-letter queue (DLQ) for poison messages that fail processing after multiple retries.

### Expected Behavior
- Messages that fail processing after N retries (default: 3) are moved to DLQ
- DLQ stream: `{original_stream}:dlq` (e.g., `detections:raw:dlq`)
- DLQ entries include original message, error details, retry count, timestamp
- Metrics: `messages_dlq_total{stream, error_type}`
- Admin endpoint to inspect/replay DLQ messages

### Steps to Implement

#### Detection Service

1. **Update `redis_consumer.py`**:
   - Add `max_retries` parameter (default: 3)
   - Track retry count per message ID
   - After max retries, publish to DLQ stream instead of ACKing
   - Include original message, error, retry count in DLQ entry

2. **Create DLQ Producer**:
   ```python
   def publish_to_dlq(self, original_stream, message_id, message_data, error, retry_count):
       dlq_stream = f"{original_stream}:dlq"
       dlq_entry = {
           'original_stream': original_stream,
           'original_message_id': message_id,
           'message_data': message_data,
           'error': str(error),
           'retry_count': retry_count,
           'timestamp': time.time()
       }
       return self.redis_client.xadd(dlq_stream, dlq_entry)
   ```

3. **Add Metrics**:
   ```python
   messages_dlq_total = Counter(
       'messages_dlq_total',
       'Total messages sent to DLQ',
       ['stream', 'error_type']
   )
   ```

4. **Update Processing Loop**:
   - Wrap frame processing in try-except
   - Track retry count in Redis (key: `retry:{message_id}`)
   - On exception, increment retry count
   - If retry_count >= max_retries, publish to DLQ and ACK original

#### Violation Engine Service

1. **Update `redis_consumer.py`** (similar to Detection Service)
2. **Add DLQ producer** (same pattern)
3. **Update `processor.py`** to handle retry tracking

### Example Input/Output

**Input**: Message that fails processing 3 times
**Output**: 
- Message moved to `detections:raw:dlq`
- Original message ACKed
- Metric incremented: `messages_dlq_total{stream="detections:raw", error_type="frame_load_error"}`

### References
- Redis Streams: `services/detection-service/src/redis_consumer.py`
- Metrics: `services/detection-service/src/main.py`
- Error handling: `services/detection-service/src/main.py` (process_frames_loop)

---

## 2. Snapshot Fetch API Endpoint

### Service
Snapshot Service

### Feature Description
Add API endpoint to fetch snapshot metadata and signed URLs for a violation.

### Expected Behavior
- Endpoint: `GET /snapshots/violation/{violation_id}`
- Returns: List of snapshots with signed URLs (snapshot + clip if available)
- Signed URLs have configurable TTL (default: 1 hour)
- Returns 404 if violation has no snapshots
- Returns 403 if tenant_id doesn't match (security check)

### Steps to Implement

1. **Add FastAPI endpoint to `main.py`**:
   ```python
   from fastapi import FastAPI, HTTPException
   from fastapi.responses import JSONResponse
   
   app = FastAPI(title="Snapshot Service")
   
   @app.get("/snapshots/violation/{violation_id}")
   async def get_violation_snapshots(
       violation_id: str,
       tenant_id: str = None,  # Query param for security
       ttl_seconds: int = 3600  # Query param for URL TTL
   ):
       # Fetch snapshots from repository
       snapshots = snapshot_repository.get_snapshots_by_violation(violation_id)
       
       if not snapshots:
           raise HTTPException(status_code=404, detail="No snapshots found")
       
       # Security check
       if tenant_id and snapshots[0].tenant_id != tenant_id:
           raise HTTPException(status_code=403, detail="Access denied")
       
       # Generate signed URLs
       result = []
       for snapshot in snapshots:
           signed_url = s3_storage.generate_signed_url(
               snapshot.s3_key,
               ttl_seconds=ttl_seconds
           )
           result.append({
               'snapshot_id': snapshot.snapshot_id,
               'snapshot_type': snapshot.snapshot_type,
               'signed_url': signed_url,
               'captured_at': snapshot.captured_at.isoformat(),
               'file_size_bytes': snapshot.file_size_bytes
           })
       
       return JSONResponse(result)
   ```

2. **Add method to `snapshot_repository.py`**:
   ```python
   def get_snapshots_by_violation(self, violation_id: str) -> List[SnapshotMetadata]:
       conn = self.db_pool.getconn()
       try:
           cursor = conn.cursor(cursor_factory=RealDictCursor)
           cursor.execute("""
               SELECT * FROM violation_snapshots
               WHERE violation_id = %s
               ORDER BY captured_at DESC
           """, (violation_id,))
           rows = cursor.fetchall()
           return [SnapshotMetadata(**dict(row)) for row in rows]
       finally:
           self.db_pool.putconn(conn)
   ```

3. **Add health check endpoint**:
   ```python
   @app.get("/health")
   async def health():
       return {"status": "healthy"}
   ```

### Example Input/Output

**Input**: `GET /snapshots/violation/abc-123?tenant_id=tenant-456&ttl_seconds=7200`

**Output**:
```json
[
  {
    "snapshot_id": "snap-001",
    "snapshot_type": "snapshot",
    "signed_url": "https://s3.amazonaws.com/bucket/path?X-Amz-Signature=...",
    "captured_at": "2024-01-15T10:30:00Z",
    "file_size_bytes": 245760
  },
  {
    "snapshot_id": "snap-002",
    "snapshot_type": "clip",
    "signed_url": "https://s3.amazonaws.com/bucket/path/clip.mp4?X-Amz-Signature=...",
    "captured_at": "2024-01-15T10:30:05Z",
    "file_size_bytes": 5242880
  }
]
```

### References
- Snapshot Repository: `services/snapshot-service/src/snapshot_repository.py`
- S3 Storage: `services/snapshot-service/src/s3_storage.py`
- Main entry: `services/snapshot-service/src/main.py`

---

## 3. WebRTC Server Integration

### Service
Streaming Service

### Feature Description
Replace WebRTC placeholder with actual WebRTC server integration (Janus, Kurento, or GStreamer).

### Expected Behavior
- WebRTC streaming functional for small sites (<10 cameras)
- RTSP → WebRTC conversion via WebRTC server
- Signaling endpoint: `/webrtc/{camera_id}/signaling`
- WebRTC connection established and maintained
- Health monitoring tracks WebRTC connection status

### Steps to Implement

**Option 1: Janus Gateway (Recommended)**

1. **Install Janus Gateway**:
   - Deploy Janus Gateway server (Docker or native)
   - Configure RTSP plugin
   - Expose WebRTC API

2. **Update `stream_manager.py`**:
   ```python
   def _start_webrtc_stream(self, camera_id: str, rtsp_url: str) -> Optional[subprocess.Popen]:
       # Create Janus session
       session_id = self._create_janus_session()
       
       # Attach RTSP plugin
       handle_id = self._attach_rtsp_plugin(session_id, rtsp_url)
       
       # Start streaming
       self._start_janus_stream(session_id, handle_id)
       
       # Store session info
       self._webrtc_sessions[camera_id] = {
           'session_id': session_id,
           'handle_id': handle_id,
           'rtsp_url': rtsp_url
       }
       
       return None  # No subprocess for Janus
   ```

3. **Add Janus client methods**:
   ```python
   def _create_janus_session(self) -> str:
       response = requests.post(
           f"{self.janus_url}/janus",
           json={"janus": "create", "transaction": str(uuid.uuid4())}
       )
       return response.json()['data']['id']
   
   def _attach_rtsp_plugin(self, session_id: str, rtsp_url: str) -> str:
       # Attach RTSP plugin and configure stream
       pass
   ```

4. **Update signaling endpoint**:
   ```python
   @app.route('/webrtc/<camera_id>/signaling', methods=['POST'])
   def webrtc_signaling(camera_id: str):
       # Handle WebRTC signaling (offer/answer/ICE)
       # Forward to Janus Gateway
       pass
   ```

**Option 2: GStreamer WebRTC**

1. **Use GStreamer webrtcbin**:
   ```python
   def _start_webrtc_stream(self, camera_id: str, rtsp_url: str):
       # GStreamer pipeline: rtspsrc → webrtcbin
       gst_cmd = [
           'gst-launch-1.0',
           'rtspsrc', f'location={rtsp_url}',
           '!', 'rtph264depay',
           '!', 'h264parse',
           '!', 'webrtcbin', 'name=webrtc',
           '!', 'appsink'
       ]
       process = subprocess.Popen(gst_cmd)
       return process
   ```

### Example Input/Output

**Input**: Start WebRTC stream for camera
**Output**: 
- WebRTC session created
- Signaling endpoint available: `/webrtc/{camera_id}/signaling`
- Client connects via WebRTC

### References
- Stream Manager: `services/streaming-service/src/stream_manager.py`
- Main entry: `services/streaming-service/src/main.py`
- Janus Gateway: https://janus.conf.meetecho.com/

---

## 4. Cost Control Integration

### Service
Camera Ingest Service, Detection Service, Alert Orchestrator Service, Snapshot Service

### Feature Description
Integrate cost control components into service processing loops.

### Expected Behavior
- FPS automatically reduces under load
- GPU frames dropped when saturated
- SMS rate-limited per tenant
- Snapshots disabled when storage limit exceeded

### Steps to Implement

#### Camera Ingest Service

1. **Update `camera-manager.ts`**:
   ```typescript
   import { FPSController } from './fps-controller';
   
   private fpsController = new FPSController();
   
   // In camera update loop:
   const frameBacklog = this.getFrameBacklog(cameraId);
   const currentFPS = this.fpsController.getCurrentFPS(frameBacklog);
   
   // Update FFmpeg with new FPS if changed
   if (currentFPS !== state.config.fps) {
       this.ffmpegManager.updateFPS(cameraId, currentFPS);
   }
   ```

2. **Add `updateFPS` to `ffmpeg-manager.ts`**:
   ```typescript
   updateFPS(cameraId: string, newFPS: number): void {
       const state = this.cameras.get(cameraId);
       if (!state) return;
       
       // Restart FFmpeg with new FPS
       this.stopCamera(cameraId);
       state.config.fps = newFPS;
       this.startCamera(state.config);
   }
   ```

#### Detection Service

1. **Update `main.py`**:
   ```python
   from gpu_saturation_handler import GPUSaturationHandler
   
   # Initialize
   gpu_saturation_handler = GPUSaturationHandler.from_env()
   
   # In process_frames_loop, before processing:
   current_lag = consumer.get_stream_length(tenant_id, camera_id)
   device = model_manager.device_str
   
   if gpu_saturation_handler.should_drop_frame(current_lag, device):
       frames_dropped_total.labels(
           tenant_id=tenant_id,
           camera_id=camera_id,
           reason='gpu_saturation'
       ).inc()
       continue  # Skip frame
   ```

#### Alert Orchestrator Service

1. **Update `alert_orchestrator.py`**:
   ```python
   from sms_rate_limiter import SMSRateLimiter
   
   # Initialize
   sms_rate_limiter = SMSRateLimiter.from_env(redis_client)
   
   # Before sending SMS:
   if channel == 'sms':
       is_allowed, reason, remaining = sms_rate_limiter.is_allowed(tenant_id)
       if not is_allowed:
           logger.warning(f"SMS rate limit exceeded: {reason}")
           # Fallback to email
           channel = 'email'
   ```

#### Snapshot Service

1. **Update `snapshot_processor.py`**:
   ```python
   from storage_limit_manager import StorageLimitManager
   
   # Initialize in main.py
   storage_limit_manager = StorageLimitManager(s3_storage)
   
   # In process_violation_state_change:
   if not storage_limit_manager.is_snapshot_allowed():
       logger.warning("Snapshot disabled due to storage limit")
       return {'snapshot_captured': False, 'reason': 'storage_limit_exceeded'}
   ```

### Example Input/Output

**FPS Control**:
- Input: CPU load > 80%
- Output: FPS reduced from 10 to 5

**GPU Saturation**:
- Input: GPU lag = 300 entries
- Output: 30% of frames dropped probabilistically

**SMS Rate Limiting**:
- Input: Tenant has sent 100 SMS in last hour
- Output: SMS rejected, fallback to email

**Storage Limit**:
- Input: Storage usage = 96% of limit
- Output: Snapshots disabled, warning logged

### References
- FPS Controller: `services/camera-ingest-service/src/fps-controller.ts`
- GPU Saturation: `services/detection-service/src/gpu_saturation_handler.py`
- SMS Rate Limiter: `services/alert-orchestrator-service/src/sms_rate_limiter.py`
- Storage Limit: `services/snapshot-service/src/storage_limit_manager.py`
- Integration Guide: `packages/cost-control/INTEGRATION_GUIDE.md`

---

## Priority Recommendations

1. **HIGH**: Cost Control Integration (all services)
2. **HIGH**: Dead-Letter Queue (Detection, Violation Engine)
3. **MEDIUM**: Snapshot Fetch API
4. **MEDIUM**: WebRTC Server Integration


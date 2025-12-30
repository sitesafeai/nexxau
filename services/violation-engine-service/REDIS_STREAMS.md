# Redis Streams Schema

Documentation for Redis Stream schemas used by the Violation Engine service.

## Input Stream: detections:raw

**Stream Key:** `detections:raw`  
**Consumer Group:** `violation-engine`  
**Consumer Name:** `worker-1`, `worker-2`, etc. (per instance)

### Message Format

Each message in the stream represents a raw detection event from the Detection Service.

**Fields:**
- `cameraId` (string): Camera identifier
- `tenantId` (string): Tenant identifier
- `timestamp` (string): ISO 8601 timestamp (e.g., "2024-01-15T10:30:00.000Z")
- `detections` (JSON string): Array of detection objects
- `model` (JSON string): Model metadata

**Detection Object Format:**
```json
{
  "class": "person",
  "confidence": 0.92,
  "bbox": [100.5, 200.3, 150.7, 300.9]
}
```

**Model Metadata Format:**
```json
{
  "name": "yolov8n",
  "version": "8.0.0",
  "sha": "a1b2c3d4e5f6...",
  "device": "cpu"
}
```

### Example Message

```
ID: 1705312200000-0
Fields:
  cameraId: "camera-789"
  tenantId: "tenant-123"
  timestamp: "2024-01-15T10:30:00.000Z"
  detections: '[{"class":"person","confidence":0.92,"bbox":[100,200,150,300]}]'
  model: '{"name":"yolov8n","version":"8.0.0","sha":"abc123","device":"cpu"}'
```

### Consumer Group Configuration

- **Group Name:** `violation-engine`
- **Consumer Names:** Unique per worker instance (e.g., `worker-1`, `worker-2`)
- **Delivery Semantics:** Exactly-once per message (acknowledgement required)
- **Pending Messages:** Messages delivered but not ACKed are redelivered

### Message Acknowledgment

Messages are acknowledged (`XACK`) only after:
1. Detection event is successfully parsed
2. Violation events are generated and processed
3. State changes are published to output stream
4. All operations complete successfully

**Poison Message Handling:**
- Messages that fail parsing after multiple retries are acknowledged to prevent infinite loops
- In production, consider moving to Dead Letter Queue (DLQ) instead

## Output Stream: violations:state_changes

**Stream Key:** `violations:state_changes`  
**Max Length:** 1000 entries (approximate trimming)

### Message Format

Each message represents a violation state change event.

**Fields:**
- `violation_id` (string): Violation UUID
- `tenant_id` (string): Tenant identifier
- `worksite_id` (string): Worksite identifier
- `camera_id` (string): Camera identifier
- `violation_type` (string): Violation type (NO_HELMET, NO_VEST, NO_PPE)
- `old_state` (string): Previous state (PENDING, ACTIVE, ESCALATED, RESOLVED)
- `new_state` (string): New state (PENDING, ACTIVE, ESCALATED, RESOLVED)
- `transition_reason` (string): Reason for state transition
- `should_alert` (string): "true" or "false" - whether alert should be sent
- `timestamp` (string): ISO 8601 timestamp
- `metadata` (JSON string, optional): Additional metadata

### Example Message

```
ID: 1705312201000-0
Fields:
  violation_id: "550e8400-e29b-41d4-a716-446655440000"
  tenant_id: "tenant-123"
  worksite_id: "worksite-456"
  camera_id: "camera-789"
  violation_type: "NO_HELMET"
  old_state: "PENDING"
  new_state: "ACTIVE"
  transition_reason: "threshold_met_3_in_window"
  should_alert: "true"
  timestamp: "2024-01-15T10:30:01.000Z"
  metadata: '{"detection_message_id":"1705312200000-0","violation_metadata":{}}'
```

### State Change Events

State changes are published when:
- Violation state transitions (PENDING → ACTIVE, ACTIVE → ESCALATED, etc.)
- State change is committed to violation engine
- All processing is complete

**Idempotency:**
- State changes are idempotent (same violation_id + timestamp = same state)
- Consumers should deduplicate based on violation_id + timestamp

## Processing Guarantees

### Exactly-Once Semantics

- Messages are acknowledged only after successful processing
- Failed messages remain in pending list and are retried
- Poison messages are acknowledged after max retries (prevents infinite loops)

### Ordering Guarantees

- **Per Camera:** Messages for the same camera_id are processed in order (single consumer per camera recommended)
- **Across Cameras:** No ordering guarantee (parallel processing)

### Safe Retry Logic

1. **Pending Messages:** Read pending messages first (retry failed)
2. **New Messages:** Then read new messages (never delivered)
3. **Acknowledgment:** ACK only after successful processing
4. **Error Handling:** Exceptions logged, message still ACKed (poison message handling)

### Poison Message Handling

Messages that repeatedly fail processing:
1. Are logged as errors
2. Are acknowledged after max retries
3. Prevent infinite retry loops
4. Can be moved to DLQ in production

## Stream Management

### Consumer Group Setup

```bash
# Create consumer group (automatically done on startup)
XGROUP CREATE detections:raw violation-engine 0 MKSTREAM
```

### Monitoring

```bash
# Check pending messages
XPENDING detections:raw violation-engine

# Check consumer info
XINFO GROUPS detections:raw
XINFO CONSUMERS detections:raw violation-engine

# Read pending messages for a consumer
XREADGROUP GROUP violation-engine worker-1 COUNT 10 STREAMS detections:raw 0
```

### Stream Trimming

- Input stream (`detections:raw`): No automatic trimming (managed by Detection Service)
- Output stream (`violations:state_changes`): Automatically trimmed to last 1000 entries


# Violation Engine Service

Service for managing violation state transitions based on raw detection events from Redis Streams.

## Features

- Consumes raw detection events from Redis Streams (`detections:raw`)
- Manages violation state transitions (PENDING → ACTIVE → ESCALATED → RESOLVED)
- Implements sliding window logic for violation confirmation
- Handles deduplication (one violation per dedup key)
- Enforces alert suppression and escalation rules
- Publishes state changes to Redis Streams (`violations:state_changes`)
- **Does NOT send alerts** (separate service handles alerting)
- **Does NOT capture snapshots** (separate service handles snapshots)

## Overview

The Violation Engine service:
- Consumes raw detection events from Redis Streams
- Manages violation state transitions (PENDING → ACTIVE → ESCALATED → RESOLVED)
- Implements sliding window logic for violation confirmation
- Handles deduplication (one violation per dedup key)
- Enforces alert suppression and escalation rules
- **Does NOT send alerts** (separate service handles alerting)
- **Does NOT capture snapshots** (separate service handles snapshots)

## Architecture

### State Machine

```
                        [Detection Event]
                               |
                               v
                        ┌──────────────┐
                        │   PENDING    │  <-- Initial state (within sliding window)
                        └──────────────┘
                               |
                    [≥N detections in 10s window]
                               |
                               v
                        ┌──────────────┐
                        │    ACTIVE    │  <-- Confirmed violation
                        └──────────────┘
                               |
            ┌──────────────────┼──────────────────┐
            |                  |                  |
[>120s elapsed]   [No detection for 30s]   [Alert sent]
            |                  |                  |
            v                  v                  v
    ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
    │  ESCALATED   │   │   RESOLVED   │   │Suppressed    │
    └──────────────┘   └──────────────┘   │(60s cooldown)│
            |                              └──────────────┘
            |                                        |
            |                              [60s elapsed]
            |                                        |
            └────────────────────────────────────────┘
                               |
                    [No detection for 30s]
                               |
                               v
                        ┌──────────────┐
                        │   RESOLVED   │  <-- Terminal state
                        └──────────────┘
```

### State Transitions

- **PENDING → ACTIVE**: When ≥N detections occur within 10s sliding window
- **ACTIVE → ESCALATED**: When violation persists >120s (idempotent)
- **ACTIVE → RESOLVED**: When no detection for 30s
- **ESCALATED → RESOLVED**: When no detection for 30s
- **ACTIVE → ACTIVE (suppressed)**: When alert sent, suppress for 60s

### Domain Model

```python
Violation:
  - violation_id: UUID
  - tenant_id: str
  - worksite_id: str
  - camera_id: str
  - violation_type: str (NO_HELMET, NO_VEST, etc.)
  - zone_id: Optional[str]
  - state: ViolationState (PENDING | ACTIVE | ESCALATED | RESOLVED)
  - first_seen_at: datetime
  - last_seen_at: datetime
  - last_alert_at: Optional[datetime]
  - severity_level: SeverityLevel (LOW | MEDIUM | HIGH)
  - metadata: Dict[str, Any]
```

## Configuration

Environment variables:

- `VIOLATION_WINDOW_SECONDS`: Sliding window size (default: 10)
- `VIOLATION_DETECTION_THRESHOLD`: Minimum detections to trigger ACTIVE (default: 3)
- `VIOLATION_ESCALATION_SECONDS`: Seconds before escalation (default: 120)
- `VIOLATION_RESOLUTION_SECONDS`: Seconds without detection before resolution (default: 30)
- `VIOLATION_SUPPRESSION_SECONDS`: Alert suppression cooldown (default: 60)

## Core Logic

### Sliding Window

- Window size: 10 seconds (configurable)
- Violation becomes ACTIVE only if detected ≥N times within window
- Uses sliding window (not fixed windows) for accurate timing

### Deduplication

- Dedup key format: `{camera_id}:{violation_type}:{zone_id or 'none'}`
- Only ONE active violation per dedup key allowed
- New detections update existing violation if dedup key matches

### Suppression

- Suppress repeated violation firing for 60 seconds (configurable)
- Uses `last_alert_at` to enforce suppression
- Prevents alert spam for persistent violations

### Escalation

- If violation persists for >120 seconds (configurable), transition to ESCALATED
- Escalation is idempotent (only happens once)
- Uses `first_seen_at` for timing calculation

### Resolution

- Violation RESOLVED if no detections in last 30 seconds (configurable)
- Applies to both ACTIVE and ESCALATED states
- Terminal state (new detections create new PENDING violation)

## Edge Cases

1. **Multiple detections in same window**: Aggregated, count >= N triggers ACTIVE
2. **Detection arrives after resolution**: Creates new PENDING violation
3. **Escalation timing**: Only escalates once, uses first_seen_at for timing
4. **Alert suppression**: Tracks last_alert_at, suppresses for 60s
5. **Window boundaries**: Uses sliding window, not fixed windows
6. **Concurrent detections**: Store maintains one violation per dedup key (atomic)
7. **Clock skew**: All timestamps use UTC, caller provides current_time parameter

## Redis Integration

### Input Stream: detections:raw

Consumes raw detection events from Detection Service.

**Consumer Group:** `violation-engine`  
**Stream Key:** `detections:raw`

**Message Format:**
- `cameraId`: Camera identifier
- `tenantId`: Tenant identifier  
- `timestamp`: ISO 8601 timestamp
- `detections`: JSON array of detected objects
- `model`: JSON object with model metadata

See [REDIS_STREAMS.md](REDIS_STREAMS.md) for detailed schema documentation.

### Output Stream: violations:state_changes

Publishes violation state changes.

**Stream Key:** `violations:state_changes`  
**Max Length:** 1000 entries

**Message Format:**
- `violation_id`: Violation UUID
- `tenant_id`: Tenant identifier
- `worksite_id`: Worksite identifier
- `camera_id`: Camera identifier
- `violation_type`: Violation type (NO_HELMET, NO_VEST, etc.)
- `old_state`: Previous state
- `new_state`: New state
- `transition_reason`: Reason for transition
- `should_alert`: Whether alert should be sent
- `timestamp`: Event timestamp
- `metadata`: Additional metadata (JSON)

### Processing Guarantees

- **Exactly-Once Semantics:** Messages acknowledged only after successful processing
- **Ordering:** Per camera_id (single consumer per camera recommended)
- **Safe Retry:** Failed messages retried, poison messages acknowledged after max retries
- **Idempotent Writes:** State changes are idempotent

See [REDIS_STREAMS.md](REDIS_STREAMS.md) for detailed processing guarantees.

## Metrics

Prometheus metrics exposed on port 8000 (configurable via `METRICS_PORT`):

- `violations_created_total{violation_type,tenant_id}`: Total violations created
- `violations_escalated_total{violation_type,tenant_id}`: Total violations escalated
- `violations_resolved_total{violation_type,tenant_id}`: Total violations resolved
- `violation_processing_latency_ms`: Processing latency histogram (milliseconds)

## Running the Service

```bash
# Install dependencies
pip install -r requirements.txt

# Set environment variables
export REDIS_HOST=localhost
export REDIS_PORT=6379
export VIOLATION_DETECTION_THRESHOLD=3
export METRICS_PORT=8000

# Run service
python src/main.py
```

## Usage

```python
from violation_engine import ViolationEngine, ViolationEvent
from datetime import datetime

# Initialize engine
engine = ViolationEngine(
    window_seconds=10,
    detection_threshold=3,
    escalation_seconds=120,
    resolution_seconds=30,
    suppression_seconds=60
)

# Process detection event
event = ViolationEvent(
    tenant_id="tenant-123",
    worksite_id="worksite-456",
    camera_id="camera-789",
    violation_type="NO_HELMET",
    zone_id=None,
    timestamp=datetime.utcnow()
)

result = engine.process_detection_event(event)

if result.state_changed:
    print(f"Violation {result.violation.violation_id} changed to {result.violation.state}")
    print(f"Reason: {result.transition_reason}")

if result.should_alert:
    print(f"Should send alert for violation {result.violation.violation_id}")

# Evaluate resolutions periodically
results = engine.evaluate_resolutions()
for result in results:
    print(f"Violation {result.violation.violation_id} resolved")
```

## Design Principles

1. **Pure Logic**: All functions are deterministic, no I/O dependencies
2. **Unit Testable**: Every function can be tested in isolation
3. **Idempotent**: State transitions are idempotent where possible
4. **Configurable**: All timing thresholds are configurable
5. **Deterministic**: Same inputs always produce same outputs
6. **Well Documented**: Edge cases and behavior explicitly documented

## Testing

All core logic is pure and can be unit tested without mocks:

```python
def test_pending_to_active_transition():
    engine = ViolationEngine(detection_threshold=3, window_seconds=10)
    
    # Add 3 detections within window
    for i in range(3):
        event = ViolationEvent(...)
        result = engine.process_detection_event(event)
    
    violation = result.violation
    assert violation.state == ViolationState.ACTIVE
    assert result.state_changed == True
    assert result.should_alert == True
```

## Integration

This service is designed to be integrated with:

1. **Redis Consumer**: Consumes raw detection events from `detections:tenant:*:camera:*` streams
2. **Database**: Stores violations in PostgreSQL (not implemented in this module)
3. **Alert Service**: Receives violations with `should_alert=True` flag (separate service)

## Future Enhancements

- Database persistence (PostgreSQL with JSONB for metadata)
- Redis consumer implementation
- Metrics and observability
- Distributed locking for multi-instance deployment
- Configuration service integration


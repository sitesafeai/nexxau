# Violation Repository Usage

Documentation for using the PostgreSQL violation repository.

## Overview

The `ViolationRepository` provides transactional persistence for violations with the following guarantees:

1. **Atomic Writes**: Violation updates and event log entries are written atomically
2. **Rollback Safety**: If any operation fails, the entire transaction is rolled back
3. **Idempotency**: Duplicate escalation events are handled idempotently
4. **Deduplication**: Database enforces one active violation per dedup key

## Initialization

```python
from violation_repository import ViolationRepository
from database import create_connection_pool

# Create connection pool
pool = create_connection_pool(
    min_conn=1,
    max_conn=10
)

# Create repository
repository = ViolationRepository(pool)
```

## Writing Violations

### Upsert Violation with Event

The main write method is `upsert_violation()`, which atomically:
1. Upserts the violation row
2. Inserts an event log entry

```python
from violation_model import Violation, ViolationState, SeverityLevel
from datetime import datetime

# Create violation
violation = Violation.create(
    tenant_id="tenant-123",
    worksite_id="worksite-456",
    camera_id="camera-789",
    violation_type="NO_HELMET",
    zone_id=None,
    severity_level=SeverityLevel.MEDIUM
)

# Upsert with event
success = repository.upsert_violation(
    violation=violation,
    event_type='CREATED',
    old_state=None,
    transition_reason='initial_detection',
    should_alert=False,
    event_payload={'detection_message_id': '123'}
)

if success:
    print("Violation persisted successfully")
```

### State Change with Event

```python
# Update violation state
violation.state = ViolationState.ACTIVE
violation.last_seen_at = datetime.utcnow()

# Upsert with state change event
success = repository.upsert_violation(
    violation=violation,
    event_type='STATE_CHANGED',
    old_state=ViolationState.PENDING,
    transition_reason='threshold_met_3_in_window',
    should_alert=True,
    event_payload={}
)
```

### Escalation (Idempotent)

```python
# Escalate violation
violation.state = ViolationState.ESCALATED

# Upsert with escalation event (idempotent)
success = repository.upsert_violation(
    violation=violation,
    event_type='ESCALATED',
    old_state=ViolationState.ACTIVE,
    transition_reason='escalated_120.5s_persisted',
    should_alert=True,
    event_payload={}
)

# If called again with same violation_id, will succeed without error
# (duplicate escalation is ignored due to unique constraint)
```

## Reading Violations

### Get Violation by ID

```python
violation = repository.get_violation_by_id('550e8400-e29b-41d4-a716-446655440000')
if violation:
    print(f"Violation state: {violation.state}")
```

### Get Violation by Dedup Key

```python
violation = repository.get_violation_by_dedup_key(
    camera_id='camera-789',
    violation_type='NO_HELMET',
    zone_id=None
)
```

### Get Active Violations

```python
active_violations = repository.get_active_violations(limit=100)
for violation in active_violations:
    print(f"{violation.violation_id}: {violation.state}")
```

### Get Violations for Resolution Check

```python
# Get violations that haven't been seen for 30 seconds
candidates = repository.get_violations_for_resolution_check(resolution_seconds=30)
for violation in candidates:
    print(f"{violation.violation_id} last seen: {violation.last_seen_at}")
```

## Transaction Safety

### Rollback on Failure

If any operation fails, the entire transaction is rolled back:

```python
try:
    # Both operations happen in one transaction
    repository.upsert_violation(...)  # If this fails, no event is written
    # If event insert fails, violation update is rolled back
except Exception as e:
    # Transaction was automatically rolled back
    print(f"Error: {e}")
```

### Example: Rollback Scenario

```python
# Scenario: Event insertion fails
# Result: Violation update is rolled back

try:
    repository.upsert_violation(
        violation=violation,
        event_type='CREATED',
        old_state=None,
        transition_reason='test',
        should_alert=False
    )
except psycopg2.Error as e:
    # Both violation and event writes were rolled back
    # Database state is unchanged
    logger.error(f"Transaction rolled back: {e}")
```

## Idempotency

### Escalation Events

Escalation events are idempotent - calling `upsert_violation()` with `event_type='ESCALATED'` multiple times for the same violation will only create one escalation event:

```python
# First call: creates escalation event
repository.upsert_violation(..., event_type='ESCALATED', ...)

# Second call: succeeds but doesn't create duplicate event
# (unique constraint prevents duplicate escalation)
repository.upsert_violation(..., event_type='ESCALATED', ...)
```

### Deduplication

The database enforces one active violation per dedup key. Attempting to create a duplicate active violation will raise an `IntegrityError`:

```python
try:
    repository.upsert_violation(...)
except psycopg2.IntegrityError as e:
    if 'idx_violations_dedup_key_active' in str(e):
        # Duplicate active violation detected
        logger.error("Duplicate active violation")
```

## Integration with Violation Engine

```python
from violation_engine import ViolationEngine, ViolationEvent
from violation_repository import ViolationRepository

# Initialize engine and repository
engine = ViolationEngine(...)
repository = ViolationRepository(pool)

# Process detection event
result = engine.process_detection_event(event)

if result.state_changed and result.violation:
    # Persist violation state change
    event_type_map = {
        ViolationState.PENDING: 'CREATED',
        ViolationState.ACTIVE: 'STATE_CHANGED',
        ViolationState.ESCALATED: 'ESCALATED',
        ViolationState.RESOLVED: 'RESOLVED',
    }
    
    repository.upsert_violation(
        violation=result.violation,
        event_type=event_type_map.get(result.violation.state, 'STATE_CHANGED'),
        old_state=result.old_state,
        transition_reason=result.transition_reason,
        should_alert=result.should_alert,
        event_payload={'detection_message_id': '...'}
    )
```

## Error Handling

```python
try:
    repository.upsert_violation(...)
except psycopg2.IntegrityError as e:
    # Handle unique constraint violations
    if 'idx_violation_events_escalation_unique' in str(e):
        # Duplicate escalation - idempotent, OK
        pass
    elif 'idx_violations_dedup_key_active' in str(e):
        # Duplicate active violation - should not happen
        logger.error("Duplicate active violation")
        raise
    else:
        # Other integrity error
        raise
except psycopg2.Error as e:
    # Database error - transaction was rolled back
    logger.error(f"Database error: {e}")
    raise
except Exception as e:
    # Other error - transaction was rolled back
    logger.error(f"Unexpected error: {e}")
    raise
```


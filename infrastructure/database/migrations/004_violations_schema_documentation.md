# Violations Schema Documentation

## Overview

The violations schema provides persistence for the Violation Engine service, storing both current violation state and an immutable event log.

## Tables

### violations

Stores the current state of violations. One row per unique violation (identified by dedup key).

**Primary Key:** `violation_id` (UUID)

**Columns:**
- `violation_id` (UUID, PRIMARY KEY): Unique violation identifier
- `tenant_id` (UUID, NOT NULL, FK): Reference to tenants table
- `worksite_id` (UUID, NOT NULL, FK): Reference to worksites table
- `camera_id` (UUID, NOT NULL, FK): Reference to cameras table
- `violation_type` (VARCHAR(50), NOT NULL): Type of violation (NO_HELMET, NO_VEST, etc.)
- `zone_id` (UUID, FK, NULLABLE): Optional zone identifier
- `state` (VARCHAR(20), NOT NULL): Current state (PENDING, ACTIVE, ESCALATED, RESOLVED)
- `first_seen_at` (TIMESTAMP WITH TIME ZONE, NOT NULL): When violation was first detected
- `last_seen_at` (TIMESTAMP WITH TIME ZONE, NOT NULL): Most recent detection timestamp
- `last_alert_at` (TIMESTAMP WITH TIME ZONE, NULLABLE): When last alert was sent
- `severity_level` (VARCHAR(20), NOT NULL): Severity (LOW, MEDIUM, HIGH)
- `metadata` (JSONB, NOT NULL): Additional metadata (default: {})
- `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL): Row creation timestamp
- `updated_at` (TIMESTAMP WITH TIME ZONE, NOT NULL): Row last update timestamp (auto-updated)

**Constraints:**
- State must be one of: PENDING, ACTIVE, ESCALATED, RESOLVED
- Severity level must be one of: LOW, MEDIUM, HIGH
- Unique constraint on (camera_id, violation_type, zone_id) for active violations (via partial index)

**Indexes:**
- `idx_violations_camera_type_zone_state`: Composite index for common queries
- `idx_violations_tenant_id`: For tenant-based queries
- `idx_violations_worksite_id`: For worksite-based queries
- `idx_violations_state`: Partial index for active violations
- `idx_violations_last_seen_at`: Partial index for resolution evaluation
- `idx_violations_metadata_gin`: GIN index for JSONB metadata queries
- `idx_violations_dedup_key_active`: **UNIQUE** partial index enforcing deduplication (one active violation per dedup key)

### violation_events

Immutable event log for violation state changes and lifecycle events.

**Primary Key:** `event_id` (BIGSERIAL)

**Columns:**
- `event_id` (BIGSERIAL, PRIMARY KEY): Auto-incrementing event identifier
- `violation_id` (UUID, NOT NULL, FK): Reference to violations table
- `event_type` (VARCHAR(20), NOT NULL): Event type (CREATED, STATE_CHANGED, ESCALATED, RESOLVED, ALERT_SENT)
- `old_state` (VARCHAR(20), NULLABLE): Previous state (for state change events)
- `new_state` (VARCHAR(20), NOT NULL): New state
- `transition_reason` (TEXT, NULLABLE): Reason for state transition
- `should_alert` (BOOLEAN, NOT NULL): Whether this event should trigger an alert
- `timestamp` (TIMESTAMP WITH TIME ZONE, NOT NULL): Event timestamp
- `payload` (JSONB, NOT NULL): Event-specific data (default: {})
- `created_at` (TIMESTAMP WITH TIME ZONE, NOT NULL): Row creation timestamp

**Constraints:**
- Event type must be one of: CREATED, STATE_CHANGED, ESCALATED, RESOLVED, ALERT_SENT
- Unique constraint on (violation_id, event_type) for ESCALATED events (prevents duplicate escalations)

**Indexes:**
- `idx_violation_events_violation_id`: For violation event history queries
- `idx_violation_events_event_type`: For event type queries
- `idx_violation_events_timestamp`: For time-based queries (DESC order)
- `idx_violation_events_violation_timestamp`: Composite index for violation history
- `idx_violation_events_escalation_unique`: **UNIQUE** partial index preventing duplicate escalation events

## Deduplication

The `idx_violations_dedup_key_active` unique index enforces the "one active violation per dedup key" constraint.

**Dedup Key Format:** `(camera_id, violation_type, COALESCE(zone_id::text, 'none'))`

This ensures that only one violation in PENDING, ACTIVE, or ESCALATED state can exist for a given:
- Camera ID
- Violation type
- Zone ID (or 'none' if null)

**Note:** RESOLVED violations are not included in this constraint, allowing new violations to be created after resolution.

## Idempotency

### Escalation Events

The `idx_violation_events_escalation_unique` unique index prevents duplicate escalation events for the same violation.

**Constraint:** `UNIQUE (violation_id, event_type) WHERE event_type = 'ESCALATED'`

This ensures that escalation is idempotent - attempting to insert a duplicate escalation event will fail with a unique constraint violation, which can be handled gracefully by the application.

## Transactional Writes

Violations and violation_events must be written atomically:

1. **UPDATE violations** (if violation exists) or **INSERT violations** (if new)
2. **INSERT violation_events** (append event log entry)
3. Both operations must succeed or both must rollback

This ensures:
- Data consistency between current state and event log
- Event log accurately reflects all state changes
- No orphaned events without corresponding violations

## Usage Examples

### Insert New Violation with Event

```sql
BEGIN;

-- Insert violation
INSERT INTO violations (
    violation_id, tenant_id, worksite_id, camera_id, violation_type, 
    zone_id, state, first_seen_at, last_seen_at, severity_level, metadata
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'tenant-uuid'::uuid,
    'worksite-uuid'::uuid,
    'camera-uuid'::uuid,
    'NO_HELMET',
    NULL,
    'PENDING',
    NOW(),
    NOW(),
    'MEDIUM',
    '{}'::jsonb
) ON CONFLICT (camera_id, violation_type, COALESCE(zone_id::text, 'none'))
  WHERE state IN ('PENDING', 'ACTIVE', 'ESCALATED')
  DO UPDATE SET 
    last_seen_at = EXCLUDED.last_seen_at,
    updated_at = NOW();

-- Insert event
INSERT INTO violation_events (
    violation_id, event_type, new_state, transition_reason, should_alert, payload
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'CREATED',
    'PENDING',
    'initial_detection',
    false,
    '{"detection_message_id": "123"}'::jsonb
);

COMMIT;
```

### Update Violation State with Event

```sql
BEGIN;

-- Update violation
UPDATE violations
SET 
    state = 'ACTIVE',
    last_seen_at = NOW(),
    updated_at = NOW()
WHERE violation_id = '550e8400-e29b-41d4-a716-446655440000'::uuid;

-- Insert event
INSERT INTO violation_events (
    violation_id, event_type, old_state, new_state, transition_reason, should_alert, payload
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'STATE_CHANGED',
    'PENDING',
    'ACTIVE',
    'threshold_met_3_in_window',
    true,
    '{}'::jsonb
);

COMMIT;
```

### Escalation (Idempotent)

```sql
BEGIN;

-- Update violation to ESCALATED
UPDATE violations
SET 
    state = 'ESCALATED',
    updated_at = NOW()
WHERE violation_id = '550e8400-e29b-41d4-a716-446655440000'::uuid
  AND state = 'ACTIVE';  -- Only if currently ACTIVE

-- Insert escalation event (will fail if already exists due to unique constraint)
INSERT INTO violation_events (
    violation_id, event_type, old_state, new_state, transition_reason, should_alert, payload
) VALUES (
    '550e8400-e29b-41d4-a716-446655440000'::uuid,
    'ESCALATED',
    'ACTIVE',
    'ESCALATED',
    'escalated_120.5s_persisted',
    true,
    '{}'::jsonb
) ON CONFLICT (violation_id, event_type) WHERE event_type = 'ESCALATED'
DO NOTHING;  -- Idempotent: ignore if already escalated

COMMIT;
```

## Query Examples

### Get Active Violations for a Camera

```sql
SELECT * FROM violations
WHERE camera_id = 'camera-uuid'::uuid
  AND state IN ('ACTIVE', 'ESCALATED')
ORDER BY last_seen_at DESC;
```

### Get Violation Event History

```sql
SELECT * FROM violation_events
WHERE violation_id = 'violation-uuid'::uuid
ORDER BY timestamp DESC;
```

### Get Violations Needing Resolution Check

```sql
SELECT * FROM violations
WHERE state IN ('ACTIVE', 'ESCALATED')
  AND last_seen_at < NOW() - INTERVAL '30 seconds'
ORDER BY last_seen_at ASC;
```

### Check for Duplicate Active Violations (should return empty)

```sql
SELECT camera_id, violation_type, zone_id, COUNT(*)
FROM violations
WHERE state IN ('PENDING', 'ACTIVE', 'ESCALATED')
GROUP BY camera_id, violation_type, zone_id
HAVING COUNT(*) > 1;
```


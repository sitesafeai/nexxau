-- Migration: Violations Schema
-- Description: Creates tables for violation state storage and event log
-- Created: 2024-01-15

-- Violations table: stores current state of violations
-- Note: Foreign keys reference tables from 001_initial_schema.sql
CREATE TABLE IF NOT EXISTS violations (
    violation_id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL,
    worksite_id UUID NOT NULL,
    camera_id UUID NOT NULL,
    violation_type VARCHAR(50) NOT NULL,
    zone_id UUID,  -- Optional zone identifier (no FK constraint - zones table may not exist)
    state VARCHAR(20) NOT NULL CHECK (state IN ('PENDING', 'ACTIVE', 'ESCALATED', 'RESOLVED')),
    first_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_alert_at TIMESTAMP WITH TIME ZONE,
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('LOW', 'MEDIUM', 'HIGH')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for violations table
-- Composite index for common query patterns (camera_id, violation_type, zone_id, state)
CREATE INDEX IF NOT EXISTS idx_violations_camera_type_zone_state 
    ON violations(camera_id, violation_type, zone_id, state);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_violations_tenant_id 
    ON violations(tenant_id);

-- Index for worksite queries
CREATE INDEX IF NOT EXISTS idx_violations_worksite_id 
    ON violations(worksite_id);

-- Index for state-based queries (active violations)
CREATE INDEX IF NOT EXISTS idx_violations_state 
    ON violations(state) WHERE state IN ('ACTIVE', 'ESCALATED');

-- Index for time-based queries (resolution evaluation)
CREATE INDEX IF NOT EXISTS idx_violations_last_seen_at 
    ON violations(last_seen_at) WHERE state IN ('ACTIVE', 'ESCALATED');

-- Index for JSONB metadata queries (if needed)
CREATE INDEX IF NOT EXISTS idx_violations_metadata_gin 
    ON violations USING GIN(metadata);

-- Partial index for deduplication key lookups (active violations only)
-- Dedup key: (camera_id, violation_type, zone_id or 'none')
-- This index helps enforce the "one active violation per dedup key" constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_violations_dedup_key_active 
    ON violations(camera_id, violation_type, COALESCE(zone_id::text, 'none'))
    WHERE state IN ('PENDING', 'ACTIVE', 'ESCALATED');

-- Violation events table: immutable event log
CREATE TABLE IF NOT EXISTS violation_events (
    event_id BIGSERIAL PRIMARY KEY,
    violation_id UUID NOT NULL REFERENCES violations(violation_id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('CREATED', 'STATE_CHANGED', 'ESCALATED', 'RESOLVED', 'ALERT_SENT')),
    old_state VARCHAR(20),
    new_state VARCHAR(20) NOT NULL,
    transition_reason TEXT,
    should_alert BOOLEAN NOT NULL DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for violation_events table
-- Index for violation_id lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_violation_events_violation_id 
    ON violation_events(violation_id);

-- Index for event type queries
CREATE INDEX IF NOT EXISTS idx_violation_events_event_type 
    ON violation_events(event_type);

-- Index for time-based queries (event history)
CREATE INDEX IF NOT EXISTS idx_violation_events_timestamp 
    ON violation_events(timestamp DESC);

-- Composite index for violation event history queries
CREATE INDEX IF NOT EXISTS idx_violation_events_violation_timestamp 
    ON violation_events(violation_id, timestamp DESC);

-- Unique constraint for idempotency: prevent duplicate escalation events
-- Only one ESCALATED event per violation_id allowed
CREATE UNIQUE INDEX IF NOT EXISTS idx_violation_events_escalation_unique 
    ON violation_events(violation_id, event_type) 
    WHERE event_type = 'ESCALATED';

-- Updated_at trigger function (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at on violations
CREATE TRIGGER update_violations_updated_at 
    BEFORE UPDATE ON violations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE violations IS 'Stores current state of violations. One row per unique violation (dedup_key).';
COMMENT ON TABLE violation_events IS 'Immutable event log for violation state changes and lifecycle events.';

COMMENT ON COLUMN violations.violation_id IS 'Primary key: UUID identifying the violation';
COMMENT ON COLUMN violations.state IS 'Current state: PENDING, ACTIVE, ESCALATED, or RESOLVED';
COMMENT ON COLUMN violations.metadata IS 'JSONB field for additional violation metadata';
COMMENT ON COLUMN violations.zone_id IS 'Optional zone identifier (null if not zone-specific)';

COMMENT ON COLUMN violation_events.event_id IS 'Primary key: auto-incrementing event ID';
COMMENT ON COLUMN violation_events.violation_id IS 'Foreign key to violations table';
COMMENT ON COLUMN violation_events.event_type IS 'Event type: CREATED, STATE_CHANGED, ESCALATED, RESOLVED, ALERT_SENT';
COMMENT ON COLUMN violation_events.payload IS 'JSONB field for event-specific data';
COMMENT ON COLUMN violation_events.should_alert IS 'Whether this event should trigger an alert';

COMMENT ON INDEX idx_violations_dedup_key_active IS 'Unique index enforcing one active violation per dedup key (camera_id, violation_type, zone_id)';
COMMENT ON INDEX idx_violation_events_escalation_unique IS 'Unique index preventing duplicate escalation events per violation';


-- Migration: Violation Snapshots Schema
-- Description: Creates table for violation snapshot metadata
-- Created: 2024-01-15

-- Violation snapshots table: stores metadata for snapshots and video clips
CREATE TABLE IF NOT EXISTS violation_snapshots (
    snapshot_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    violation_id UUID NOT NULL,  -- References violations(violation_id) if table exists
    tenant_id UUID NOT NULL,
    worksite_id UUID NOT NULL,
    camera_id UUID NOT NULL,
    snapshot_type VARCHAR(20) NOT NULL CHECK (snapshot_type IN ('snapshot', 'clip')),
    s3_key TEXT NOT NULL,  -- S3 object key (path in bucket)
    s3_bucket TEXT NOT NULL,  -- S3 bucket name
    file_size_bytes BIGINT NOT NULL,
    content_type VARCHAR(100) NOT NULL,  -- e.g., 'image/jpeg', 'video/mp4'
    captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    violation_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,  -- Timestamp of violation
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for violation_snapshots table
-- Index for violation lookups (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_violation_snapshots_violation_id 
    ON violation_snapshots(violation_id);

-- Index for tenant queries
CREATE INDEX IF NOT EXISTS idx_violation_snapshots_tenant_id 
    ON violation_snapshots(tenant_id);

-- Index for retention queries (find expired snapshots)
CREATE INDEX IF NOT EXISTS idx_violation_snapshots_captured_at 
    ON violation_snapshots(captured_at);

-- Composite index for tenant + captured_at queries
CREATE INDEX IF NOT EXISTS idx_violation_snapshots_tenant_captured_at 
    ON violation_snapshots(tenant_id, captured_at);

-- Index for snapshot type queries
CREATE INDEX IF NOT EXISTS idx_violation_snapshots_type 
    ON violation_snapshots(snapshot_type);

-- Unique index on S3 key (prevent duplicate uploads)
CREATE UNIQUE INDEX IF NOT EXISTS idx_violation_snapshots_s3_key 
    ON violation_snapshots(s3_key);

-- Comments for documentation
COMMENT ON TABLE violation_snapshots IS 'Stores metadata for violation snapshots and video clips stored in S3';

COMMENT ON COLUMN violation_snapshots.snapshot_id IS 'Primary key: UUID identifying the snapshot';
COMMENT ON COLUMN violation_snapshots.violation_id IS 'Foreign key to violations table';
COMMENT ON COLUMN violation_snapshots.snapshot_type IS 'Type: snapshot (JPEG) or clip (MP4)';
COMMENT ON COLUMN violation_snapshots.s3_key IS 'S3 object key (full path in bucket)';
COMMENT ON COLUMN violation_snapshots.s3_bucket IS 'S3 bucket name';
COMMENT ON COLUMN violation_snapshots.captured_at IS 'When snapshot was captured';
COMMENT ON COLUMN violation_snapshots.violation_timestamp IS 'Timestamp of the violation that triggered this snapshot';


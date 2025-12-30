-- Migration: 002_audit_logs_partitioned.sql
-- Description: Append-only audit log table with monthly partitioning
-- Created: 2024-01-15

-- ============================================================================
-- AUDIT LOGS (PARTITIONED)
-- ============================================================================
-- Append-only audit log table partitioned by month
-- Uses native PostgreSQL partitioning (range partitioning by month)

-- Parent table (partitioned)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL, -- NULL for system-wide logs
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- NULL for system actions
    action TEXT NOT NULL, -- e.g., 'user.created', 'violation.acknowledged', 'camera.deleted'
    entity_type TEXT NOT NULL, -- e.g., 'user', 'violation', 'camera'
    entity_id UUID, -- ID of the affected entity
    old_values JSONB, -- Previous state (for updates/deletes)
    new_values JSONB, -- New state (for creates/updates)
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Indexes on parent table (will be inherited by partitions)
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- ============================================================================
-- PARTITION CREATION FUNCTION
-- ============================================================================
-- Function to create monthly partitions
-- Should be run monthly (via cron or scheduler) to create next month's partition

CREATE OR REPLACE FUNCTION create_audit_log_partition(partition_date DATE)
RETURNS TEXT AS $$
DECLARE
    partition_name TEXT;
    partition_start DATE;
    partition_end DATE;
BEGIN
    -- Calculate month start and end
    partition_start := DATE_TRUNC('month', partition_date);
    partition_end := partition_start + INTERVAL '1 month';
    
    -- Generate partition name (e.g., audit_logs_2024_01)
    partition_name := 'audit_logs_' || TO_CHAR(partition_start, 'YYYY_MM');
    
    -- Check if partition already exists
    IF EXISTS (
        SELECT 1 FROM pg_class WHERE relname = partition_name
    ) THEN
        RETURN 'Partition ' || partition_name || ' already exists';
    END IF;
    
    -- Create partition
    EXECUTE format(
        'CREATE TABLE %I PARTITION OF audit_logs
         FOR VALUES FROM (%L) TO (%L)',
        partition_name,
        partition_start,
        partition_end
    );
    
    RETURN 'Created partition ' || partition_name;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CREATE INITIAL PARTITIONS
-- ============================================================================
-- Create partitions for current month and next 2 months
SELECT create_audit_log_partition(CURRENT_DATE);
SELECT create_audit_log_partition(CURRENT_DATE + INTERVAL '1 month');
SELECT create_audit_log_partition(CURRENT_DATE + INTERVAL '2 months');

-- ============================================================================
-- PARTITION MAINTENANCE FUNCTION
-- ============================================================================
-- Function to create next month's partition (should be run monthly)
-- Can be called via cron job or application scheduler

CREATE OR REPLACE FUNCTION maintain_audit_log_partitions()
RETURNS TEXT AS $$
DECLARE
    next_month DATE;
    result TEXT;
BEGIN
    -- Create partition for next month
    next_month := DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
    SELECT create_audit_log_partition(next_month) INTO result;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (Optional - for additional tenant isolation)
-- ============================================================================
-- Uncomment if you want database-level RLS in addition to application-level checks

-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- CREATE POLICY audit_logs_tenant_isolation ON audit_logs
--     FOR SELECT
--     USING (
--         tenant_id IS NULL OR
--         tenant_id = current_setting('app.current_tenant_id', true)::UUID
--     );

-- Note: To use RLS, set app.current_tenant_id before queries:
-- SET app.current_tenant_id = 'tenant-uuid-here';

-- Migration: 003_indexes_optimization.sql
-- Description: Additional indexes for query optimization
-- Created: 2024-01-15

-- ============================================================================
-- ADDITIONAL COMPOSITE INDEXES
-- ============================================================================

-- Violations: Common query patterns
-- Query: Get recent violations by tenant and status
CREATE INDEX IF NOT EXISTS idx_violations_tenant_status_occurred_at 
    ON violations(tenant_id, status, occurred_at DESC);

-- Query: Get critical violations by tenant
CREATE INDEX IF NOT EXISTS idx_violations_tenant_severity_occurred_at 
    ON violations(tenant_id, severity, occurred_at DESC) 
    WHERE severity IN ('high', 'critical');

-- Query: Get open violations by camera
CREATE INDEX IF NOT EXISTS idx_violations_camera_status 
    ON violations(camera_id, status) 
    WHERE status = 'open';

-- Detections: Time-range queries
-- Query: Get detections for a camera in a time range
CREATE INDEX IF NOT EXISTS idx_detections_camera_detected_at 
    ON detections(camera_id, detected_at DESC);

-- Query: Get detections by type in a time range
CREATE INDEX IF NOT EXISTS idx_detections_tenant_type_detected_at 
    ON detections(tenant_id, detection_type, detected_at DESC);

-- Cameras: Active cameras by worksite
CREATE INDEX IF NOT EXISTS idx_cameras_worksite_active 
    ON cameras(worksite_id, is_active) 
    WHERE worksite_id IS NOT NULL AND is_active = true;

-- Users: Active users by role in a tenant
CREATE INDEX IF NOT EXISTS idx_users_tenant_role_active 
    ON users(tenant_id, role, is_active) 
    WHERE is_active = true;

-- ============================================================================
-- GIN INDEXES FOR JSONB COLUMNS (for metadata queries)
-- ============================================================================

-- GIN indexes for JSONB metadata columns (useful for flexible queries)
-- Only create if you'll be querying JSONB fields frequently

-- CREATE INDEX idx_tenants_metadata_gin ON tenants USING GIN (metadata);
-- CREATE INDEX idx_worksites_metadata_gin ON worksites USING GIN (metadata);
-- CREATE INDEX idx_cameras_metadata_gin ON cameras USING GIN (metadata);
-- CREATE INDEX idx_detections_metadata_gin ON detections USING GIN (metadata);
-- CREATE INDEX idx_violations_metadata_gin ON violations USING GIN (metadata);
-- CREATE INDEX idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);

-- ============================================================================
-- PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================================================

-- Active entities (already created in initial migration, shown here for reference)
-- CREATE INDEX idx_cameras_tenant_active ON cameras(tenant_id, is_active) WHERE is_active = true;
-- CREATE INDEX idx_worksites_tenant_active ON worksites(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- STATISTICS
-- ============================================================================
-- Update table statistics for query planner optimization
ANALYZE tenants;
ANALYZE users;
ANALYZE worksites;
ANALYZE cameras;
ANALYZE detections;
ANALYZE violations;
ANALYZE acknowledgements;

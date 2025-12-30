-- Migration: 001_initial_schema.sql
-- Description: Initial schema for multi-tenant PPE detection system
-- Created: 2024-01-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_partman for partitioning (optional, can use native partitioning)
-- CREATE EXTENSION IF NOT EXISTS pg_partman;

-- ============================================================================
-- TENANTS
-- ============================================================================
-- Root entity for multi-tenancy. All tenant-scoped tables reference this.
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE, -- URL-friendly identifier
    metadata JSONB DEFAULT '{}', -- Flexible storage for tenant-specific config
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);

-- ============================================================================
-- USERS
-- ============================================================================
-- User roles enum
CREATE TYPE user_role AS ENUM ('admin', 'safety_manager', 'viewer');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    password_hash TEXT, -- Nullable for external auth providers
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Email must be unique per tenant (not globally)
    CONSTRAINT users_email_tenant_unique UNIQUE (tenant_id, email)
);

-- Index for tenant-scoped user queries
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_tenant_email ON users(tenant_id, email);
CREATE INDEX idx_users_role ON users(role) WHERE is_active = true;

-- ============================================================================
-- WORKSITES
-- ============================================================================
-- Physical locations under a tenant
CREATE TABLE worksites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    address TEXT,
    latitude DECIMAL(10, 8), -- For mapping/geolocation
    longitude DECIMAL(11, 8),
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for tenant-scoped worksite queries
CREATE INDEX idx_worksites_tenant_id ON worksites(tenant_id);
CREATE INDEX idx_worksites_tenant_active ON worksites(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- CAMERAS
-- ============================================================================
-- Camera devices, can belong to a worksite or be tenant-level
CREATE TABLE cameras (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    worksite_id UUID REFERENCES worksites(id) ON DELETE SET NULL, -- Nullable: camera can be tenant-level
    name TEXT NOT NULL,
    stream_url TEXT NOT NULL,
    location TEXT, -- Physical location description
    camera_type TEXT, -- e.g., 'fixed', 'ptz', 'thermal'
    resolution TEXT, -- e.g., '1920x1080'
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT cameras_worksite_tenant_check CHECK (
        worksite_id IS NULL OR EXISTS (
            SELECT 1 FROM worksites WHERE id = cameras.worksite_id AND tenant_id = cameras.tenant_id
        )
    )
);

-- Indexes for camera queries
CREATE INDEX idx_cameras_tenant_id ON cameras(tenant_id);
CREATE INDEX idx_cameras_worksite_id ON cameras(worksite_id) WHERE worksite_id IS NOT NULL;
CREATE INDEX idx_cameras_tenant_worksite ON cameras(tenant_id, worksite_id) WHERE worksite_id IS NOT NULL;
CREATE INDEX idx_cameras_tenant_active ON cameras(tenant_id, is_active) WHERE is_active = true;

-- ============================================================================
-- DETECTIONS
-- ============================================================================
-- Raw detection results from ML service (high-write table)
CREATE TABLE detections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    detection_type TEXT NOT NULL, -- e.g., 'person_without_hardhat', 'safety_violation'
    confidence DECIMAL(5, 4) NOT NULL, -- 0.0000 to 1.0000
    bbox JSONB NOT NULL, -- Bounding box: {"x": 100, "y": 200, "width": 50, "height": 80}
    frame_url TEXT, -- URL to captured frame/image
    metadata JSONB DEFAULT '{}', -- Additional detection data
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- High-write table: indexes optimized for time-based and tenant queries
CREATE INDEX idx_detections_tenant_id ON detections(tenant_id);
CREATE INDEX idx_detections_camera_id ON detections(camera_id);
CREATE INDEX idx_detections_detected_at ON detections(detected_at DESC);
CREATE INDEX idx_detections_tenant_detected_at ON detections(tenant_id, detected_at DESC);
CREATE INDEX idx_detections_type ON detections(detection_type) WHERE detection_type IN (
    'person_without_hardhat', 'person_without_safety_vest', 'safety_violation'
);

-- ============================================================================
-- VIOLATIONS
-- ============================================================================
-- Processed violations derived from detections (high-write table)
CREATE TYPE violation_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE violation_status AS ENUM ('open', 'acknowledged', 'resolved', 'false_positive');

CREATE TABLE violations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    camera_id UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
    detection_id UUID REFERENCES detections(id) ON DELETE SET NULL,
    violation_type TEXT NOT NULL,
    severity violation_severity NOT NULL DEFAULT 'medium',
    status violation_status NOT NULL DEFAULT 'open',
    description TEXT,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- High-write table: indexes for queries and filtering
CREATE INDEX idx_violations_tenant_id ON violations(tenant_id);
CREATE INDEX idx_violations_camera_id ON violations(camera_id);
CREATE INDEX idx_violations_occurred_at ON violations(occurred_at DESC);
CREATE INDEX idx_violations_tenant_occurred_at ON violations(tenant_id, occurred_at DESC);
CREATE INDEX idx_violations_status ON violations(status);
CREATE INDEX idx_violations_tenant_status ON violations(tenant_id, status);
CREATE INDEX idx_violations_severity ON violations(severity) WHERE severity IN ('high', 'critical');
CREATE INDEX idx_violations_tenant_severity ON violations(tenant_id, severity) WHERE severity IN ('high', 'critical');

-- ============================================================================
-- ACKNOWLEDGEMENTS
-- ============================================================================
-- User acknowledgements of violations (high-write table)
CREATE TABLE acknowledgements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    violation_id UUID NOT NULL REFERENCES violations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- One acknowledgement per user per violation
    CONSTRAINT acknowledgements_user_violation_unique UNIQUE (user_id, violation_id)
);

-- High-write table: indexes for lookups
CREATE INDEX idx_acknowledgements_tenant_id ON acknowledgements(tenant_id);
CREATE INDEX idx_acknowledgements_violation_id ON acknowledgements(violation_id);
CREATE INDEX idx_acknowledgements_user_id ON acknowledgements(user_id);
CREATE INDEX idx_acknowledgements_acknowledged_at ON acknowledgements(acknowledged_at DESC);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worksites_updated_at BEFORE UPDATE ON worksites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cameras_updated_at BEFORE UPDATE ON cameras
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_violations_updated_at BEFORE UPDATE ON violations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to validate tenant isolation (can be used in application layer)
CREATE OR REPLACE FUNCTION validate_tenant_access(
    p_tenant_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = p_user_id AND tenant_id = p_tenant_id AND is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

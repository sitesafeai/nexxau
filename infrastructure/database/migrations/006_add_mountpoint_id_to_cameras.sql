-- Migration: Add mountpointId: 10 to all cameras' metadata
-- 
-- This migration updates all cameras in the database to include mountpointId: 10
-- in their metadata JSONB field, which enables WebRTC streaming via Janus Gateway.
--
-- The mountpointId is merged into existing metadata, preserving all other fields.

-- Update all cameras to include mountpointId: 10 in metadata
UPDATE "Camera"
SET 
  "metadata" = COALESCE("metadata", '{}'::jsonb) || '{"mountpointId": 10}'::jsonb,
  "updatedAt" = NOW()
WHERE 
  -- Only update cameras that don't already have mountpointId set
  ("metadata" IS NULL OR ("metadata"->>'mountpointId') IS NULL)
  OR
  -- Or update cameras that have a different mountpointId (to ensure consistency)
  (("metadata"->>'mountpointId')::int IS DISTINCT FROM 10);

-- Verify the update (optional - uncomment to check results)
-- SELECT 
--   id,
--   name,
--   "metadata"->>'mountpointId' as mountpoint_id,
--   "metadata"
-- FROM "Camera"
-- ORDER BY "updatedAt" DESC
-- LIMIT 10;


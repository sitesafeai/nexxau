-- Manual migration: add camera rules, detection log, alert contacts
-- Run this in Supabase SQL Editor if migrate dev has drift issues

-- 1. Add zone to Camera (if not exists)
ALTER TABLE "Camera" ADD COLUMN IF NOT EXISTS "zone" TEXT;

-- 2. Add ruleId and confidence to SafetyViolation (if not exists)
ALTER TABLE "SafetyViolation" ADD COLUMN IF NOT EXISTS "ruleId" TEXT;
ALTER TABLE "SafetyViolation" ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION;

-- 3. Create CameraRule table
CREATE TABLE IF NOT EXISTS "CameraRule" (
  "id" TEXT NOT NULL,
  "cameraId" TEXT NOT NULL,
  "ifCondition" TEXT NOT NULL,
  "ifObject" TEXT,
  "andCondition" TEXT,
  "andObject" TEXT,
  "thenAction" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "isPredefined" BOOLEAN NOT NULL DEFAULT false,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "disabledReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CameraRule_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CameraRule_cameraId_idx" ON "CameraRule"("cameraId");
DO $$ BEGIN
  ALTER TABLE "CameraRule" ADD CONSTRAINT "CameraRule_cameraId_fkey"
    FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 4. Create DetectionLog table
CREATE TABLE IF NOT EXISTS "DetectionLog" (
  "id" TEXT NOT NULL,
  "cameraId" TEXT NOT NULL,
  "worksiteId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "confidence" DOUBLE PRECISION NOT NULL,
  "bbox" JSONB NOT NULL,
  "frameData" TEXT,
  "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DetectionLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DetectionLog_cameraId_timestamp_idx" ON "DetectionLog"("cameraId", "timestamp");
CREATE INDEX IF NOT EXISTS "DetectionLog_worksiteId_timestamp_idx" ON "DetectionLog"("worksiteId", "timestamp");
DO $$ BEGIN
  ALTER TABLE "DetectionLog" ADD CONSTRAINT "DetectionLog_cameraId_fkey"
    FOREIGN KEY ("cameraId") REFERENCES "Camera"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "DetectionLog" ADD CONSTRAINT "DetectionLog_worksiteId_fkey"
    FOREIGN KEY ("worksiteId") REFERENCES "Worksite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 5. Create AlertContact table
CREATE TABLE IF NOT EXISTS "AlertContact" (
  "id" TEXT NOT NULL,
  "worksiteId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertContact_pkey" PRIMARY KEY ("id")
);
DO $$ BEGIN
  ALTER TABLE "AlertContact" ADD CONSTRAINT "AlertContact_worksiteId_fkey"
    FOREIGN KEY ("worksiteId") REFERENCES "Worksite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

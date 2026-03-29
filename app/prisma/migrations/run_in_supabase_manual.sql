-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- Run each section in order. If a column already exists, you'll get a harmless "already exists" error for that line; you can ignore it or comment out that line.

-- 1) AuditLog: add worksiteId (for relation to Worksite)
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "worksiteId" TEXT;

-- 2) AuditLog: make userId nullable (optional user for system-generated logs)
ALTER TABLE "AuditLog" ALTER COLUMN "userId" DROP NOT NULL;

-- 3) Workflow: add worksiteId (for relation to Worksite)
ALTER TABLE "Workflow" ADD COLUMN IF NOT EXISTS "worksiteId" TEXT;

-- 4) Alert: ensure override-related columns exist (if you haven’t run the override migration yet)
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideStatus" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideBy" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideAt" TIMESTAMP(3);
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideReason" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "isTrainingCandidate" BOOLEAN NOT NULL DEFAULT false;

-- Run in Supabase → SQL Editor. Safe to run more than once (everything is IF NOT EXISTS).
-- Ships the schema behind the false-positive / confirm buttons, which 500'd in prod because
-- these columns/tables were in the code but never in the database. Purely additive.

-- 1) Alert: supervisor verdict columns
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideStatus"      TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideAt"          TIMESTAMP(3);
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "overrideReason"      TEXT;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "isTrainingCandidate" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Alert" ADD COLUMN IF NOT EXISTS "modelVersion"        TEXT;

-- 2) Append-only trail of verdicts
CREATE TABLE IF NOT EXISTS "AlertOverrideAuditLog" (
  "id"                   TEXT         NOT NULL,
  "alertId"              TEXT         NOT NULL,
  "userId"               TEXT         NOT NULL,
  "oldStatus"            TEXT,
  "newStatus"            TEXT         NOT NULL,
  "oldTrainingCandidate" BOOLEAN      NOT NULL DEFAULT false,
  "newTrainingCandidate" BOOLEAN      NOT NULL DEFAULT false,
  "reason"               TEXT,
  "notes"                TEXT,
  "createdAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AlertOverrideAuditLog_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AlertOverrideAuditLog_alertId_fkey" FOREIGN KEY ("alertId")
    REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AlertOverrideAuditLog_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AlertOverrideAuditLog_alertId_idx"   ON "AlertOverrideAuditLog"("alertId");
CREATE INDEX IF NOT EXISTS "AlertOverrideAuditLog_userId_idx"    ON "AlertOverrideAuditLog"("userId");
CREATE INDEX IF NOT EXISTS "AlertOverrideAuditLog_createdAt_idx" ON "AlertOverrideAuditLog"("createdAt");

-- 3) Feedback on raw detections
CREATE TABLE IF NOT EXISTS "FalsePositiveReport" (
  "id"           TEXT         NOT NULL,
  "alertId"      TEXT,
  "detectionId"  TEXT         NOT NULL,
  "worksiteId"   TEXT,
  "cameraId"     TEXT,
  "reportedBy"   TEXT         NOT NULL,
  "description"  TEXT,
  "incidentType" TEXT,
  "videoUrl"     TEXT,
  "imageUrl"     TEXT,
  "timestamp"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed"     BOOLEAN      NOT NULL DEFAULT false,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FalsePositiveReport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FalsePositiveReport_reportedBy_fkey" FOREIGN KEY ("reportedBy")
    REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "FalsePositiveReport_detectionId_idx" ON "FalsePositiveReport"("detectionId");
CREATE INDEX IF NOT EXISTS "FalsePositiveReport_worksiteId_idx"  ON "FalsePositiveReport"("worksiteId");
CREATE INDEX IF NOT EXISTS "FalsePositiveReport_reviewed_idx"    ON "FalsePositiveReport"("reviewed");

-- Check: should return 2 rows
SELECT table_name FROM information_schema.tables
WHERE table_name IN ('AlertOverrideAuditLog','FalsePositiveReport');

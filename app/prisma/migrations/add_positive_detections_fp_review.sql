-- Migration: add_positive_detections_fp_review
-- Run this in Supabase SQL Editor (or psql) once.
-- It is idempotent — safe to run multiple times.

-- ── Enums ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "FpReviewStatus"  AS ENUM ('PENDING', 'CONFIRMED', 'DISMISSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "FpDisputeStatus" AS ENUM ('PENDING', 'UPHELD', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── PositiveDetection ──────────────────────────────────────────────────────
-- PPE-compliant / safe-behaviour events detected by YOLO.
-- Used by the safety score formula to boost scores.

CREATE TABLE IF NOT EXISTS "PositiveDetection" (
  "id"            TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "worksiteId"    TEXT         NOT NULL,
  "cameraId"      TEXT,
  "detectedAt"    TIMESTAMPTZ  NOT NULL,
  "detectionType" TEXT         NOT NULL,          -- e.g. 'PPE_COMPLIANT'
  "severity"      TEXT         NOT NULL DEFAULT 'LOW', -- HIGH | MEDIUM | LOW
  "confidence"    DOUBLE PRECISION,
  "metadata"      JSONB,
  "createdAt"     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

  CONSTRAINT "PositiveDetection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PositiveDetection_worksiteId_fkey"
    FOREIGN KEY ("worksiteId") REFERENCES "Worksite"("id") ON DELETE CASCADE,
  CONSTRAINT "PositiveDetection_cameraId_fkey"
    FOREIGN KEY ("cameraId")   REFERENCES "Camera"("id")   ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "PositiveDetection_worksiteId_detectedAt_idx"
  ON "PositiveDetection"("worksiteId", "detectedAt");

CREATE INDEX IF NOT EXISTS "PositiveDetection_cameraId_idx"
  ON "PositiveDetection"("cameraId");

-- ── FalsePositiveReview ───────────────────────────────────────────────────
-- When a company admin marks an Alert as FALSE_POSITIVE, one row is created
-- here for a Nexxau super-admin to review.

CREATE TABLE IF NOT EXISTS "FalsePositiveReview" (
  "id"               TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
  "alertId"          TEXT              NOT NULL,
  "status"           "FpReviewStatus"  NOT NULL DEFAULT 'PENDING',
  "markedByUserId"   TEXT              NOT NULL,
  "reviewedByUserId" TEXT,
  "superAdminNote"   TEXT,
  "createdAt"        TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "reviewedAt"       TIMESTAMPTZ,

  CONSTRAINT "FalsePositiveReview_pkey"    PRIMARY KEY ("id"),
  CONSTRAINT "FalsePositiveReview_alertId_key" UNIQUE ("alertId"),
  CONSTRAINT "FalsePositiveReview_alertId_fkey"
    FOREIGN KEY ("alertId")          REFERENCES "Alert"("id") ON DELETE CASCADE,
  CONSTRAINT "FalsePositiveReview_markedByUserId_fkey"
    FOREIGN KEY ("markedByUserId")   REFERENCES "User"("id"),
  CONSTRAINT "FalsePositiveReview_reviewedByUserId_fkey"
    FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "FalsePositiveReview_status_idx"
  ON "FalsePositiveReview"("status");

CREATE INDEX IF NOT EXISTS "FalsePositiveReview_createdAt_idx"
  ON "FalsePositiveReview"("createdAt");

-- ── FalsePositiveDispute ──────────────────────────────────────────────────
-- A worksite user can contest the super-admin ruling.

CREATE TABLE IF NOT EXISTS "FalsePositiveDispute" (
  "id"                TEXT              NOT NULL DEFAULT gen_random_uuid()::text,
  "fpReviewId"        TEXT              NOT NULL,
  "submittedByUserId" TEXT              NOT NULL,
  "reason"            TEXT              NOT NULL,
  "status"            "FpDisputeStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedNote"      TEXT,
  "createdAt"         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  "resolvedAt"        TIMESTAMPTZ,

  CONSTRAINT "FalsePositiveDispute_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "FalsePositiveDispute_fpReviewId_fkey"
    FOREIGN KEY ("fpReviewId")        REFERENCES "FalsePositiveReview"("id") ON DELETE CASCADE,
  CONSTRAINT "FalsePositiveDispute_submittedByUserId_fkey"
    FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id")
);

CREATE INDEX IF NOT EXISTS "FalsePositiveDispute_fpReviewId_idx"
  ON "FalsePositiveDispute"("fpReviewId");

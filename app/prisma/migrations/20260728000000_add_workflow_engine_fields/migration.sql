-- Add workflow engine fields to Workflow table
ALTER TABLE "Workflow"
  ADD COLUMN IF NOT EXISTS "type"            TEXT,
  ADD COLUMN IF NOT EXISTS "triggerType"     TEXT,
  ADD COLUMN IF NOT EXISTS "triggerConfig"   JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS "actions"         JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "enabled"         BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "priority"        INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "lastRunAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "createdBy"       TEXT,
  ADD COLUMN IF NOT EXISTS "batchingEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "batchWindow"     INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS "rateLimitWindow" INTEGER NOT NULL DEFAULT 120;

-- Make nodes and connections nullable-safe with defaults (they may already exist)
ALTER TABLE "Workflow"
  ALTER COLUMN "nodes"       SET DEFAULT '{}',
  ALTER COLUMN "connections" SET DEFAULT '[]';

-- Create WorkflowExecution table
CREATE TABLE IF NOT EXISTS "WorkflowExecution" (
  "id"              TEXT NOT NULL,
  "workflowId"      TEXT NOT NULL,
  "triggeredBy"     TEXT NOT NULL,
  "triggerData"     JSONB,
  "status"          TEXT NOT NULL DEFAULT 'pending',
  "startedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt"     TIMESTAMP(3),
  "actionsExecuted" INTEGER NOT NULL DEFAULT 0,
  "actionsFailed"   INTEGER NOT NULL DEFAULT 0,
  "results"         JSONB,
  "error"           TEXT,
  CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- Foreign key
ALTER TABLE "WorkflowExecution"
  ADD CONSTRAINT "WorkflowExecution_workflowId_fkey"
  FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Index
CREATE INDEX IF NOT EXISTS "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

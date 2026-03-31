-- Add pilot program fields to Company
ALTER TABLE "Company"
  ADD COLUMN IF NOT EXISTS "pilotStartedAt" TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS "pilotEndsAt" TIMESTAMPTZ;

-- Optional: index for pilot queries (active/expired)
CREATE INDEX IF NOT EXISTS "Company_pilotEndsAt_idx" ON "Company" ("pilotEndsAt");


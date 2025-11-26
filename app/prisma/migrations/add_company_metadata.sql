-- Add company metadata fields for billing tier, contract dates, SLA, insurance, and model version
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "billingTier" TEXT DEFAULT 'standard';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "contractStart" TIMESTAMP;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "contractEnd" TIMESTAMP;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "slaLevel" TEXT DEFAULT 'standard';
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "insuranceCoverageStatus" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "modelVersion" TEXT;
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "mrr" DECIMAL(10, 2);
ALTER TABLE "Company" ADD COLUMN IF NOT EXISTS "churnRisk" TEXT;


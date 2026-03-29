-- Fix AlertSeverity enum (migration applied directly to DB, added for baseline sync)
-- AlterEnum: INFO,WARNING,CRITICAL,EMERGENCY -> LOW,MEDIUM,HIGH
BEGIN;
CREATE TYPE "AlertSeverity_new" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
ALTER TABLE "Alert" ALTER COLUMN "severity" TYPE "AlertSeverity_new" USING (severity::text::"AlertSeverity_new");
ALTER TABLE "AlertRule" ALTER COLUMN "severity" TYPE "AlertSeverity_new" USING (severity::text::"AlertSeverity_new");
ALTER TYPE "AlertSeverity" RENAME TO "AlertSeverity_old";
ALTER TYPE "AlertSeverity_new" RENAME TO "AlertSeverity";
DROP TYPE "AlertSeverity_old";
COMMIT;

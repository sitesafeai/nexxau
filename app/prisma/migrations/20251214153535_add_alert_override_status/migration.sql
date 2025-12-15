-- AlterTable
ALTER TABLE "Alert" ADD COLUMN     "overrideStatus" TEXT,
ADD COLUMN     "overrideBy" TEXT,
ADD COLUMN     "overrideAt" TIMESTAMP(3),
ADD COLUMN     "overrideReason" TEXT,
ADD COLUMN     "modelVersion" TEXT,
ADD COLUMN     "isTrainingCandidate" BOOLEAN NOT NULL DEFAULT false;

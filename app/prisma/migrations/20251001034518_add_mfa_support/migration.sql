-- DropForeignKey
ALTER TABLE "Account" DROP CONSTRAINT "Account_userId_fkey";

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_ruleId_fkey";

-- DropForeignKey
ALTER TABLE "Alert" DROP CONSTRAINT "Alert_worksiteId_fkey";

-- DropForeignKey
ALTER TABLE "AlertResponse" DROP CONSTRAINT "AlertResponse_alertId_fkey";

-- DropForeignKey
ALTER TABLE "AlertResponse" DROP CONSTRAINT "AlertResponse_userId_fkey";

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_userId_fkey";

-- DropForeignKey
ALTER TABLE "AlertRule" DROP CONSTRAINT "AlertRule_worksiteId_fkey";

-- DropForeignKey
ALTER TABLE "BlogPost" DROP CONSTRAINT "BlogPost_authorId_fkey";

-- DropForeignKey
ALTER TABLE "Camera" DROP CONSTRAINT "Camera_worksiteId_fkey";

-- DropForeignKey
ALTER TABLE "CameraSystemConfig" DROP CONSTRAINT "CameraSystemConfig_worksiteId_fkey";

-- DropForeignKey
ALTER TABLE "Detection" DROP CONSTRAINT "Detection_cameraId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_companyId_fkey";

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_worksiteId_fkey";

-- DropForeignKey
ALTER TABLE "Worker" DROP CONSTRAINT "Worker_worksiteId_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_siteId_fkey";

-- DropForeignKey
ALTER TABLE "Workflow" DROP CONSTRAINT "Workflow_userId_fkey";

-- DropForeignKey
ALTER TABLE "Worksite" DROP CONSTRAINT "Worksite_companyId_fkey";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastActivity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "location" TEXT,
ADD COLUMN     "userAgent" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastLogin" TIMESTAMP(3),
ADD COLUMN     "mfaBackupCodes" JSONB,
ADD COLUMN     "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfaSecret" TEXT;

-- CreateTable
CREATE TABLE "MFACode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "usedAt" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MFACode_pkey" PRIMARY KEY ("id")
);
